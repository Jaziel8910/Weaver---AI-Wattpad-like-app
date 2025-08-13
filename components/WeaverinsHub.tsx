import React, { useState } from 'react';
import type { AppSettings, Quests, Story } from '../types';
import { Icon } from './Icon';

interface WeaverinsHubProps {
  settings: AppSettings;
  stories: Story[];
  onUpdateAccountSettings: (updatedSettings: Partial<AppSettings['account']>) => void;
  onBack: () => void;
}

const QuestCard: React.FC<{ questId: keyof Quests | string; title: string; description: string; reward: number; isCompleted: boolean; }> = ({ title, description, reward, isCompleted }) => {
    return (
        <div className={`p-4 rounded-lg flex items-center justify-between transition-all ${isCompleted ? 'bg-green-500/10 border border-green-500/30' : 'bg-surface border border-border-color'}`}>
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-primary/20 text-primary'}`}>
                    <Icon name={isCompleted ? "check" : "star"} className="w-6 h-6" />
                </div>
                <div>
                    <h4 className={`font-semibold ${isCompleted ? 'text-green-300' : 'text-text-main'}`}>{title}</h4>
                    <p className="text-xs text-text-secondary">{description}</p>
                </div>
            </div>
            <div className={`text-right ${isCompleted ? 'opacity-50' : ''}`}>
                <p className="font-bold text-pro-gold text-lg">+{reward}</p>
                <p className="text-xs text-text-secondary">Weaverins</p>
            </div>
        </div>
    );
};


export const WeaverinsHub: React.FC<WeaverinsHubProps> = ({ settings, stories, onUpdateAccountSettings, onBack }) => {
    const { account } = settings;
    const { weaverins, savingsGoal, stingyMode, quests } = account;
    const [newGoal, setNewGoal] = useState(savingsGoal);

    const handleGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value) || 0;
        setNewGoal(value);
    };

    const handleGoalBlur = () => {
        onUpdateAccountSettings({ savingsGoal: newGoal });
    };

    const progress = savingsGoal > 0 ? (weaverins / savingsGoal) * 100 : 0;
    
    const allQuests = [
        { id: 'firstStoryCompleted', title: 'Tu Primera Historia', description: 'Crea y completa tu primera historia.', reward: 100 },
        { id: 'tenChaptersRead', title: 'Lector Voraz', description: 'Lee un total de 10 capítulos.', reward: 50 },
        { id: 'firstFriendAdded', title: 'Socialité', description: 'Añade a tu primer amigo.', reward: 75 },
        { id: 'firstPresetSaved', title: 'Maestro de la Eficiencia', description: 'Guarda tu primer preajuste de generación.', reward: 25 },
    ] as const;

    const dynamicQuests = [
        {
            id: 'horrorMaster',
            title: 'Maestro del Suspense',
            description: 'Escribe 3 historias de terror.',
            reward: 200,
            isCompleted: stories.filter(s => s.params.genres.includes('Terror')).length >= 3
        },
        {
            id: 'epicWriter',
            title: 'Escritor de Sagas',
            description: 'Completa 5 historias de 10 capítulos o más.',
            reward: 500,
            isCompleted: stories.filter(s => s.chapters.length >= 10).length >= 5
        },
         {
            id: 'universeCreator',
            title: 'Arquitecto de Mundos',
            description: 'Crea tu primer Universo en el Universe Hub.',
            reward: 150,
            isCompleted: (settings as any).universes?.length > 0 // A safe way to check, assuming universes might be passed in future
        }
    ];

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-8">
            <button onClick={onBack} className="flex items-center text-sm text-primary hover:text-primary-hover mb-6">
                <Icon name="arrow-left" className="w-4 h-4 mr-2"/>
                Volver
            </button>
            <div className="text-center mb-8">
                <Icon name="award" className="w-16 h-16 mx-auto text-pro-gold"/>
                <h1 className="text-4xl font-bold mt-2 text-text-main">Hub de Weaverins</h1>
                <p className="text-lg text-text-secondary">Tu centro de mando económico para la creatividad.</p>
            </div>
            
            <div className="mb-8 p-6 bg-surface rounded-lg shadow-lg">
                <p className="text-center text-text-secondary">Tu Saldo Actual</p>
                <p className="text-center text-6xl font-bold text-pro-gold my-2">{weaverins}</p>
                <p className="text-center text-text-secondary">Weaverins</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Quests */}
                <div className="bg-surface p-6 rounded-lg">
                    <h3 className="text-xl font-bold text-primary mb-4">Misiones</h3>
                    <div className="space-y-3">
                        {allQuests.map(q => (
                            <QuestCard key={q.id} questId={q.id} title={q.title} description={q.description} reward={q.reward} isCompleted={quests[q.id]} />
                        ))}
                        {dynamicQuests.map(q => (
                            <QuestCard key={q.id} questId={q.id} title={q.title} description={q.description} reward={q.reward} isCompleted={q.isCompleted} />
                        ))}
                    </div>
                </div>

                {/* Right Column: Savings */}
                <div className="bg-surface p-6 rounded-lg">
                    <h3 className="text-xl font-bold text-primary mb-4">Meta de Ahorro</h3>
                    <p className="text-sm text-text-secondary mb-4">Establece una meta para ahorrar para ese plan que tanto quieres.</p>
                    
                    <div className="mb-4">
                        <label htmlFor="goal" className="text-sm text-text-secondary">Tu Meta</label>
                        <input
                            type="number"
                            id="goal"
                            value={newGoal}
                            onChange={handleGoalChange}
                            onBlur={handleGoalBlur}
                            className="w-full mt-1 p-2 bg-brand-bg border border-border-color rounded-md"
                        />
                    </div>

                    <div className="mb-4">
                        <div className="w-full bg-border-color rounded-full h-2.5">
                            <div className="bg-pro-gold h-2.5 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                        </div>
                        <p className="text-xs text-right text-text-secondary mt-1">{weaverins} / {savingsGoal} Weaverins</p>
                    </div>

                    <div className="p-4 bg-brand-bg rounded-lg">
                         <label className="flex items-center justify-between cursor-pointer">
                            <div>
                                <h4 className="font-semibold text-text-main">Modo Tacaño</h4>
                                <p className="text-xs text-text-secondary">Bloquea las compras hasta alcanzar tu meta.</p>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={stingyMode}
                                onClick={() => onUpdateAccountSettings({ stingyMode: !stingyMode })}
                                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${stingyMode ? 'bg-primary' : 'bg-surface-light border border-border-color'}`}
                            >
                                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${stingyMode ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </label>
                    </div>
                </div>
            </div>
             <div className="mt-8 p-6 bg-surface rounded-lg">
                <h3 className="text-xl font-bold text-primary mb-2">¿En qué gastar Weaverins?</h3>
                <p className="text-text-secondary">Los Weaverins son la moneda para desbloquear todo el potencial de Weaver. Úsalos para comprar tiempo en los planes <strong className="text-white">Essentials, PRO y Ultra</strong>. Cada plan te da acceso a más funciones, historias ilimitadas, generación de imágenes de alta calidad, y mucho más. ¡Invierte en tu creatividad!</p>
            </div>
        </div>
    );
};
