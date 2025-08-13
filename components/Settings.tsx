
import React, { useState, useEffect, useRef } from 'react';
import type { AppSettings, WritingStyle, AILanguage, Language, StartupView, UserTier, Genre, PointOfView, ImageQuality, AvatarFrame, AccountSettings, Story, WeaverAgeRating, ActivityLogEntry, Complexity } from '../types';
import { Icon, type IconProps } from './Icon';
import { ProBadge } from './ProBadge';
import { createPasskey } from '../services/cryptoService';


interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (updatedSettings: Partial<AppSettings>) => void;
  onUpdateAccountSettings: (updatedSettings: Partial<AppSettings['account']>) => void;
  onBack: () => void;
  effectiveTier: UserTier;
  onPurchaseTier: (tier: UserTier, durationHours: number, cost: number) => void;
  tierPrices: Record<UserTier, Record<string, number>>;
  onRefundLastPurchase: () => void;
  onGetSyncData: () => Promise<string>;
}

type Category = 'plans' | 'creation_prefs' | 'parental' | 'security' | 'general' | 'ai' | 'reader' | 'accessibility' | 'privacy' | 'keybindings' | 'storage' | 'connection' | 'about';

const categories: { id: Category; name: string; icon: IconProps['name'] }[] = [
  { id: 'plans', name: 'Planes y Suscripción', icon: 'award' },
  { id: 'creation_prefs', name: 'Preferencias de Creación', icon: 'feather' },
  { id: 'parental', name: 'Control Parental', icon: 'shield-lock' },
  { id: 'general', name: 'General', icon: 'settings' },
  { id: 'ai', name: 'Generación IA', icon: 'brain-circuit' },
  { id: 'reader', name: 'Lector', icon: 'book-text' },
  { id: 'accessibility', name: 'Accesibilidad', icon: 'accessibility' },
  { id: 'security', name: 'Seguridad', icon: 'lock' },
  { id: 'privacy', name: 'Privacidad', icon: 'shield' },
  { id: 'keybindings', name: 'Atajos de Teclado', icon: 'keyboard' },
  { id: 'storage', name: 'Almacenamiento', icon: 'database' },
  { id: 'connection', name: 'Conexión', icon: 'wifi' },
  { id: 'about', name: 'Acerca de', icon: 'info' },
];

const SettingRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-4 border-b border-border-color last:border-b-0">{children}</div>
);

const SettingLabel: React.FC<{ title: string; description: string; }> = ({ title, description }) => (
    <div className="w-full sm:w-2/5 pr-4">
        <h4 className="font-semibold text-text-main">{title}</h4>
        <p className="text-sm text-text-secondary">{description}</p>
    </div>
);

const SettingControl: React.FC<{ children: React.ReactNode; isLocked?: boolean; tierRequired?: UserTier; }> = ({ children, isLocked, tierRequired }) => (
    <div className="w-full sm:w-3/5 flex justify-start sm:justify-end items-center gap-4">
        {children}
        {isLocked && <ProBadge tierName={tierRequired?.toUpperCase()} isLocked />}
    </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; }> = ({ checked, onChange, disabled }) => (
    <button type="button" role="switch" aria-checked={checked} onClick={() => !disabled && onChange(!checked)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${checked ? 'bg-primary' : 'bg-brand-bg border border-border-color'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={disabled}>
        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
);

const genresList: Genre[] = ['Ciencia Ficción', 'Fantasía', 'Romance', 'Terror', 'Misterio', 'Aventura', 'Drama', 'Comedia', 'Thriller', 'Histórico', 'Cyberpunk'];
const writingStyles: WritingStyle[] = ['Cinematográfico', 'Literario', 'Humorístico', 'Oscuro y Valiente', 'Poético'];
const povs: PointOfView[] = ['Primera Persona (Protagonista)', 'Tercera Persona Limitada', 'Tercera Persona Omnisciente'];
const imageQualities: ImageQuality[] = ['Standard', 'Alta'];
const timezones: string[] = ['UTC', 'America/New_York', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo'];
const languages: Language[] = ['Español', 'English', 'Français', 'Deutsch'];
const aiLanguages: AILanguage[] = ['Español', 'English'];
const startupViews: StartupView[] = ['Biblioteca', 'Última Historia Leída', 'Crear Nueva Historia'];

const SyncModal: React.FC<{ onClose: () => void; onGetSyncData: () => Promise<string>; }> = ({ onClose, onGetSyncData }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [syncData, setSyncData] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    const handleGenerateData = async () => {
        setIsLoading(true);
        setSyncData('');
        try {
            const data = await onGetSyncData();
            setSyncData(data);
        } catch (error) {
            console.error(error);
            alert((error as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(syncData).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-lg animate-palette-enter">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-primary flex items-center gap-2"><Icon name="wifi" /> Sincronización de Bóveda</h3>
                    <button onClick={onClose}><Icon name="x-circle" className="w-6 h-6 text-text-secondary hover:text-text-main"/></button>
                </div>
                {!syncData ? (
                    <div className="text-center py-8">
                        <p className="text-text-secondary mb-4">Genera un código de texto para transferir toda tu bóveda a otro dispositivo.</p>
                        <button onClick={handleGenerateData} disabled={isLoading} className="px-5 py-2.5 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover disabled:opacity-50 flex items-center gap-2 mx-auto">
                            {isLoading ? <><Icon name="loader" className="animate-spin" /> Generando...</> : 'Generar Datos para Sincronizar'}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-text-secondary">Copia este bloque de texto y pégalo en la pestaña "Sincronizar" en la pantalla de inicio de Weaver en tu otro dispositivo.</p>
                        <textarea value={syncData} readOnly className="w-full h-40 bg-brand-bg border border-border-color rounded-md p-2 text-xs font-mono select-all" />
                        <button onClick={handleCopyToClipboard} className="w-full px-5 py-2.5 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover flex items-center justify-center gap-2">
                            <Icon name={isCopied ? "check" : "copy"} />
                            {isCopied ? '¡Copiado!' : 'Copiar al Portapapeles'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};


export const Settings: React.FC<SettingsProps> = ({ settings, onUpdateSettings, onUpdateAccountSettings, onBack, effectiveTier, onPurchaseTier, tierPrices, onRefundLastPurchase, onGetSyncData }) => {
    const isKidsMode = settings.general.uiMode === 'kids';
    const [activeCategory, setActiveCategory] = useState<Category>(isKidsMode ? 'parental' : 'plans');
    const [editingKey, setEditingKey] = useState<keyof AppSettings['keybindings'] | null>(null);
    const [aboutSubView, setAboutSubView] = useState<'main' | 'tos' | 'privacy' | 'changelog'>('main');
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

    const isEssentialsOrHigher = effectiveTier !== 'free';
    const isProOrHigher = effectiveTier === 'pro' || effectiveTier === 'ultra';
    const isUltra = effectiveTier === 'ultra';
    
    const hasPasskey = !!settings.account.passkeyCredentialId;

    useEffect(() => {
        if (!isEssentialsOrHigher && settings.social.profileVisibility !== 'Privado') {
            handleUpdate('social', 'profileVisibility', 'Privado');
        }
    }, [effectiveTier, settings.social.profileVisibility]);

    const handleUpdate = <T extends keyof AppSettings, K extends keyof AppSettings[T]>(category: T, key: K, value: AppSettings[T][K]) => {
        onUpdateSettings({ [category]: { ...settings[category], [key]: value } });
    };

    const handleGenreToggle = (genre: Genre) => {
        const newGenres = settings.account.favoriteGenres.includes(genre)
          ? settings.account.favoriteGenres.filter(g => g !== genre)
          : [...settings.account.favoriteGenres, genre];
        onUpdateAccountSettings({ favoriteGenres: newGenres });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!editingKey) return;
        e.preventDefault();
        const key = e.key.toLowerCase() === ' ' ? 'space' : e.key.toLowerCase();
        const keyString = (e.ctrlKey ? 'ctrl+' : '') + (e.shiftKey ? 'shift+' : '') + (e.altKey ? 'alt+' : '') + key;
        handleUpdate('keybindings', editingKey, keyString);
        setEditingKey(null);
    }
    
    const handleCreatePasskey = async () => {
        try {
            const { credentialId, publicKeyJwk } = await createPasskey(settings.account.username, settings.account.userId);
            onUpdateAccountSettings({
                passkeyCredentialId: credentialId,
                passkeyPublicKey: publicKeyJwk
            });
            alert("¡Weaver Key creada con éxito!");
        } catch (error) {
            console.error("Error creating passkey:", error);
            alert("No se pudo crear la Weaver Key. Es posible que tu navegador no sea compatible o que cancelaras la operación.");
        }
    };
    
    const handleRemovePasskey = () => {
        if (window.confirm("¿Estás seguro de que quieres eliminar tu Weaver Key? Tendrás que usar otro método para iniciar sesión.")) {
            onUpdateAccountSettings({
                passkeyCredentialId: undefined,
                passkeyPublicKey: undefined
            });
        }
    };
    
    const handleKidsModeToggle = (wantsToEnable: boolean) => {
        if (wantsToEnable) {
            handleUpdate('general', 'uiMode', 'kids');
            setActiveCategory('parental'); // Switch to parental controls
        } else {
            // Turning it off
            if (settings.account.parentalControls?.pin) {
                const pin = prompt("Introduce el PIN parental para salir del Modo Niños:");
                if (pin === settings.account.parentalControls.pin) {
                    handleUpdate('general', 'uiMode', 'standard');
                } else {
                    alert("PIN incorrecto.");
                }
            } else {
                // No PIN set, just turn it off
                handleUpdate('general', 'uiMode', 'standard');
            }
        }
    }

    const renderContent = () => {
        switch (activeCategory) {
            case 'plans': 
                const plans: {id: UserTier, name: string, tagline: string, features: string[], popular?: boolean}[] = [
                    { id: 'free', name: 'Weaver Free', tagline: 'Ideal para empezar a explorar.', features: ['Hasta 5 historias', 'Capítulos de longitud corta y media', 'Generación de imágenes estándar', '1 uso del Tablón de Inspiración'] },
                    { id: 'essentials', name: 'Weaver Essentials', tagline: 'Para empezar a crear sin límites.', features: ['Hasta 20 historias', 'Capítulos largos', 'Guardar preajustes', 'Editar y exportar historias en TXT', 'Personalización básica del lector y TTS'] },
                    { id: 'pro', name: 'Weaver PRO', tagline: 'La experiencia ideal para creadores.', features: ['Historias ilimitadas', 'Imágenes en alta calidad', 'Exportación a PDF', 'Estilos de ilustración personalizados', 'Temas de lector exclusivos', 'Ajuste de creatividad IA', 'Atajos de teclado'], popular: true },
                    { id: 'ultra', name: 'Weaver Ultra', tagline: 'Para el autor que lo quiere todo.', features: ['Todo lo de PRO', 'Contenido explícito sin censura', 'Decoración de avatar', 'Temas de UI exclusivos', 'Generación prioritaria', 'Acceso a World Anvil (Lore Book)'] },
                ];
                const durations = [
                    {hours: 12, label: '12 horas'}, {hours: 24, label: '1 día'}, {hours: 72, label: '3 días'},
                    {hours: 168, label: '1 semana'}, {hours: 720, label: '1 mes'},
                ];

                const TierCard: React.FC<{plan: typeof plans[0]}> = ({plan}) => {
                    const [selectedDuration, setSelectedDuration] = useState(durations[0].hours);
                    const cost = tierPrices[plan.id]?.[selectedDuration] ?? 0;
                    const canAfford = settings.account.weaverins >= cost;
                    const isCurrentPlan = effectiveTier === plan.id;
                    const lastPurchase = settings.account.purchases[settings.account.purchases.length -1];
                    const canRefund = isCurrentPlan && lastPurchase && (new Date().getTime() - new Date(lastPurchase.purchaseDate).getTime()) < 24 * 60 * 60 * 1000;


                    if (plan.id === 'free') {
                       return (
                            <div className={`flex flex-col bg-surface-light rounded-lg border-2 p-6 ${isCurrentPlan ? 'border-primary' : 'border-border-color'}`}>
                                {isCurrentPlan && <div className="text-xs font-bold text-primary bg-primary/20 px-3 py-1 rounded-full self-start mb-2">PLAN ACTUAL</div>}
                                <h3 className="text-2xl font-bold text-text-main">{plan.name}</h3>
                                <p className="text-text-secondary mb-4 h-10">{plan.tagline}</p>
                                <ul className="space-y-2 mb-6 flex-grow">
                                    {plan.features.map(f => <li key={f} className="flex items-center gap-2 text-sm"><Icon name="check" className="w-4 h-4 text-green-400"/> {f}</li>)}
                                </ul>
                                <button disabled={true} className="w-full mt-auto py-2 px-4 rounded-md font-semibold text-white bg-surface-light cursor-default">
                                    Gratis
                                </button>
                            </div>
                        );
                    }

                    return (
                        <div className={`flex flex-col bg-surface-light rounded-lg border-2 p-6 ${isCurrentPlan ? 'border-primary' : plan.popular ? 'border-pro-gold' : 'border-border-color'}`}>
                            {isCurrentPlan && <div className="text-xs font-bold text-primary bg-primary/20 px-3 py-1 rounded-full self-start mb-2">PLAN ACTUAL</div>}
                            {plan.popular && !isCurrentPlan && <div className="text-xs font-bold text-pro-gold bg-pro-gold-bg px-3 py-1 rounded-full self-start mb-2 flex items-center gap-1"><Icon name="trending-up" className="w-4 h-4"/> MÁS POPULAR</div>}
                            <h3 className="text-2xl font-bold text-text-main">{plan.name}</h3>
                            <p className="text-text-secondary mb-4 h-10">{plan.tagline}</p>
                            <ul className="space-y-2 mb-6 flex-grow">
                                {plan.features.map(f => <li key={f} className="flex items-center gap-2 text-sm"><Icon name="check" className="w-4 h-4 text-green-400"/> {f}</li>)}
                            </ul>
                            {!isCurrentPlan ? (
                                <>
                                    <div className="mb-4">
                                        <p className="text-sm font-medium text-text-secondary mb-2">Duración:</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {durations.map(d => (
                                                <button key={d.hours} type="button" onClick={() => setSelectedDuration(d.hours)} className={`px-2 py-1 text-xs rounded-md border ${selectedDuration === d.hours ? 'bg-primary border-primary text-white' : 'bg-surface border-border-color hover:bg-surface'}`}>{d.label}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => onPurchaseTier(plan.id, selectedDuration, cost)}
                                        disabled={!canAfford}
                                        className="w-full mt-auto py-2 px-4 rounded-md font-semibold text-white bg-primary hover:bg-primary-hover disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Activar por {cost} Weaverins
                                    </button>
                                </>
                            ) : (
                                <div className="mt-auto">
                                    {canRefund ? (
                                         <button onClick={onRefundLastPurchase} className="w-full py-2 px-4 rounded-md font-semibold text-yellow-300 bg-yellow-600/20 hover:bg-yellow-600/40 transition-colors">Solicitar Reembolso</button>
                                    ) : (
                                        <p className="text-center text-xs text-text-secondary">El reembolso solo está disponible en las primeras 24h.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                }

                return (
                <div className="p-6">
                    <div className="text-center mb-8 p-4 bg-brand-bg rounded-lg">
                        <p className="text-text-secondary">Tu saldo actual</p>
                        <div className="flex items-center justify-center gap-2 text-4xl font-bold">
                            <Icon name="award" className="w-8 h-8 text-pro-gold"/>
                            <span className="text-white">{settings.account.weaverins}</span>
                            <span className="text-pro-gold">Weaverins</span>
                        </div>
                        {effectiveTier !== 'free' && settings.account.tierExpiresAt && (
                             <p className="text-sm text-text-secondary mt-2">
                                Tu plan <span className="font-bold capitalize">{effectiveTier}</span> expira el {new Date(settings.account.tierExpiresAt).toLocaleString()}
                            </p>
                        )}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                        {plans.map(p => <TierCard key={p.id} plan={p} />)}
                    </div>
                     <div className="mt-8 pt-6 border-t border-border-color">
                         <SettingRow>
                             <SettingLabel title="Renovación Automática" description="Si está activado, tu plan actual se renovará por 1 mes si tienes suficientes Weaverins."/>
                             <SettingControl isLocked={effectiveTier === 'free'} tierRequired="essentials">
                                 <Toggle checked={settings.account.autoRenewTier} onChange={v => onUpdateAccountSettings({autoRenewTier: v})} disabled={effectiveTier === 'free'}/>
                             </SettingControl>
                         </SettingRow>
                     </div>
                </div>
            );
            case 'creation_prefs': return (
                 <div className="p-4">
                     <SettingRow>
                        <SettingLabel title="Géneros Favoritos" description="Tus géneros preferidos, para futuras recomendaciones."/>
                        <SettingControl>
                            <div className="flex flex-wrap gap-2 justify-end">
                                {genresList.map(genre => (
                                    <button type="button" key={genre} onClick={() => handleGenreToggle(genre)} className={`px-3 py-1 text-xs font-medium rounded-full border ${settings.account.favoriteGenres.includes(genre) ? 'bg-primary border-primary text-white' : 'bg-surface border-border-color hover:border-primary'}`}>{genre}</button>
                                ))}
                            </div>
                        </SettingControl>
                    </SettingRow>
                    <SettingRow>
                        <SettingLabel title="Fandoms Favoritos" description="Tus universos de ficción preferidos."/>
                        <SettingControl><input type="text" value={settings.account.favoriteFandoms} onChange={e => onUpdateAccountSettings({ favoriteFandoms: e.target.value })} placeholder="Star Wars, Harry Potter..." className="w-full sm:w-60 bg-brand-bg border border-border-color rounded-md py-1.5 px-2 text-sm"/></SettingControl>
                    </SettingRow>
                     <SettingRow>
                        <SettingLabel title="Personajes Favoritos" description="Los personajes que más te inspiran."/>
                        <SettingControl><input type="text" value={settings.account.favoriteCharacters} onChange={e => onUpdateAccountSettings({ favoriteCharacters: e.target.value })} placeholder="Luke Skywalker, Hermione..." className="w-full sm:w-60 bg-brand-bg border border-border-color rounded-md py-1.5 px-2 text-sm"/></SettingControl>
                    </SettingRow>
                 </div>
            );
            case 'parental': return (
                <div className="p-4">
                    <h3 className="text-lg font-bold text-primary mb-2">Panel de Control Parental</h3>
                    <p className="text-sm text-text-secondary mb-4">Gestiona la experiencia de tu hijo en Weaver Kids.</p>
                     <SettingRow>
                        <SettingLabel title="PIN de Control Parental" description="Un PIN de 4-8 dígitos para bloquear ajustes y salir del Modo Niños."/>
                        <SettingControl>
                            <input 
                                type="password" 
                                value={settings.account.parentalControls?.pin || ''} 
                                onChange={e => {
                                    const newPin = e.target.value.replace(/\D/g, ''); // only digits
                                    if (newPin.length <= 8) {
                                        onUpdateAccountSettings({ parentalControls: { ...(settings.account.parentalControls || { pin: '', contentFilters: [], timeLimits: {}, activityLog: [] }), pin: newPin } })
                                    }
                                }}
                                placeholder="4-8 dígitos"
                                className="w-full sm:w-60 bg-brand-bg border border-border-color rounded-md py-1.5 px-2 text-sm"
                            />
                        </SettingControl>
                    </SettingRow>
                    <SettingRow>
                        <SettingLabel title="Filtros de Contenido" description="Selecciona las clasificaciones de edad permitidas."/>
                        <SettingControl>
                             <div className="flex flex-wrap gap-2">
                                {(['Kids', 'Teen'] as WeaverAgeRating[]).map(rating => (
                                    <button 
                                        type="button" 
                                        key={rating} 
                                        // onClick={() => handleFilterToggle(rating)}
                                        className={`px-3 py-1 text-xs font-medium rounded-full border ${settings.account.parentalControls?.contentFilters.includes(rating) ? 'bg-primary border-primary text-white' : 'bg-surface border-border-color'}`}
                                    >
                                        {rating}
                                    </button>
                                ))}
                            </div>
                        </SettingControl>
                    </SettingRow>
                    <div className="mt-6">
                        <h4 className="font-semibold text-text-main">Resumen de Actividad de Lectura</h4>
                        {(settings.account.parentalControls?.activityLog && settings.account.parentalControls.activityLog.length > 0) ? (
                            <ul className="space-y-2 mt-2 max-h-60 overflow-y-auto bg-brand-bg p-2 rounded-md">
                                {settings.account.parentalControls.activityLog.slice().reverse().map((log: ActivityLogEntry, i: number) => (
                                    <li key={i} className="p-3 bg-surface rounded-md flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-text-main">{log.storyTitle}</p>
                                            <p className="text-xs text-text-secondary">Leído el {new Date(log.date).toLocaleDateString()}</p>
                                        </div>
                                        <p className="font-bold text-primary">{log.chaptersRead} caps.</p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-text-secondary mt-2 p-4 bg-surface-light rounded-md border border-dashed border-border-color text-center">
                                Aún no hay actividad de lectura registrada.
                            </p>
                        )}
                    </div>
                </div>
            );
            case 'security': return (
                <div className="p-4">
                     <SettingRow>
                        <SettingLabel title="Weaver Key (Passkey)" description="Usa la biometría de tu dispositivo para un inicio de sesión más rápido y seguro." />
                        <SettingControl isLocked={!isEssentialsOrHigher} tierRequired="essentials">
                            {hasPasskey ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-green-400 flex items-center gap-2"><Icon name="check" /> Activa</span>
                                    <button onClick={handleRemovePasskey} className="px-3 py-1.5 text-sm bg-red-600/20 text-red-400 border border-red-500/30 rounded-md hover:bg-red-500 hover:text-white transition-colors">Eliminar</button>
                                </div>
                            ) : (
                                <button onClick={handleCreatePasskey} className="flex items-center text-sm px-3 py-1.5 bg-surface border border-border-color rounded-md hover:bg-primary-hover hover:text-white transition-colors" disabled={!isEssentialsOrHigher}>
                                    <Icon name="key" className="w-4 h-4 mr-1.5"/> Crear Weaver Key
                                </button>
                            )}
                        </SettingControl>
                    </SettingRow>
                    <SettingRow>
                        <SettingLabel title="Acceso Rápido" description="Guarda tu bóveda encriptada en este dispositivo para un inicio de sesión más rápido (solo pide contraseña)." />
                        <SettingControl>
                            <Toggle 
                                checked={!!settings.storage.quickAccessVault} 
                                onChange={v => {
                                    if(v) {
                                        alert("El acceso rápido se activa después de un inicio de sesión exitoso con un archivo .swe.");
                                    } else {
                                        onUpdateSettings({ storage: { ...settings.storage, quickAccessVault: null } });
                                    }
                                }}
                            />
                        </SettingControl>
                    </SettingRow>
                     <SettingRow>
                        <SettingLabel title="Cambiar Contraseña" description="Actualiza tu contraseña maestra. Necesitarás la actual." />
                        <SettingControl>
                            <button type="button" className="flex items-center text-sm px-3 py-1.5 bg-surface border border-border-color rounded-md hover:bg-primary-hover hover:text-white transition-colors"> <Icon name="key" className="w-4 h-4 mr-1.5"/> Cambiar</button>
                        </SettingControl>
                    </SettingRow>
                     <SettingRow>
                        <SettingLabel title="Pista de Contraseña" description="Modifica la pista que te ayuda a recordar tu contraseña." />
                        <SettingControl>
                           <input type="text" value={settings.account.passwordHint} onChange={e => onUpdateAccountSettings({ passwordHint: e.target.value })} className="w-full sm:w-60 bg-brand-bg border border-border-color rounded-md py-1.5 px-2 text-sm"/>
                        </SettingControl>
                    </SettingRow>
                    <SettingRow>
                        <SettingLabel title="Preguntas de Seguridad" description="Actualiza tus preguntas y respuestas para la recuperación de la cuenta." />
                         <SettingControl>
                            <button type="button" className="flex items-center text-sm px-3 py-1.5 bg-surface border border-border-color rounded-md hover:bg-primary-hover hover:text-white transition-colors"> <Icon name="edit" className="w-4 h-4 mr-1.5"/> Editar</button>
                        </SettingControl>
                    </SettingRow>
                    <SettingRow>
                        <SettingLabel title="PIN para Contenido Maduro" description="Establece un PIN de 4 dígitos para acceder a contenido explícito. Requerido para el Modo Maduro." />
                        <SettingControl isLocked={!isEssentialsOrHigher} tierRequired="essentials">
                           <input type="password" value={settings.account.matureContentPIN || ''} onChange={e => onUpdateAccountSettings({ matureContentPIN: e.target.value })} maxLength={4} className="w-24 text-center bg-brand-bg border border-border-color rounded-md py-1.5 px-2 text-sm" disabled={!isEssentialsOrHigher} />
                        </SettingControl>
                    </SettingRow>
                </div>
            );
            case 'general': return (
                <div className="p-4">
                    <SettingRow>
                        <SettingLabel title="Modo Weaver Kids" description="Activa una interfaz simplificada y segura, ideal para niños."/>
                        <SettingControl>
                            <Toggle checked={isKidsMode} onChange={handleKidsModeToggle}/>
                        </SettingControl>
                    </SettingRow>
                    <SettingRow>
                        <SettingLabel title="Idioma de la App" description="Elige el idioma de la interfaz."/>
                        <SettingControl>
                            <select value={settings.general.appLanguage} onChange={e => handleUpdate('general', 'appLanguage', e.target.value as Language)} className="w-full sm:w-60 bg-brand-bg border border-border-color rounded-md py-1.5 px-2 text-sm">
                                {languages.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </SettingControl>
                    </SettingRow>
                    <SettingRow>
                        <SettingLabel title="Vista de Inicio" description="Qué pantalla ver al abrir la aplicación."/>
                        <SettingControl>
                             <select value={settings.general.startupView} onChange={e => handleUpdate('general', 'startupView', e.target.value as StartupView)} className="w-full sm:w-60 bg-brand-bg border border-border-color rounded-md py-1.5 px-2 text-sm">
                                {startupViews.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </SettingControl>
                    </SettingRow>
                    <SettingRow>
                        <SettingLabel title="Zona Horaria" description="Para mostrar correctamente las fechas y horas."/>
                        <SettingControl>
                            <select value={settings.general.timezone} onChange={e => handleUpdate('general', 'timezone', e.target.value)} className="w-full sm:w-60 bg-brand-bg border border-border-color rounded-md py-1.5 px-2 text-sm">
                                {timezones.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </SettingControl>
                    </SettingRow>
                    <div className="pt-4 mt-4 border-t border-border-color">
                         <h3 className="text-lg font-semibold mb-2 text-text-main">Notificaciones</h3>
                         <SettingRow>
                             <SettingLabel title="Historia Lista" description="Recibir una notificación cuando una historia larga termine de generarse."/>
                             <SettingControl><Toggle checked={settings.general.notificationSettings.storyReady} onChange={v => handleUpdate('general', 'notificationSettings', {...settings.general.notificationSettings, storyReady: v})}/></SettingControl>
                         </SettingRow>
                         <SettingRow>
                             <SettingLabel title="Logros y Recompensas" description="Ser notificado al desbloquear logros o ganar Weaverins."/>
                             <SettingControl><Toggle checked={settings.general.notificationSettings.achievements} onChange={v => handleUpdate('general', 'notificationSettings', {...settings.general.notificationSettings, achievements: v})}/></SettingControl>
                         </SettingRow>
                         <SettingRow>
                             <SettingLabel title="Actividad Social" description="Notificaciones sobre amigos, comentarios y menciones."/>
                             <SettingControl><Toggle checked={settings.general.notificationSettings.social} onChange={v => handleUpdate('general', 'notificationSettings', {...settings.general.notificationSettings, social: v})}/></SettingControl>
                         </SettingRow>
                         <SettingRow>
                             <SettingLabel title="Noticias y Promociones" description="Recibir noticias sobre la app y ofertas especiales."/>
                             <SettingControl><Toggle checked={settings.general.notificationSettings.promotions} onChange={v => handleUpdate('general', 'notificationSettings', {...settings.general.notificationSettings, promotions: v})}/></SettingControl>
                         </SettingRow>
                    </div>
                </div>
            );
            case 'ai': return (
                <div className="p-4">
                    <SettingRow>
                        <SettingLabel title="Idioma de la IA" description="El idioma en que la IA generará las historias." />
                        <SettingControl>
                           <select value={settings.ai.aiLanguage} onChange={e => handleUpdate('ai', 'aiLanguage', e.target.value as AILanguage)} className="w-full sm:w-60 bg-brand-bg border border-border-color rounded-md py-1.5 px-2 text-sm">
                                {aiLanguages.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </SettingControl>
                    </SettingRow>
                    <SettingRow>
                        <SettingLabel title="Estilo de Escritura por Defecto" description="El estilo que se seleccionará al crear una nueva historia." />
                        <SettingControl isLocked={!isEssentialsOrHigher} tierRequired="essentials">
                            <select value={settings.ai.defaultWritingStyle} onChange={e => handleUpdate('ai', 'defaultWritingStyle', e.target.value as WritingStyle)} className="w-full sm:w-60 bg-brand-bg border border-border-color rounded-md py-1.5 px-2 text-sm" disabled={!isEssentialsOrHigher}>
                                {writingStyles.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </SettingControl>
                    </SettingRow>
                    <SettingRow>
                        <SettingLabel title="Punto de Vista por Defecto" description="El punto de vista predeterminado para nuevas historias." />
                         <SettingControl isLocked={!isEssentialsOrHigher} tierRequired="essentials">
                            <select value={settings.ai.defaultPointOfView} onChange={e => handleUpdate('ai', 'defaultPointOfView', e.target.value as PointOfView)} className="w-full sm:w-60 bg-brand-bg border border-border-color rounded-md py-1.5 px-2 text-sm" disabled={!isEssentialsOrHigher}>
                                {povs.map(p => <option key={p}>{p}</option>)}
                            </select>
                        </SettingControl>
                    </SettingRow>
                     <SettingRow>
                        <SettingLabel title="Calidad de Imagen" description="Mayor calidad consume más recursos." />
                        <SettingControl isLocked={!isProOrHigher} tierRequired="pro">
                            <div className="flex rounded-md shadow-sm">
                                {imageQualities.map(q => (
                                    <button type="button" key={q} onClick={() => handleUpdate('ai', 'imageQuality', q)} className={`px-4 py-2 text-sm font-medium border ${settings.ai.imageQuality === q ? 'bg-primary border-primary text-white' : 'bg-brand-bg border-border-color hover:bg-surface-light'} first:rounded-l-md last:rounded-r-md disabled:opacity-50 disabled:cursor-not-allowed`} disabled={!isProOrHigher}>{q}</button>
                                ))}
                            </div>
                        </SettingControl>
                    </SettingRow>
                    <SettingRow>
                        <SettingLabel title="Estilo de Ilustración por Defecto" description="Un estilo artístico base para todas las imágenes generadas." />
                        <SettingControl isLocked={!isEssentialsOrHigher} tierRequired="essentials">
                            <input type="text" value={settings.ai.defaultIllustrationStyle} onChange={e => handleUpdate('ai', 'defaultIllustrationStyle', e.target.value)} className="w-full sm:w-60 bg-brand-bg border border-border-color rounded-md py-1.5 px-2 text-sm" disabled={!isEssentialsOrHigher} />
                        </SettingControl>
                    </SettingRow>
                    <SettingRow>
                        <SettingLabel title="Prompt Negativo por Defecto" description="Elementos a evitar en las ilustraciones (ej: texto, firmas)." />
                         <SettingControl isLocked={!isEssentialsOrHigher} tierRequired="essentials">
                            <input type="text" value={settings.ai.defaultNegativePrompt} onChange={e => handleUpdate('ai', 'defaultNegativePrompt', e.target.value)} className="w-full sm:w-60 bg-brand-bg border border-border-color rounded-md py-1.5 px-2 text-sm" disabled={!isEssentialsOrHigher} />
                        </SettingControl>
                    </SettingRow>
                     <SettingRow>
                        <SettingLabel title="Libertad Creativa" description="Controla qué tan 'imaginativa' es la IA." />
                        <SettingControl isLocked={!isProOrHigher} tierRequired="pro">
                            <div className="w-full sm:w-60 flex items-center gap-3">
                                <input type="range" min="0" max="100" value={settings.ai.creativeFreedom} onChange={e => handleUpdate('ai', 'creativeFreedom', parseInt(e.target.value))} className="w-full h-2 bg-border-color rounded-lg appearance-none cursor-pointer accent-primary" disabled={!isProOrHigher}/>
                                <span className="text-sm font-mono">{settings.ai.creativeFreedom}</span>
                            </div>
                        </SettingControl>
                    </SettingRow>
                     <SettingRow>
                        <SettingLabel title="Complejidad de Ramificación" description="Controla la profundidad y cantidad de ramas en historias interactivas." />
                        <SettingControl isLocked={!isProOrHigher} tierRequired="pro">
                            <div className="w-full sm:w-60 flex items-center gap-3">
                                <input type="range" min="0" max="100" value={settings.ai.branchingComplexity} onChange={e => handleUpdate('ai', 'branchingComplexity', parseInt(e.target.value))} className="w-full h-2 bg-border-color rounded-lg appearance-none cursor-pointer accent-primary" disabled={!isProOrHigher} />
                                <span className="text-sm font-mono">{settings.ai.branchingComplexity}</span>
                            </div>
                        </SettingControl>
                    </SettingRow>
                    <SettingRow>
                        <SettingLabel title="Nivel de Continuidad" description="Qué tan estrictamente la IA debe seguir la trama y los capítulos anteriores." />
                        <SettingControl isLocked={!isProOrHigher} tierRequired="pro">
                            <div className="w-full sm:w-60 flex items-center gap-3">
                                <input type="range" min="0" max="100" value={settings.ai.storyContinuityLevel} onChange={e => handleUpdate('ai', 'storyContinuityLevel', parseInt(e.target.value))} className="w-full h-2 bg-border-color rounded-lg appearance-none cursor-pointer accent-primary" disabled={!isProOrHigher} />
                                <span className="text-sm font-mono">{settings.ai.storyContinuityLevel}</span>
                            </div>
                        </SettingControl>
                    </SettingRow>
                    <SettingRow>
                        <SettingLabel title="Generar Etiquetas Automáticamente" description="Permite que la IA sugiera etiquetas para tus nuevas historias." />
                        <SettingControl><Toggle checked={settings.ai.autoGenerateTags} onChange={v => handleUpdate('ai', 'autoGenerateTags', v)}/></SettingControl>
                    </SettingRow>
                </div>
            );
            case 'reader': return (
                <div className="p-4">
                     <SettingRow>
                        <SettingLabel title="Altura de Línea" description="Ajusta el espaciado vertical entre líneas de texto." />
                        <SettingControl isLocked={!isEssentialsOrHigher} tierRequired="essentials">
                            <div className="w-full sm:w-60 flex items-center gap-3">
                                <input type="range" min="1.25" max="2.5" step="0.25" value={settings.readerDefaults.lineHeight} onChange={e => handleUpdate('readerDefaults', 'lineHeight', parseFloat(e.target.value))} className="w-full h-2 bg-border-color rounded-lg appearance-none cursor-pointer accent-primary" disabled={!isEssentialsOrHigher} />
                                <span className="text-sm font-mono">{settings.readerDefaults.lineHeight.toFixed(2)}</span>
                            </div>
                        </SettingControl>
                    </SettingRow>
                     <SettingRow>
                        <SettingLabel title="Justificar Texto" description="Alinear el texto a ambos márgenes para un aspecto de libro."/>
                        <SettingControl isLocked={!isEssentialsOrHigher} tierRequired="essentials">
                            <Toggle checked={settings.readerDefaults.justifyText} onChange={v => handleUpdate('readerDefaults', 'justifyText', v)} disabled={!isEssentialsOrHigher}/>
                        </SettingControl>
                    </SettingRow>
                    <SettingRow>
                        <SettingLabel title="Mostrar Barra de Progreso" description="Muestra una barra en la parte inferior con tu progreso en el capítulo." />
                        <SettingControl><Toggle checked={settings.readerDefaults.showProgressBar} onChange={v => handleUpdate('readerDefaults', 'showProgressBar', v)}/></SettingControl>
                    </SettingRow>
                    <SettingRow>
                        <SettingLabel title="Mostrar Tiempo Restante" description="Muestra una estimación del tiempo que queda para terminar el capítulo." />
                        <SettingControl><Toggle checked={settings.readerDefaults.showTimeLeft} onChange={v => handleUpdate('readerDefaults', 'showTimeLeft', v)}/></SettingControl>
                    </SettingRow>
                     <SettingRow>
                        <SettingLabel title="Cargar Siguiente Capítulo Automáticamente" description="Al terminar un capítulo, carga el siguiente sin interrupciones." />
                        <SettingControl isLocked={!isEssentialsOrHigher} tierRequired="essentials">
                            <Toggle checked={settings.readerDefaults.autoLoadNextChapter} onChange={v => handleUpdate('readerDefaults', 'autoLoadNextChapter', v)} disabled={!isEssentialsOrHigher}/>
                        </SettingControl>
                    </SettingRow>
                    <SettingRow>
                        <SettingLabel title="Navegación por Toque" description="Toca los lados de la pantalla para pasar de página." />
                        <SettingControl><Toggle checked={settings.readerDefaults.tapNavigation} onChange={v => handleUpdate('readerDefaults', 'tapNavigation', v)}/></SettingControl>
                    </SettingRow>
                </div>
            );
            case 'accessibility': return (
                 <div className="p-4">
                    <SettingRow>
                        <SettingLabel title="Reducir Animaciones" description="Desactiva o reduce las animaciones de la interfaz para una experiencia más simple." />
                        <SettingControl><Toggle checked={settings.accessibility.reduceAnimations} onChange={v => handleUpdate('accessibility', 'reduceAnimations', v)}/></SettingControl>
                    </SettingRow>
                    <SettingRow>
                        <SettingLabel title="Texto a Voz (TTS)" description="Activa la capacidad de leer historias en voz alta." />
                        <SettingControl><Toggle checked={settings.accessibility.textToSpeech} onChange={v => handleUpdate('accessibility', 'textToSpeech', v)}/></SettingControl>
                    </SettingRow>
                    <SettingRow>
                        <SettingLabel title="Velocidad de TTS" description="Ajusta la velocidad de la lectura en voz alta." />
                        <SettingControl isLocked={!isEssentialsOrHigher} tierRequired="essentials">
                             <div className="w-full sm:w-60 flex items-center gap-3">
                                <input type="range" min="0.5" max="2" step="0.1" value={settings.accessibility.ttsSpeed} onChange={e => handleUpdate('accessibility', 'ttsSpeed', parseFloat(e.target.value))} className="w-full h-2 bg-border-color rounded-lg appearance-none cursor-pointer accent-primary" disabled={!isEssentialsOrHigher}/>
                                <span className="text-sm font-mono">{settings.accessibility.ttsSpeed.toFixed(1)}x</span>
                            </div>
                        </SettingControl>
                    </SettingRow>
                      <SettingRow>
                        <SettingLabel title="Tono de TTS" description="Ajusta el tono de la voz de lectura." />
                        <SettingControl isLocked={!isEssentialsOrHigher} tierRequired="essentials">
                             <div className="w-full sm:w-60 flex items-center gap-3">
                                <input type="range" min="0.5" max="2" step="0.1" value={settings.accessibility.ttsPitch} onChange={e => handleUpdate('accessibility', 'ttsPitch', parseFloat(e.target.value))} className="w-full h-2 bg-border-color rounded-lg appearance-none cursor-pointer accent-primary" disabled={!isEssentialsOrHigher}/>
                                <span className="text-sm font-mono">{settings.accessibility.ttsPitch.toFixed(1)}x</span>
                            </div>
                        </SettingControl>
                    </SettingRow>
                </div>
            );
            case 'privacy':
                return (
                    <div className="p-4">
                        <SettingRow>
                            <SettingLabel title="Consentimiento de Datos" description="Permitir que Weaver procese tus datos para proporcionar el servicio." />
                            <SettingControl><Toggle checked={settings.privacy.dataProcessingConsent} onChange={v => handleUpdate('privacy', 'dataProcessingConsent', v)} /></SettingControl>
                        </SettingRow>
                        <SettingRow>
                            <SettingLabel title="Compartir Analíticas" description="Ayuda a mejorar Weaver compartiendo datos de uso anónimos." />
                            <SettingControl><Toggle checked={settings.privacy.shareAnalytics} onChange={v => handleUpdate('privacy', 'shareAnalytics', v)} /></SettingControl>
                        </SettingRow>
                    </div>
                );
            case 'keybindings':
                return (
                    <div className="p-4">
                        {Object.keys(settings.keybindings).map(key => (
                            <SettingRow key={key}>
                                <SettingLabel title={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} description={`Atajo para ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`} />
                                <SettingControl>
                                    <input
                                        type="text"
                                        value={settings.keybindings[key as keyof AppSettings['keybindings']]}
                                        onKeyDown={handleKeyDown}
                                        onFocus={() => setEditingKey(key as keyof AppSettings['keybindings'])}
                                        onBlur={() => setEditingKey(null)}
                                        readOnly
                                        className="w-40 text-center bg-brand-bg border border-border-color rounded-md py-1.5 px-2 text-sm"
                                        placeholder="Presiona una tecla..."
                                    />
                                </SettingControl>
                            </SettingRow>
                        ))}
                    </div>
                );
            case 'storage':
                return (
                    <div className="p-4">
                        <SettingRow>
                            <SettingLabel title="Sincronizar Bóveda" description="Genera un código de texto para mover tu bóveda a otro dispositivo." />
                            <SettingControl>
                                <button onClick={() => setIsSyncModalOpen(true)} className="flex items-center text-sm px-3 py-1.5 bg-surface border border-border-color rounded-md hover:bg-primary-hover hover:text-white transition-colors">
                                    <Icon name="wifi" className="w-4 h-4 mr-1.5" /> Abrir Sincronización
                                </button>
                            </SettingControl>
                        </SettingRow>
                    </div>
                );
            case 'connection':
                 return (
                    <div className="p-4">
                        <SettingRow>
                            <SettingLabel title="Descargar Ilustraciones Solo con Wi-Fi" description="Ahorra datos móviles." />
                            <SettingControl><Toggle checked={settings.connection.downloadIllustrationsOnWifiOnly} onChange={v => handleUpdate('connection', 'downloadIllustrationsOnWifiOnly', v)}/></SettingControl>
                        </SettingRow>
                        <SettingRow>
                            <SettingLabel title="Modo Ahorro de Datos" description="Reduce la calidad de las imágenes y otras descargas automáticas." />
                            <SettingControl><Toggle checked={settings.connection.dataSaverMode} onChange={v => handleUpdate('connection', 'dataSaverMode', v)}/></SettingControl>
                        </SettingRow>
                    </div>
                 );
            case 'about':
                return (
                    <div className="p-4">
                        <h3 className="text-lg font-bold">Acerca de Weaver</h3>
                        <p className="text-text-secondary mt-2">Versión de la App: 1.2.0</p>
                    </div>
                );
            default: return null;
        }
    };
    
    return (
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
                <button onClick={onBack} className="flex items-center text-sm text-primary hover:text-primary-hover">
                    <Icon name="arrow-left" className="w-4 h-4 mr-2"/>
                    Volver
                </button>
                <h1 className="text-3xl font-bold text-text-main">Ajustes</h1>
                <div className="w-16"></div> {/* Spacer */}
            </div>
            {isSyncModalOpen && <SyncModal onClose={() => setIsSyncModalOpen(false)} onGetSyncData={onGetSyncData} />}
            <div className="flex flex-col md:flex-row gap-8">
                <aside className="md:w-1/4 lg:w-1/5 shrink-0">
                    <nav className="space-y-1 sticky top-24">
                        {categories
                            .filter(c => !(isKidsMode && !['parental', 'general', 'about', 'accessibility', 'reader'].includes(c.id)))
                            .filter(c => !(isKidsMode && c.id === 'plans')) // Hide plans in kids mode
                            .map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-left ${activeCategory === cat.id ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:bg-surface hover:text-text-main'}`}
                            >
                                <Icon name={cat.icon} className="w-5 h-5 mr-3 shrink-0"/>
                                <span>{cat.name}</span>
                            </button>
                        ))}
                    </nav>
                </aside>
                <main className="flex-1 bg-surface rounded-lg p-2 sm:p-6 shadow-lg min-h-[60vh]">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};
