

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Story, GenerationParams, PilotChapterResponse, SortKey, ReaderFont, ReaderTheme, Chapter, AppSettings, GenerationPreset, SweFileBundle, AccountSettings, UserTier, Friend, ProfileCardData, SecurityQuestion, ReaderDefaultSettings, Universe } from './types';
import { generatePilotChapter, generateRemainingStory, generateCover, generateIllustration, critiqueChapter, generateStoryMetadata } from './services/geminiService';
import { encryptForFile, decryptFromFile, createProfileCard, verifyProfileCard, generateSigningKeyPair, hashText, createPasskey } from './services/cryptoService';
import { GenerationForm } from './components/GenerationForm';
import { StoryCard } from './components/StoryCard';
import { StoryReader } from './components/StoryReader';
import { Settings } from './components/Settings';
import { InspirationBoard } from './components/InspirationBoard';
import Spinner from './components/Spinner';
import { Icon } from './components/Icon';
import { LoginScreen } from './components/LoginScreen';
import { Onboarding } from './components/Onboarding';
import { UserMenu } from './components/UserMenu';
import { WeaverinsHub } from './components/WeaverinsHub';
import { StoryPreview } from './components/StoryPreview';
import { ProBadge } from './components/ProBadge';
import { UniverseHub } from './components/UniverseHub';
import { ProfilePage } from './components/ProfilePage';

type View = 'login' | 'onboarding' | 'home' | 'reading' | 'form' | 'reviewing_pilot' | 'settings' | 'inspiration_board' | 'fandom' | 'universe_hub' | 'password_recovery' | 'weaverins_hub' | 'story_preview' | 'profile';

const DATA_VERSION = 7; // Added Passkey and creator archetype

const TIER_PRICES: Record<UserTier, Record<string, number>> = {
    free: {},
    essentials: { '12': 100, '24': 180, '72': 450, '168': 900, '720': 3000 },
    pro: { '12': 250, '24': 450, '72': 1100, '168': 2200, '720': 7500 },
    ultra: { '12': 500, '24': 900, '72': 2200, '168': 4500, '720': 15000 }
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    return window.btoa(String.fromCharCode(...new Uint8Array(buffer)));
};

const TierWelcomeScreen: React.FC<{ username: string, tier: UserTier, onClose: () => void }> = ({ username, tier, onClose }) => {
    const tierData = {
        essentials: { title: '¡Bienvenido a Weaver Essentials!', icon: 'star' as const, features: [
            {icon: 'book-open' as const, title: 'Límite de Historias Ampliado', desc: 'Crea más sin preocupaciones.'},
            {icon: 'feather' as const, title: 'Capítulos más Largos', desc: 'Desarrolla tus tramas con más profundidad.'},
            {icon: 'edit' as const, title: 'Edición y Exportación TXT', desc: 'Pule tus historias y llévalas contigo.'},
            {icon: 'lock' as const, title: 'Modo Maduro', desc: 'Activa contenido para adultos con protección PIN.'},
        ]},
        pro: { title: `¡Bienvenido a Weaver PRO, ${username}!`, icon: 'award' as const, features: [
            {icon: 'sparkles' as const, title: 'Historias Ilimitadas', desc: 'Tu creatividad no tiene fin.'},
            {icon: 'image' as const, title: 'Imágenes en Alta Calidad', desc: 'Genera arte espectacular.'},
            {icon: 'globe' as const, title: 'Weaver Universe (Beta)', desc: 'Crea y gestiona tus propios universos conectados.'},
            {icon: 'palette' as const, title: 'Estilos y Temas Exclusivos', desc: 'Personaliza tu experiencia de lectura.'},
            {icon: 'download' as const, title: 'Exportación a PDF', desc: 'Guarda tus historias en formato profesional.'},
        ]},
        ultra: { title: `¡Has ascendido a Weaver Ultra, ${username}!`, icon: 'shield' as const, features: [
             {icon: 'swords' as const, title: 'Contenido Explícito', desc: 'Rompe todas las barreras creativas.'},
             {icon: 'palette' as const, title: 'Personalización Extrema', desc: 'Temas y marcos de avatar únicos.'},
             {icon: 'trending-up' as const, title: 'Generación Prioritaria', desc: 'Tus creaciones se procesan más rápido.'},
        ]},
        free: {title: '', icon: 'book-open' as const, features: []}
    }
    const currentTierData = tierData[tier];

    return (
        <div className="fixed inset-0 bg-neon-noir-bg/90 backdrop-blur-xl flex items-center justify-center z-50 animate-palette-enter">
            <div className="w-full max-w-2xl text-center p-8 m-4 rounded-2xl bg-surface/50 border border-pro-gold/30 shadow-2xl shadow-primary/20">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-pro-gold-bg border-2 border-pro-gold flex items-center justify-center">
                     <Icon name={currentTierData.icon} className="w-12 h-12 text-pro-gold" />
                </div>
                <h1 className="text-4xl font-bold text-pro-gold mb-4">{currentTierData.title}</h1>
                <p className="text-text-secondary text-lg mb-8">Has desbloqueado nuevas y poderosas herramientas:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left mb-10">
                    {currentTierData.features.map(f => (
                         <div key={f.title} className="flex items-start gap-3 p-3 bg-brand-bg rounded-lg"><Icon name={f.icon} className="w-6 h-6 text-primary flex-shrink-0 mt-1" /> <div><h4 className="font-semibold">{f.title}</h4><p className="text-xs text-text-secondary">{f.desc}</p></div></div>
                    ))}
                </div>
                 <button onClick={onClose} className="px-10 py-3 bg-pro-gold text-black font-bold rounded-lg shadow-lg shadow-pro-gold/30 hover:scale-105 transition-transform">
                    Comenzar a Crear
                </button>
            </div>
        </div>
    );
};

const ReviewPilot: React.FC<any> = ({ pilotData, onContinue, onBack, isLoading }) => {
    const [feedback, setFeedback] = useState('');
    return (
        <div className="max-w-4xl mx-auto p-8 text-center">
            <h2 className="text-3xl font-bold text-primary mb-4">Revisa tu Capítulo Piloto</h2>
            <div className="bg-surface p-6 rounded-lg text-left mb-6">
                <h3 className="text-2xl font-bold mb-2">{pilotData.title}</h3>
                <p className="text-text-secondary mb-4 italic">{pilotData.summary}</p>
                <h4 className="text-xl font-semibold mb-2">{pilotData.pilotChapter.title}</h4>
                <p className="whitespace-pre-wrap text-text-main leading-relaxed max-h-96 overflow-y-auto border p-4 rounded-md border-border-color">{pilotData.pilotChapter.content.substring(0, 1000)}...</p>
                 {pilotData.pilotChapter.options && (
                    <div className="mt-4 pt-4 border-t border-border-color">
                        <h5 className="font-semibold text-text-secondary">Opciones generadas:</h5>
                        <ul className="list-disc list-inside text-text-main">
                            {pilotData.pilotChapter.options.map((opt: any, i:number) => <li key={i}>{opt.text}</li>)}
                        </ul>
                    </div>
                 )}
            </div>
            <p className="text-text-secondary mb-4">¿Te gusta cómo empieza? Puedes darnos feedback para ajustar el resto de la historia.</p>
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)} className="w-full bg-brand-bg border border-border-color rounded-md p-2 mb-6" placeholder="Feedback opcional (ej: 'Haz que el antagonista sea más misterioso')"></textarea>
            <div className="flex justify-center gap-4">
                <button onClick={onBack} className="px-6 py-2 rounded-md bg-surface-light hover:bg-border-color transition-colors">Volver y Editar</button>
                <button onClick={() => onContinue(feedback)} disabled={isLoading} className="px-6 py-2 rounded-md bg-primary hover:bg-primary-hover text-white transition-colors disabled:bg-gray-500">
                     {isLoading ? 'Generando...' : 'Continuar y Generar Historia'}
                </button>
            </div>
        </div>
    );
}

const Modal: React.FC<{ title: string, onClose: () => void, children: React.ReactNode, actions?: React.ReactNode }> = ({ title, onClose, children, actions }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-md m-4">
            <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold">{title}</h3>
                 <button onClick={onClose}><Icon name="x-circle" className="w-6 h-6 text-text-secondary hover:text-text-main"/></button>
            </div>
            <div className="text-text-secondary mb-6">{children}</div>
            {actions && <div className="flex justify-end gap-4">{actions}</div>}
        </div>
    </div>
);

const PasswordRecovery: React.FC<{ onBack: () => void, settings: AppSettings, onRecover: (newPass: string) => void }> = ({ onBack, settings, onRecover }) => {
    const [step, setStep] = useState(0); // 0: hint, 1: questions, 2: reset pass
    const [answers, setAnswers] = useState<string[]>(Array(settings.account.securityQuestions?.length || 0).fill(''));
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleAnswerChange = (index: number, value: string) => {
        const newAnswers = [...answers];
        newAnswers[index] = value;
        setAnswers(newAnswers);
    };

    const verifyAnswers = async () => {
        const questionData = settings.account.securityQuestions || [];
        if (answers.length !== questionData.length) return false;

        for(let i=0; i<answers.length; i++) {
            const hashedAnswer = await hashText(answers[i]);
            if (hashedAnswer !== questionData[i].answerHash) {
                alert('Una o más respuestas son incorrectas.');
                return;
            }
        }
        setStep(2);
    };

    if (!settings.account.securityQuestions || settings.account.securityQuestions.length === 0) {
        return <div className="text-center p-8">
            <h2 className="text-2xl font-bold mb-4">Recuperación no configurada</h2>
            <p className="text-text-secondary">No has configurado preguntas de seguridad para esta cuenta.</p>
            <button onClick={onBack} className="mt-4 px-4 py-2 bg-primary text-white rounded-md">Volver</button>
        </div>;
    }

    return <div className="max-w-md mx-auto p-8 bg-surface rounded-lg">
        {step === 0 && (
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">¿Necesitas una pista?</h2>
                {settings.account.passwordHint ? (
                    <>
                        <p className="text-text-secondary">Tu pista es:</p>
                        <p className="my-4 p-3 bg-brand-bg rounded-md text-text-main italic">"{settings.account.passwordHint}"</p>
                    </>
                ) : (
                    <p className="text-text-secondary my-4">No has configurado una pista de contraseña.</p>
                )}
                 <button onClick={() => setStep(1)} className="px-4 py-2 bg-primary text-white rounded-md">Aún no la recuerdo</button>
                 <button onClick={onBack} className="mt-2 text-sm text-text-secondary hover:underline">Volver al inicio</button>
            </div>
        )}
        {step === 1 && (
             <div>
                <h2 className="text-2xl font-bold mb-4 text-center">Preguntas de Seguridad</h2>
                <div className="space-y-4">
                    {settings.account.securityQuestions.map((q, i) => (
                        <div key={i}>
                            <label className="block text-sm font-medium text-text-secondary">{q.question}</label>
                            <input type="text" value={answers[i]} onChange={e => handleAnswerChange(i, e.target.value)} className="w-full mt-1 bg-brand-bg border border-border-color rounded-md py-2 px-3"/>
                        </div>
                    ))}
                </div>
                <button onClick={verifyAnswers} className="w-full mt-6 px-4 py-2 bg-primary text-white rounded-md">Verificar Respuestas</button>
             </div>
        )}
        {step === 2 && (
            <div>
                 <h2 className="text-2xl font-bold mb-4 text-center">Restablecer Contraseña</h2>
                 <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-text-secondary">Nueva Contraseña</label>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full mt-1 bg-brand-bg border border-border-color rounded-md py-2 px-3"/>
                     </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary">Confirmar Nueva Contraseña</label>
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full mt-1 bg-brand-bg border border-border-color rounded-md py-2 px-3"/>
                     </div>
                 </div>
                 <button onClick={() => onRecover(newPassword)} disabled={newPassword.length < 8 || newPassword !== confirmPassword} className="w-full mt-6 px-4 py-2 bg-primary text-white rounded-md disabled:opacity-50">Guardar Nueva Contraseña</button>
            </div>
        )}
    </div>
}

const App: React.FC = () => {
    const [view, setView] = useState<View>('login');
    const [stories, setStories] = useState<Story[]>([]);
    const [universes, setUniverses] = useState<Universe[]>([]);
    const [presets, setPresets] = useState<GenerationPreset[]>([]);
    const [selectedStory, setSelectedStory] = useState<Story | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [notification, setNotification] = useState<string | null>(null);
    const [modalContent, setModalContent] = useState<{title: string, children: React.ReactNode, actions?: React.ReactNode, onClose: () => void} | null>(null);
    const [inspirationPrompt, setInspirationPrompt] = useState<string>('');
    const [pilotData, setPilotData] = useState<{params: GenerationParams, response: PilotChapterResponse} | null>(null);
    const [showTierWelcome, setShowTierWelcome] = useState<UserTier | null>(null);
    const [isGuest, setIsGuest] = useState(false);
    const [isLegacyMode, setIsLegacyMode] = useState(false);
    const sessionPassword = useRef<string | null>(null);

    const initialSettings: AppSettings = {
        general: { appLanguage: 'Español', startupView: 'Biblioteca', timezone: 'America/New_York', uiTheme: 'dark', uiMode: 'standard', showTooltips: 'basic', lastRead: null, notificationSettings: { storyReady: true, achievements: true, social: true, promotions: false }, matureContentFilter: 'on' },
        account: { userId: '', username: 'Lector Anónimo', avatarUrl: '', status: '¡Listo para tejer historias!', tier: 'free', tierExpiresAt: null, autoRenewTier: false, favoriteGenres: [], favoriteFandoms: '', favoriteWritingStyle: 'Cinematográfico', favoriteCharacters: '', weaverins: 500, savingsGoal: 0, stingyMode: false, purchases: [], quests: { firstStoryCompleted: false, tenChaptersRead: false, firstFriendAdded: false, firstPresetSaved: false }, signingKeyPair: { privateKey: {}, publicKey: {} }, achievements: {}, avatarFrame: 'none', passwordHint: '', securityQuestions: [], writerRank: 'C', rankPoints: 0, parentalControls: null, dailyQuests: [] },
        ai: { defaultWritingStyle: 'Cinematográfico', defaultPointOfView: 'Tercera Persona Limitada', aiLanguage: 'Español', creativeFreedom: 75, storyContinuityLevel: 80, branchingComplexity: 50, defaultIllustrationStyle: 'Fantasía Digital', defaultNegativePrompt: 'texto, firmas, marcas de agua', autoGenerateTags: true, imageQuality: 'Standard', plugins: [] },
        readerDefaults: { font: 'serif', fontSize: 18, theme: 'dark', lineHeight: 1.75, justifyText: false, showProgressBar: true, showTimeLeft: true, autoLoadNextChapter: false, tapNavigation: true, enableBionicReading: false, cinemaMode: false, dynamicTypography: true, dynamicBackgrounds: true, showMiniHud: true },
        accessibility: { highContrast: false, dyslexiaFriendlyFont: false, reduceAnimations: false, textToSpeech: true, ttsVoice: 'default', ttsSpeed: 1, ttsPitch: 1, voiceNavigation: false },
        storage: { autoSaveEnabled: false, autoSaveInterval: 60, maxCacheSizeMB: 500, autoClearCache: false, quickAccessVault: null },
        connection: { downloadIllustrationsOnWifiOnly: false, syncOnWifiOnly: true, dataSaverMode: false },
        social: { profileVisibility: 'Privado', showOnlineStatus: true, allowFriendRequests: true, allowStoryComments: 'friends', friendsList: [], blockedUsers: [] },
        privacy: { dataProcessingConsent: true, shareAnalytics: true },
        keybindings: { nextPage: 'ArrowRight', prevPage: 'ArrowLeft', toggleFocusMode: 'f', openSettings: 'ctrl+s', newStory: 'ctrl+n', commandPalette: 'ctrl+k' },
    };

    const [settings, setSettings] = useState<AppSettings>(initialSettings);
    const [searchTerm, setSearchTerm] = useState('');
    const [quickAccessMeta, setQuickAccessMeta] = useState<{username: string, passkeyCredentialId?: string} | null>(null);
    
    useEffect(() => {
        // Check for quick access vault and metadata on load
        try {
            const quickAccessVault = localStorage.getItem('weaver_quick_access_vault');
            const metaStr = localStorage.getItem('weaver_meta');
            if (quickAccessVault) {
                setSettings(prev => ({ ...prev, storage: { ...prev.storage, quickAccessVault } }));
            }
            if (metaStr) {
                setQuickAccessMeta(JSON.parse(metaStr));
            }
        } catch (e) { console.error("Could not access local storage", e); }
    }, []);

    const isKidsMode = useMemo(() => settings.general.uiMode === 'kids', [settings.general.uiMode]);

    const effectiveTier = useMemo((): UserTier => {
        const { tier, tierExpiresAt } = settings.account;
        if (isGuest) return 'free';
        if (isKidsMode) return 'essentials'; // Kids get Essentials features for free
        if (tier === 'free') return 'free';
        if (tierExpiresAt && new Date(tierExpiresAt) > new Date()) return tier;
        return 'free';
    }, [settings.account.tier, settings.account.tierExpiresAt, isGuest, isKidsMode]);
    
    const isProOrHigher = effectiveTier === 'pro' || effectiveTier === 'ultra';
    const isUltra = effectiveTier === 'ultra';

    const handleUpdateSettings = useCallback((updates: Partial<AppSettings>) => {
        const newSettings = { ...settings, ...updates };
        setSettings(newSettings);
        // If account settings changed, update meta
        if(updates.account) {
            const newMeta = {
                username: updates.account.username || settings.account.username,
                passkeyCredentialId: updates.account.passkeyCredentialId !== undefined ? updates.account.passkeyCredentialId : settings.account.passkeyCredentialId,
            }
            setQuickAccessMeta(newMeta);
            localStorage.setItem('weaver_meta', JSON.stringify(newMeta));
        }
    }, [settings]);
    
    const handleUpdateAccountSettings = useCallback((updates: Partial<AppSettings['account']>) => {
        handleUpdateSettings({ account: { ...settings.account, ...updates } });
    }, [settings.account, handleUpdateSettings]);
    
    const handleUpdateUniverses = useCallback((newUniverses: Universe[]) => {
        setUniverses(newUniverses);
    }, []);

    const loadDataBundle = (bundle: SweFileBundle, password: string) => {
        const { settings: loadedSettings, stories: loadedStories, presets: loadedPresets, universes: loadedUniverses } = bundle;
        const mergedSettings = { ...initialSettings, ...loadedSettings, 
            general: { ...initialSettings.general, ...loadedSettings.general }, 
            account: { ...initialSettings.account, ...loadedSettings.account }, 
            ai: { ...initialSettings.ai, ...loadedSettings.ai }, 
            readerDefaults: { ...initialSettings.readerDefaults, ...loadedSettings.readerDefaults }, 
            accessibility: { ...initialSettings.accessibility, ...loadedSettings.accessibility }, 
            storage: { ...initialSettings.storage, ...loadedSettings.storage, quickAccessVault: settings.storage.quickAccessVault }, 
            connection: { ...initialSettings.connection, ...loadedSettings.connection }, 
            social: { ...initialSettings.social, ...loadedSettings.social }, 
            privacy: { ...initialSettings.privacy, ...loadedSettings.privacy }, 
            keybindings: { ...initialSettings.keybindings, ...loadedSettings.keybindings }
        };
        setStories(loadedStories || []);
        setPresets(loadedPresets || []);
        setUniverses(loadedUniverses || []);
        setSettings(mergedSettings);
        sessionPassword.current = password;
        
        const newMeta = {
            username: mergedSettings.account.username,
            passkeyCredentialId: mergedSettings.account.passkeyCredentialId
        }
        setQuickAccessMeta(newMeta);
        localStorage.setItem('weaver_meta', JSON.stringify(newMeta));

        setView('home');
        setIsGuest(false);
    };
    
    const decryptAndLoad = async (vaultBuffer: ArrayBuffer, password: string) => {
        setIsLoading(true);
        setLoadingMessage("Desbloqueando bóveda...");
        setError(null);
        try {
            const bundle = await decryptFromFile(vaultBuffer, password);

            if (!bundle.version || bundle.version < DATA_VERSION) {
                setModalContent({
                    title: "Versión de Archivo Antigua Detectada",
                    children: (
                        <div className="space-y-2 text-sm">
                            <p>Tu archivo <code>.swe</code> es de una versión anterior. Puedes continuar, pero algunas funciones nuevas estarán desactivadas:</p>
                            <ul className="list-disc list-inside space-y-1 pl-2">
                                <li className="text-red-400">Funciones desactivadas: Weaver Universe, Rango de Escritor, Misiones, Weaver Key, etc.</li>
                                <li className="text-green-400">Funciones activas: Lectura y creación básica de historias.</li>
                            </ul>
                            <p className="mt-4 font-bold">Se recomienda encarecidamente crear una nueva cuenta para disfrutar de la experiencia completa.</p>
                        </div>
                    ),
                    actions: <>
                        <button onClick={() => { setModalContent(null); setIsLoading(false); }} className="px-4 py-2 rounded-md bg-surface-light hover:bg-border-color">Cancelar</button>
                        <button onClick={() => {
                            setModalContent(null);
                            setIsLegacyMode(true);
                            loadDataBundle(bundle, password);
                            setNotification("Modo de compatibilidad activado.");
                            setIsLoading(false);
                        }} className="px-4 py-2 rounded-md bg-primary text-white">Continuar (Modo Limitado)</button>
                    </>,
                    onClose: () => { setModalContent(null); setIsLoading(false); }
                });
                return;
            }
            
            setIsLegacyMode(false);
            loadDataBundle(bundle, password);
             // Ask to enable quick access
            if(!settings.storage.quickAccessVault) {
                 setTimeout(() => {
                    setModalContent({
                        title: "Activar Acceso Rápido",
                        children: <p>¿Quieres guardar tu bóveda encriptada en este dispositivo para un inicio de sesión más rápido la próxima vez? Tu contraseña nunca se guarda.</p>,
                        actions: <>
                            <button onClick={() => setModalContent(null)} className="px-4 py-2 rounded-md bg-surface-light hover:bg-border-color">No, gracias</button>
                            <button onClick={() => {
                                const vaultBase64 = arrayBufferToBase64(vaultBuffer);
                                localStorage.setItem('weaver_quick_access_vault', vaultBase64);
                                setSettings(s => ({...s, storage: {...s.storage, quickAccessVault: vaultBase64}}));
                                setNotification("¡Acceso Rápido activado!");
                                setModalContent(null);
                            }} className="px-4 py-2 rounded-md bg-primary text-white">Activar</button>
                        </>,
                        onClose: () => setModalContent(null)
                    });
                }, 500);
            }
            setIsLoading(false);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido al iniciar sesión.');
            setIsLoading(false);
        }
    }

    const handleFileLogin = async (file: File, password: string) => {
        const fileBuffer = await file.arrayBuffer();
        await decryptAndLoad(fileBuffer, password);
    };

    const handleQuickAccessLogin = async (password: string) => {
        if(!settings.storage.quickAccessVault) {
            setError("El Acceso Rápido no está activado en este dispositivo.");
            return;
        }
        const vaultBuffer = base64ToArrayBuffer(settings.storage.quickAccessVault);
        await decryptAndLoad(vaultBuffer, password);
    };
    
    const handleSyncLogin = async (vaultData: string, password: string) => {
        try {
            const vaultBuffer = base64ToArrayBuffer(vaultData);
            await decryptAndLoad(vaultBuffer, password);
        } catch (err) {
            setError("Los datos de la bóveda pegados no son válidos o están corruptos.");
        }
    };
    
    const handleGuestLogin = () => {
        setSettings(initialSettings);
        setStories([]);
        setPresets([]);
        setIsGuest(true);
        setView('home');
    }
    
    const handleSaveBackup = async (isFirstBackup = false, bundleToSave?: SweFileBundle) => {
        const pw = sessionPassword.current;
        if (!pw) {
            alert("Contraseña de sesión no encontrada. No se puede guardar la copia de seguridad.");
            return;
        }
        setIsLoading(true);
        setLoadingMessage("Creando copia de seguridad encriptada...");
        try {
            const bundle: SweFileBundle = bundleToSave || { 
                stories, 
                presets, 
                universes,
                settings, 
                readerSettings: settings.readerDefaults,
                version: DATA_VERSION
            };
            const encryptedBuffer = await encryptForFile(bundle, pw);
            const blob = new Blob([encryptedBuffer], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${bundle.settings.account.username.replace(/ /g, '_')}_weaver_backup.swe`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            if (isFirstBackup) {
                setModalContent({
                   title: "¡Acción Requerida! Tu Primera Copia de Seguridad",
                   children: <p className="text-yellow-300 bg-yellow-900/50 p-3 rounded-md border border-yellow-700">Tu archivo de bóveda <strong>.swe</strong> se ha descargado. Guárdalo en un lugar seguro. <strong className="block mt-2">Lo necesitarás junto a tu contraseña para iniciar sesión en el futuro. ¡No lo pierdas!</strong></p>,
                   onClose: () => setModalContent(null),
                   actions: <button onClick={() => setModalContent(null)} className="px-4 py-2 bg-primary text-white rounded">Entendido</button>
                });
            } else {
                 setNotification("Copia de seguridad guardada con éxito.");
            }
        } catch (err) {
            setError("No se pudo crear la copia de seguridad.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCompleteOnboarding = async (onboardingData: any, password: string) => {
        setIsLoading(true);
        setLoadingMessage('Creando tu bóveda segura...');
        try {
            const signingKeyPair = await generateSigningKeyPair();
            const [privateKeyJwk, publicKeyJwk] = await Promise.all([
                crypto.subtle.exportKey('jwk', signingKeyPair.privateKey),
                crypto.subtle.exportKey('jwk', signingKeyPair.publicKey)
            ]);
            
            const hashedSecurityQuestions: SecurityQuestion[] = await Promise.all(
                onboardingData.securityQuestions.map(async ({question, answer}: any) => ({
                    question,
                    answerHash: await hashText(answer)
                }))
            );
            
            const userId = crypto.randomUUID();
            
            const finalAccountSettings: AccountSettings = {
                ...initialSettings.account,
                ...onboardingData,
                userId,
                securityQuestions: hashedSecurityQuestions,
                signingKeyPair: { privateKey: privateKeyJwk, publicKey: publicKeyJwk }
            };

            const finalSettings: AppSettings = {
                ...initialSettings,
                account: finalAccountSettings,
                readerDefaults: {
                    ...initialSettings.readerDefaults,
                    theme: onboardingData.defaultReaderTheme || 'dark',
                },
                ai: {
                    ...initialSettings.ai,
                    creativeFreedom: onboardingData.aiDefaults.creativeFreedom || 75,
                    defaultComplexity: onboardingData.aiDefaults.defaultComplexity || 'Media',
                }
            }

            if(onboardingData.createPasskey) {
                try {
                    const { credentialId, publicKeyJwk } = await createPasskey(finalAccountSettings.username, userId);
                    finalSettings.account.passkeyCredentialId = credentialId;
                    finalSettings.account.passkeyPublicKey = publicKeyJwk;
                } catch (err) {
                    console.warn("Could not create passkey during onboarding", err);
                    alert("No se pudo crear la Weaver Key. Podrás intentarlo más tarde desde los ajustes.");
                }
            }

            const bundle: SweFileBundle = { stories: [], presets: [], universes: [], settings: finalSettings, readerSettings: finalSettings.readerDefaults, version: DATA_VERSION };
            
            loadDataBundle(bundle, password);
            
            await handleSaveBackup(true, bundle);

        } catch(err) {
            setError('No se pudo crear la cuenta encriptada.');
            setView('onboarding');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        setModalContent({
            title: 'Cerrar Sesión',
            children: <p>¿Estás seguro? Se borrarán todos los datos de esta sesión. Asegúrate de haber guardado una copia de seguridad reciente de tu archivo `.swe`.</p>,
            onClose: () => setModalContent(null),
            actions: (
                <>
                    <button onClick={() => setModalContent(null)} className="px-4 py-2 rounded-md bg-surface-light hover:bg-border-color transition-colors">Cancelar</button>
                    <button onClick={() => {
                        setStories([]); setPresets([]); setSelectedStory(null); setError(null); setUniverses([]);
                        setSettings(initialSettings);
                        sessionPassword.current = null;
                        setIsGuest(false);
                        setIsLegacyMode(false);
                        try {
                           localStorage.removeItem('weaver_quick_access_vault');
                           localStorage.removeItem('weaver_meta');
                           setQuickAccessMeta(null);
                        } catch(e) { console.error("Could not clear local storage", e); }
                        setView('login');
                        setModalContent(null);
                    }} className="px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-white transition-colors">Cerrar Sesión</button>
                </>
            )
        });
    };
    
    const handlePasswordRecovery = async (newPassword: string) => {
        setIsLoading(true); setLoadingMessage("Re-encriptando bóveda...");
        try {
            const bundle: SweFileBundle = {
                stories, presets, universes, settings, 
                readerSettings: settings.readerDefaults, 
                version: DATA_VERSION 
            };
            const encryptedBuffer = await encryptForFile(bundle, newPassword);
            const vaultBase64 = arrayBufferToBase64(encryptedBuffer);
            localStorage.setItem('weaver_quick_access_vault', vaultBase64);
            setSettings(s => ({...s, storage: {...s.storage, quickAccessVault: vaultBase64}}));
            sessionPassword.current = newPassword;
            setNotification("Contraseña restablecida y Acceso Rápido actualizado.");
            setView('home');
        } catch(e) {
            setError("No se pudo re-encriptar la bóveda.");
        } finally {
            setIsLoading(false);
        }
    }
    
    useEffect(() => { if (notification) { const timer = setTimeout(() => setNotification(null), 5000); return () => clearTimeout(timer); } }, [notification]);

    // --- Generation Logic ---
    const handleGeneratePilot = async (params: GenerationParams) => {
        setIsLoading(true);
        setError(null);
        const storyLimit = effectiveTier === 'free' ? 5 : effectiveTier === 'essentials' ? 20 : Infinity;
        if (stories.length >= storyLimit) {
            setError(`Límite de historias (${storyLimit}) alcanzado para tu plan.`);
            setIsLoading(false);
            return;
        }
        try {
            setLoadingMessage('Generando capítulo piloto...');
            if (isKidsMode) {
                params.weaverAgeRating = 'Kids';
            }
            const pilotResponse = await generatePilotChapter(params);
            setPilotData({ params, response: pilotResponse });
            setView('reviewing_pilot');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleContinueGeneration = async (feedback: string) => {
        if (!pilotData) return;
        setIsLoading(true);
        setError(null);
        if (Notification.permission !== "granted") { Notification.requestPermission(); }
        const { params, response: pilotResponse } = pilotData;
        const imageQuality = isProOrHigher ? settings.ai.imageQuality : 'Standard';
        try {
            setLoadingMessage('Generando capítulos restantes...');
            const remainingStoryData = await generateRemainingStory(params, pilotResponse, [pilotResponse.pilotChapter as Chapter], feedback);
            setLoadingMessage('Diseñando una portada épica...');
            const coverUrl = await generateCover(pilotResponse.title, pilotResponse.summary, params.genres, imageQuality);
            setLoadingMessage('Analizando la historia...');
            const metadata = await generateStoryMetadata(pilotResponse.title, pilotResponse.summary, params.genres, params.weaverAgeRating || 'Teen');

            const pilotChapter: Chapter = { id: pilotResponse.pilotChapter.id, title: pilotResponse.pilotChapter.title, content: pilotResponse.pilotChapter.content, illustrationPrompt: pilotResponse.pilotChapter.illustration_prompt, options: pilotResponse.pilotChapter.options, microSummary: pilotResponse.pilotChapter.microSummary };
            const allChapters: Chapter[] = [pilotChapter, ...remainingStoryData.chapters.map((c) => ({ id: c.id, title: c.title, content: c.content, illustrationPrompt: c.illustration_prompt, options: c.options, microSummary: c.microSummary }))];
            
            if (params.generateIllustrations) {
                const defaultStyle = settings.ai.defaultIllustrationStyle;
                for (let i = 0; i < allChapters.length; i++) {
                    if (allChapters[i].illustrationPrompt) {
                        setLoadingMessage(`Ilustrando capítulo ${i + 1} de ${allChapters.length}...`);
                        allChapters[i].illustrationUrl = await generateIllustration(allChapters[i].illustrationPrompt!, defaultStyle, imageQuality, params.customIllustrationStyle);
                    }
                }
            }

            const wordCount = allChapters.reduce((acc, chap) => acc + chap.content.split(' ').length, 0);
            const readingTimeMinutes = Math.ceil(wordCount / 200);
            
            const newStory: Story = { id: crypto.randomUUID(), title: pilotResponse.title, summary: pilotResponse.summary, tags: pilotResponse.tags || [], chapters: allChapters, chapterHistory: [pilotChapter.id], coverUrl, readingTimeMinutes, params, isBranching: params.enableBranching, ...metadata, weaverAgeRating: params.weaverAgeRating, isCuratedForKids: isKidsMode };
            
            setStories(prevStories => [newStory, ...prevStories]);
            setSelectedStory(newStory);
            setView('story_preview');
            setPilotData(null);
            setNotification("¡Tu nueva historia ha sido creada!");
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado.');
            setView('reviewing_pilot');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteStory = (e: React.MouseEvent, storyId: string) => { /* ... unchanged ... */ };
    const handleUpdateStory = (updatedStory: Story) => {
        setStories(prevStories => prevStories.map(s => s.id === updatedStory.id ? updatedStory : s));
        setSelectedStory(updatedStory);
    };
    const handleSelectStory = (story: Story) => {
        setSelectedStory(story);
        setView('story_preview');
    };

    const handlePurchaseTier = (tier: UserTier, durationHours: number, cost: number) => {
        if (settings.account.weaverins < cost) {
            setError("No tienes suficientes Weaverins para comprar este plan.");
            return;
        }

        const newExpiryDate = new Date();
        newExpiryDate.setHours(newExpiryDate.getHours() + durationHours);

        handleUpdateAccountSettings({
                weaverins: settings.account.weaverins - cost,
                tier: tier,
                tierExpiresAt: newExpiryDate.toISOString(),
                purchases: [...settings.account.purchases, { tier, cost, purchaseDate: new Date().toISOString() }]
        });
        setShowTierWelcome(tier);
    };

    const handleRefund = () => {
        const lastPurchase = settings.account.purchases[settings.account.purchases.length - 1];
        if (!lastPurchase) {
            setError("No se encontró ninguna compra para reembolsar.");
            return;
        }

        const purchaseDate = new Date(lastPurchase.purchaseDate);
        const now = new Date();
        const hoursSincePurchase = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60);

        if (hoursSincePurchase > 24) {
            setError("El período de reembolso (24 horas) ha expirado.");
            return;
        }
        
        const refundAmount = Math.floor(lastPurchase.cost * 0.75); // 75% refund
        handleUpdateAccountSettings({
                weaverins: settings.account.weaverins + refundAmount,
                tier: 'free',
                tierExpiresAt: null,
        });
        setNotification(`Reembolso procesado. Has recibido ${refundAmount} Weaverins.`);
    };

    const handleUpdateLastRead = (storyId: string, chapterId: string, scrollPosition: number) => {
        handleUpdateSettings({ 
            general: {
                ...settings.general,
                lastRead: { storyId, chapterId, scrollPosition }
            }
        });
    };

    const handleCritiqueChapter = async (chapterId: string) => {
        if (!selectedStory) return;
        setIsLoading(true);
        setLoadingMessage("Doctor IA está analizando el capítulo...");
        try {
            const chapterToCritique = selectedStory.chapters.find(c => c.id === chapterId);
            if (!chapterToCritique) throw new Error("Capítulo no encontrado para analizar.");
            
            const critique = await critiqueChapter(chapterToCritique.content); 
    
            const updatedChapters = selectedStory.chapters.map(c => 
                c.id === chapterId ? { ...c, critique } : c
            );
            const updatedStory = { ...selectedStory, chapters: updatedChapters };
            
            handleUpdateStory(updatedStory);
            setNotification("Análisis de Doctor IA completado.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al obtener el análisis de la IA.");
        } finally {
            setIsLoading(false);
        }
    };

    const filteredAndSortedStories = useMemo(() => {
        const baseStories = isKidsMode ? stories.filter(s => s.isCuratedForKids) : stories;
        if (!searchTerm) {
            return baseStories;
        }
        return baseStories.filter(story => {
            const term = searchTerm.toLowerCase();
            const inTitle = story.title.toLowerCase().includes(term);
            const inSummary = story.summary.toLowerCase().includes(term);
            const inFandom = story.params.storyType === 'Fanfiction' && story.params.fandom.toLowerCase().includes(term);
            const inTags = (story.tags || []).some(tag => tag.toLowerCase().includes(term));
            const inGenres = story.params.genres.some(genre => genre.toLowerCase().includes(term));
            return inTitle || inSummary || inFandom || inTags || inGenres;
        });
    }, [stories, searchTerm, isKidsMode]);
    
    // --- Fandom Screen Component ---
    const FandomScreen = () => {
        // This is a placeholder for the full Fandoms feature set
        return (
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl text-center">
                 <Icon name="users" className="w-16 h-16 mx-auto text-primary mb-4" />
                <h1 className="text-3xl font-bold">Comunidades de Fandom</h1>
                <p className="text-text-secondary mt-2">Esta función está en desarrollo.</p>
                <p className="mt-4">Aquí encontrarás foros, encuestas, teorías y fanarts para tus historias favoritas. ¡Incluso podrás participar en eventos y misiones diarias!</p>
                <button onClick={() => setView('home')} className="mt-6 px-4 py-2 bg-primary text-white rounded-md">Volver a la Biblioteca</button>
            </div>
        );
    }
    
    const renderHeader = () => (
        <header className="bg-surface/80 backdrop-blur-sm sticky top-0 z-30 shadow-md">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center cursor-pointer" onClick={() => { setView('home'); setSelectedStory(null); }}>
                        <Icon name="book-open" className="h-8 w-8 text-primary"/>
                        <span className="text-xl font-bold ml-2 text-text-main hidden sm:inline">Weaver {isKidsMode ? 'Kids' : ''}</span>
                    </div>
                    {isGuest ? (
                         <button onClick={() => { setView('onboarding') }} className="px-4 py-2 bg-primary text-white rounded-md font-semibold">Crear Cuenta Permanente</button>
                    ) : (
                        <div className="flex items-center gap-2 sm:gap-4">
                            <button onClick={() => { setView('inspiration_board'); setError(null); }} className="flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-bg focus:ring-primary transition-colors">
                                <Icon name="plus" className="w-5 h-5 sm:mr-2" />
                                <span className="hidden sm:block">Crear</span>
                            </button>
                            {!isKidsMode &&
                                <>
                                    <button onClick={() => setView('universe_hub')} disabled={isLegacyMode} className="p-2 rounded-full hover:bg-surface-light disabled:opacity-30 disabled:cursor-not-allowed" aria-label="Weaver Universe"><Icon name="globe" className="w-5 h-5 text-text-secondary"/></button>
                                    <button onClick={() => setView('weaverins_hub')} disabled={isLegacyMode} className="p-2 rounded-full hover:bg-surface-light text-pro-gold flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed" aria-label="Weaverins Hub">
                                        <Icon name="award" className="w-5 h-5"/>
                                        <span className="font-bold text-sm">{settings.account.weaverins}</span>
                                    </button>
                                    <button onClick={() => setView('fandom')} className="p-2 rounded-full hover:bg-surface-light" aria-label="Fandoms"> <Icon name="users" className="w-5 h-5 text-text-secondary"/> </button>
                                </>
                            }
                            <UserMenu settings={settings} effectiveTier={effectiveTier} onProfileClick={() => setView('profile')} onSettingsClick={() => setView('settings')} onSaveBackup={() => handleSaveBackup(false)} onLogout={handleLogout} />
                        </div>
                    )}
                </div>
            </div>
        </header>
    );

    const renderHome = () => (
        <div className={`container mx-auto px-4 sm:px-6 lg:px-8 py-8`}>
             <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold flex items-center"><Icon name="library" className="mr-3" /> {isGuest ? 'Biblioteca de Invitado' : isKidsMode ? 'Biblioteca Infantil' : 'Mi Biblioteca'}</h1>
                <div className="flex items-center gap-4 w-full md:w-auto">
                     <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full md:w-64 bg-surface border border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                </div>
            </div>
            {isGuest && (
                 <div className="p-4 mb-6 bg-yellow-900/50 border border-yellow-700 rounded-lg text-yellow-300 text-center">
                    Estás en modo invitado. Tu progreso se perderá al cerrar la pestaña. <button onClick={() => setView('onboarding')} className="font-bold underline hover:text-white">Crea una cuenta</button> para guardar tu trabajo.
                 </div>
            )}
             {isLegacyMode && !isKidsMode && (
                 <div className="p-4 mb-6 bg-blue-900/50 border border-blue-700 rounded-lg text-blue-300 text-center">
                    <Icon name="info" className="w-5 h-5 inline-block mr-2" />
                    Estás en <strong>Modo de Compatibilidad</strong>. Algunas funciones nuevas están desactivadas.
                 </div>
            )}
            {filteredAndSortedStories.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredAndSortedStories.map(story => ( <StoryCard key={story.id} story={story} onSelect={() => handleSelectStory(story)} onDelete={(e) => {}} onEdit={(e) => {}} reduceAnimations={settings.accessibility.reduceAnimations} /> ))}
                </div>
            ) : ( <div className="text-center py-16"> <Icon name="book-open" className="w-16 h-16 mx-auto text-text-secondary" /> <h2 className="mt-4 text-xl font-semibold">Tu biblioteca está vacía</h2> <p className="mt-2 text-text-secondary">Usa el botón 'Crear' para empezar tu primera historia.</p> </div> )}
        </div>
    );
    
    const renderContent = () => {
        switch (view) {
            case 'login': return <LoginScreen onStartOnboarding={() => setView('onboarding')} onFileLogin={handleFileLogin} onQuickAccessLogin={handleQuickAccessLogin} onGuestLogin={handleGuestLogin} onSyncLogin={handleSyncLogin} onPasswordRecovery={() => setView('password_recovery')} hasQuickAccess={!!settings.storage.quickAccessVault} quickAccessMeta={quickAccessMeta} />;
            case 'password_recovery': return <PasswordRecovery onBack={() => setView('login')} settings={settings} onRecover={handlePasswordRecovery}/>;
            case 'onboarding': return <Onboarding onComplete={handleCompleteOnboarding} />;
            case 'reading': return selectedStory && <StoryReader story={selectedStory} onBack={() => setView('story_preview')} onUpdateStory={handleUpdateStory} readerDefaults={settings.readerDefaults} onReaderDefaultsChange={(newDefaults: ReaderDefaultSettings) => handleUpdateSettings({ readerDefaults: newDefaults })} effectiveTier={effectiveTier} onUpdateLastRead={handleUpdateLastRead} onCritiqueChapter={handleCritiqueChapter} isKidsMode={isKidsMode} />;
            case 'form': return <GenerationForm onGenerate={handleGeneratePilot} isLoading={isLoading} presets={presets} onSavePreset={(p) => setPresets(pr => [...pr, p])} onLoadPreset={(p) => {}} initialInspiration={inspirationPrompt} effectiveTier={effectiveTier} universes={universes} isLegacyMode={isLegacyMode} isKidsMode={isKidsMode} />;
            case 'reviewing_pilot': return pilotData && <ReviewPilot pilotData={pilotData.response} onContinue={handleContinueGeneration} onBack={() => { setView('form'); setPilotData(null); }} isLoading={isLoading} />;
            case 'settings': return <Settings settings={settings} onUpdateSettings={handleUpdateSettings} onUpdateAccountSettings={handleUpdateAccountSettings} onBack={() => setView(settings.general.uiMode === 'kids' ? 'home' : 'profile')} effectiveTier={effectiveTier} onPurchaseTier={handlePurchaseTier} tierPrices={TIER_PRICES} onRefundLastPurchase={handleRefund} />;
            case 'fandom': return <FandomScreen />;
            case 'universe_hub': return <UniverseHub universes={universes} onUpdateUniverses={handleUpdateUniverses} effectiveTier={effectiveTier} onBack={() => setView('home')} />;
            case 'weaverins_hub': return <WeaverinsHub settings={settings} onUpdateAccountSettings={handleUpdateAccountSettings} onBack={() => setView('home')} />;
            case 'story_preview': return selectedStory && <StoryPreview story={selectedStory} onBack={() => setView('home')} onStartReading={() => setView('reading')} />;
            case 'inspiration_board': return <InspirationBoard settings={settings} onContinue={(prompt) => { setInspirationPrompt(prompt); setView('form'); }} effectiveTier={effectiveTier} />;
            case 'profile': return <ProfilePage settings={settings} stories={stories} onUpdateAccountSettings={handleUpdateAccountSettings} onBack={() => setView('home')} onNavigateToSettings={() => setView('settings')} />;
            case 'home': default: return renderHome();
        }
    };
    
    const showHeader = !['login', 'onboarding', 'reading', 'settings', 'fandom', 'universe_hub', 'password_recovery', 'weaverins_hub', 'story_preview', 'profile'].includes(view);
    const mainBgClass = isUltra && view === 'home' && !settings.accessibility.reduceAnimations ? 'pro-library-bg animate-gradient-slow' : 'bg-brand-bg';
    const uiModeClass = settings.general.uiMode === 'kids' ? 'theme-kids' : '';

    return (
        <>
            {isLoading && <Spinner message={loadingMessage} disableAnimations={settings.accessibility.reduceAnimations} />}
            {modalContent && <Modal title={modalContent.title} onClose={modalContent.onClose} actions={modalContent.actions}>{modalContent.children}</Modal>}
            {notification && ( <div className="bg-green-600 text-white p-3 fixed top-4 right-4 rounded-lg shadow-lg z-50 flex items-center gap-3 animate-palette-enter"> <Icon name="check" className="w-5 h-5" /> <span>{notification}</span> <button onClick={() => setNotification(null)} className="ml-2 opacity-70 hover:opacity-100"><Icon name="x-circle" className="w-4 h-4" /></button> </div> )}
            {showTierWelcome && <TierWelcomeScreen username={settings.account.username} tier={showTierWelcome} onClose={() => setShowTierWelcome(null)} />}
            {error && ( <div className="bg-red-500 text-white p-4 fixed top-4 left-1/2 -translate-x-1/2 max-w-md w-full rounded-lg z-50 flex justify-between items-center shadow-2xl"> <span>{error}</span> <button onClick={() => setError(null)}><Icon name="x-circle" className="w-6 h-6" /></button> </div> )}
            <div className={`flex flex-col min-h-screen text-text-main font-sans ${mainBgClass} ${uiModeClass}`}>
                {showHeader && renderHeader()}
                <main className="flex-grow"> {renderContent()} </main>
            </div>
        </>
    );
};

export default App;