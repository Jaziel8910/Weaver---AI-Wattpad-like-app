

import React, { useState, useRef } from 'react';
import type { AccountSettings, Genre, WritingStyle, ReaderTheme, CreatorArchetype, AIGenerationSettings, Complexity } from '../types';
import { createPasskey } from '../services/cryptoService';
import { Icon } from './Icon';

interface OnboardingData extends Partial<Omit<AccountSettings, 'signingKeyPair' | 'userId' | 'securityQuestions'>> {
    createPasskey?: boolean;
    defaultReaderTheme?: ReaderTheme;
    aiDefaults?: Partial<Pick<AIGenerationSettings, 'creativeFreedom' | 'defaultComplexity'>>
}

interface OnboardingProps {
    onComplete: (data: OnboardingData & { securityQuestions: { question: string, answer: string }[] }, password: string) => void;
}

const genresList: Genre[] = ['Ciencia Ficción', 'Fantasía', 'Romance', 'Terror', 'Misterio', 'Aventura', 'Drama', 'Comedia', 'Thriller', 'Histórico', 'Cyberpunk'];
const creatorArchetypes: {id: CreatorArchetype, name: string, desc: string, icon: any}[] = [
    {id: 'World-Builder', name: 'Constructor de Mundos', desc: 'Te encanta crear lugares épicos y lore profundo.', icon: 'globe'},
    {id: 'Character-Artist', name: 'Artista de Personajes', desc: 'Tus personajes son complejos, memorables y el corazón de la historia.', icon: 'users'},
    {id: 'Plot-Weaver', name: 'Tejedor de Tramas', desc: 'Disfrutas creando giros, misterios y narrativas intrincadas.', icon: 'feather'},
    {id: 'Explorer', name: 'Explorador', desc: 'Prefieres experimentar con ideas y ver a dónde te lleva la historia.', icon: 'dice-5'},
];

const standardSecurityQuestions = [
    "¿Cuál era el nombre de tu primera mascota?",
    "¿En qué ciudad naciste?",
    "¿Cuál es el apellido de soltera de tu madre?",
    "¿Cuál fue tu primer trabajo?",
    "¿Cuál es el nombre de tu amigo de la infancia?"
];

const ProgressBar: React.FC<{ currentStep: number; totalSteps: number }> = ({ currentStep, totalSteps }) => (
    <div className="w-full bg-surface rounded-full h-2.5 mb-8">
        <div className="bg-primary h-2.5 rounded-full" style={{ width: `${(currentStep / totalSteps) * 100}%`, transition: 'width 0.5s ease-in-out' }}></div>
    </div>
);

const PasswordStrengthMeter: React.FC<{password: string}> = ({password}) => {
    const getStrength = () => {
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        return score;
    }
    const strength = getStrength();
    const width = (strength / 5) * 100;
    const color = strength < 2 ? 'bg-red-500' : strength < 4 ? 'bg-yellow-500' : 'bg-green-500';

    return (
        <div className="w-full bg-surface h-2 rounded-full mt-1">
            <div className={`h-2 rounded-full transition-all ${color}`} style={{width: `${width}%`}}></div>
        </div>
    )
}

const StepWrapper: React.FC<{title: string; desc: string; children: React.ReactNode}> = ({title, desc, children}) => (
    <div className="text-center animate-palette-enter">
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-text-secondary mb-6 max-w-xl mx-auto">{desc}</p>
        {children}
    </div>
);

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [step, setStep] = useState(1);
    const [data, setData] = useState<OnboardingData>({
        username: '',
        avatarUrl: '',
        favoriteGenres: [],
        favoriteWritingStyle: 'Cinematográfico',
        passwordHint: '',
        creatorArchetype: 'Explorer',
        defaultReaderTheme: 'dark',
        aiDefaults: { creativeFreedom: 75, defaultComplexity: 'Media' },
        createPasskey: true,
    });
    const [securityQuestions, setSecurityQuestions] = useState([
        { question: standardSecurityQuestions[0], answer: '' },
        { question: standardSecurityQuestions[1], answer: '' },
    ]);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const totalSteps = 9;

    const handleUpdate = <K extends keyof typeof data>(key: K, value: (typeof data)[K]) => {
        setData(prev => ({ ...prev, [key]: value }));
    };
    
    const handleGenreToggle = (genre: Genre) => {
        const newGenres = data.favoriteGenres?.includes(genre)
          ? data.favoriteGenres.filter(g => g !== genre)
          : [...(data.favoriteGenres || []), genre];
        handleUpdate('favoriteGenres', newGenres as Genre[]);
    };

    const handleSecurityQuestionChange = (index: number, field: 'question' | 'answer', value: string) => {
        const newQuestions = [...securityQuestions];
        newQuestions[index] = {...newQuestions[index], [field]: value};
        setSecurityQuestions(newQuestions);
    };

    const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const isPasswordValid = password.length >= 8 && password === confirmPassword;
    const areSecurityQuestionsValid = securityQuestions.every(q => q.question && q.answer);

    const handleFinalize = async () => {
        if (!isPasswordValid || !areSecurityQuestionsValid) return;
        const finalData = { ...data, securityQuestions };
        onComplete(finalData, password);
    }
    
    const renderStep = () => {
        switch (step) {
            case 1: return (
                <StepWrapper title="Bienvenido a Weaver, futuro narrador" desc="Vamos a preparar tu espacio creativo. Este rápido proceso nos ayudará a adaptar la experiencia perfectamente para ti.">
                    <Icon name="wand" className="w-24 h-24 text-primary mx-auto my-10 animate-pulse"/>
                </StepWrapper>
            );
            case 2: // Profile
                return (
                    <StepWrapper title="Crea tu Perfil de Autor" desc="Dinos cómo te llamas y personaliza tu avatar. Esto definirá tu identidad en Weaver.">
                        <div className="mb-6 max-w-sm mx-auto">
                            <label htmlFor="username" className="block text-sm font-medium text-text-secondary mb-1">Nombre de Usuario</label>
                            <input
                                type="text"
                                id="username"
                                value={data.username}
                                onChange={e => handleUpdate('username', e.target.value)}
                                className="w-full bg-brand-bg border border-border-color rounded-md py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                                placeholder="Ej: ViajeroDeLetras"
                            />
                        </div>
                        {/* Avatar uploader can go here if needed, simplified for brevity */}
                         <img src={data.avatarUrl || `https://i.pravatar.cc/150?u=${data.username || 'weaver-default'}`} alt="Avatar Preview" className="w-32 h-32 rounded-full border-4 border-primary/50 object-cover bg-surface mx-auto" />
                    </StepWrapper>
                );
            case 3: // Creative Identity
                 return (
                    <StepWrapper title="¿Qué tipo de creador eres?" desc="Esta elección nos ayuda a sugerirte herramientas e ideas que se ajusten a tu estilo.">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                            {creatorArchetypes.map(arch => (
                                <button key={arch.id} onClick={() => handleUpdate('creatorArchetype', arch.id)} className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${data.creatorArchetype === arch.id ? 'border-primary bg-primary/20 scale-105' : 'border-transparent bg-surface hover:border-border-color'}`}>
                                    <div className="flex items-center mb-2">
                                        <Icon name={arch.icon} className="w-6 h-6 mr-3 text-primary"/>
                                        <h4 className="font-bold text-text-main">{arch.name}</h4>
                                    </div>
                                    <p className="text-sm text-text-secondary">{arch.desc}</p>
                                </button>
                            ))}
                        </div>
                    </StepWrapper>
                );
            case 4: // Literary Tastes
                return (
                     <StepWrapper title="Define tus Gustos Literarios" desc={`¡Hola, ${data.username || 'autor'}! Ayuda a la IA a entender qué tipo de historias te gustan.`}>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-text-secondary mb-3">¿Qué géneros prefieres? (Elige tus favoritos)</label>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {genresList.map(genre => (
                                    <button type="button" key={genre} onClick={() => handleGenreToggle(genre)} className={`px-3 py-1.5 text-sm font-medium rounded-full border ${data.favoriteGenres?.includes(genre) ? 'bg-primary border-primary text-white' : 'bg-surface hover:border-primary'}`}>{genre}</button>
                                ))}
                            </div>
                        </div>
                    </StepWrapper>
                );
            case 5: // Reading Environment
                 return (
                    <StepWrapper title="Elige tu Santuario de Lectura" desc="Selecciona el tema visual que prefieras para leer. Podrás cambiarlo cuando quieras.">
                         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-2xl mx-auto">
                            {(['light', 'sepia', 'dark', 'neon-noir'] as ReaderTheme[]).map(theme => (
                                <button key={theme} onClick={() => handleUpdate('defaultReaderTheme', theme)} className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${data.defaultReaderTheme === theme ? 'border-primary bg-primary/20 scale-105' : 'border-transparent bg-surface hover:border-border-color'}`}>
                                    <div className={`w-full h-16 rounded mb-2 ${theme === 'light' ? 'bg-white' : theme === 'sepia' ? 'bg-sepia-bg' : theme === 'dark' ? 'bg-brand-bg' : 'bg-neon-noir-bg'}`}></div>
                                    <h4 className="font-semibold text-text-main capitalize">{theme === 'neon-noir' ? 'Neon Noir' : theme}</h4>
                                </button>
                            ))}
                        </div>
                    </StepWrapper>
                );
            case 6: // AI Companion Setup
                 return (
                    <StepWrapper title="Calibra a tu Compañero IA" desc="Ajusta cómo quieres que la IA colabore contigo. ¿Prefieres que siga tus órdenes o que tome la iniciativa?">
                        <div className="space-y-6 max-w-lg mx-auto text-left">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Libertad Creativa</label>
                                <input type="range" min="25" max="100" value={data.aiDefaults?.creativeFreedom} onChange={e => handleUpdate('aiDefaults', {...data.aiDefaults, creativeFreedom: parseInt(e.target.value)})} className="w-full h-2 bg-border-color rounded-lg appearance-none cursor-pointer accent-primary" />
                                <div className="flex justify-between text-xs text-text-secondary mt-1">
                                    <span>Sigue Órdenes</span>
                                    <span>Imaginativa</span>
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Complejidad de la Trama</label>
                                <div className="grid grid-cols-3 gap-2 mt-2">
                                    {(['Baja', 'Media', 'Alta'] as Complexity[]).map(c => (
                                        <button key={c} onClick={() => handleUpdate('aiDefaults', {...data.aiDefaults, defaultComplexity: c})} className={`py-2 rounded-md border ${data.aiDefaults?.defaultComplexity === c ? 'bg-primary border-primary text-white' : 'bg-surface border-border-color'}`}>{c}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </StepWrapper>
                );
            case 7: // Security Setup
                return (
                    <StepWrapper title="Asegura tu Cuenta" desc="Crea una contraseña maestra. La necesitarás junto a tu archivo de bóveda (`.swe`) para iniciar sesión.">
                         <div className="space-y-4 max-w-lg mx-auto text-left">
                             <div>
                                <label className="block text-sm font-medium text-text-secondary">Contraseña (mínimo 8 caracteres)</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full mt-1 bg-brand-bg border border-border-color rounded-md py-2 px-3"/>
                                <PasswordStrengthMeter password={password} />
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-text-secondary">Confirmar Contraseña</label>
                                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full mt-1 bg-brand-bg border border-border-color rounded-md py-2 px-3"/>
                                {password && confirmPassword && !isPasswordValid && (
                                    <p className="text-red-400 text-xs mt-1">Las contraseñas no coinciden o son demasiado cortas.</p>
                                )}
                             </div>
                         </div>
                    </StepWrapper>
                );
             case 8: // Passkey Creation
                return (
                    <StepWrapper title="Acceso del Futuro: Weaver Key" desc="Usa la biometría o el PIN de tu dispositivo para un inicio de sesión más rápido y seguro. Es como una llave digital para tu bóveda.">
                         <div className="p-6 bg-surface rounded-lg max-w-md mx-auto">
                             <label className="flex items-center justify-between cursor-pointer">
                                <div>
                                    <h4 className="font-semibold text-text-main">Crear una Weaver Key</h4>
                                    <p className="text-xs text-text-secondary">Recomendado para mayor seguridad.</p>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={data.createPasskey}
                                    onClick={() => handleUpdate('createPasskey', !data.createPasskey)}
                                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${data.createPasskey ? 'bg-primary' : 'bg-surface-light border border-border-color'}`}
                                >
                                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${data.createPasskey ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </label>
                        </div>
                         <p className="text-xs text-text-secondary mt-4">Podrás gestionar esto más tarde en los ajustes de seguridad.</p>
                    </StepWrapper>
                );
            case 9: // Recovery Questions
                 return (
                    <StepWrapper title="Último Paso: Recuperación de Cuenta" desc="Elige 2 preguntas de seguridad. Son tu última defensa si olvidas tu contraseña. ¡Elige sabiamente!">
                        <div className="space-y-4 max-w-lg mx-auto text-left">
                            {[0, 1].map(index => (
                                <div key={index}>
                                    <label className="block text-sm font-medium text-text-secondary">Pregunta {index + 1}</label>
                                    <select value={securityQuestions[index].question} onChange={e => handleSecurityQuestionChange(index, 'question', e.target.value)} className="w-full mt-1 bg-brand-bg border border-border-color rounded-md py-2 px-3">
                                        {standardSecurityQuestions.map(q => <option key={q} value={q}>{q}</option>)}
                                    </select>
                                    <label className="block text-sm font-medium text-text-secondary mt-2">Respuesta</label>
                                    <input type="text" value={securityQuestions[index].answer} onChange={e => handleSecurityQuestionChange(index, 'answer', e.target.value)} className="w-full mt-1 bg-brand-bg border border-border-color rounded-md py-2 px-3"/>
                                </div>
                            ))}
                        </div>
                    </StepWrapper>
                 );
            default: return null;
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-brand-bg p-4">
            <div className="w-full max-w-3xl bg-surface-light rounded-2xl p-8 shadow-2xl">
                <ProgressBar currentStep={step} totalSteps={totalSteps} />
                
                <div className="min-h-[420px] flex flex-col justify-center">
                    {renderStep()}
                </div>
                
                <div className="flex justify-between items-center mt-8">
                    <button onClick={prevStep} disabled={step === 1} className="py-2 px-4 rounded-md bg-surface hover:bg-border-color disabled:opacity-50 transition-colors">
                        Anterior
                    </button>
                    {step < totalSteps ? (
                         <button onClick={nextStep} disabled={(step === 2 && !data.username) || (step === 4 && data.favoriteGenres?.length === 0) || (step === 7 && !isPasswordValid)} className="py-2 px-6 rounded-md bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                            Siguiente
                        </button>
                    ) : (
                        <button onClick={handleFinalize} disabled={!isPasswordValid || !areSecurityQuestionsValid} className="py-2 px-6 rounded-md bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors flex items-center gap-2">
                           <Icon name="check" /> Finalizar y Crear Bóveda
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
