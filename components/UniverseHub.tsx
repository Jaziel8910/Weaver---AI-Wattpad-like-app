import React, { useState } from 'react';
import type { Universe, UserTier, LoreEntry, Character, UniverseRelationship } from '../types';
import { Icon } from './Icon';
import { ProBadge } from './ProBadge';

const CreateUniverseForm: React.FC<{ onSave: (universe: Omit<Universe, 'id' | 'storyIds' | 'lore' | 'characters' | 'relationships'>) => void, onCancel: () => void }> = ({ onSave, onCancel }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [history, setHistory] = useState('');
    const [worldLaws, setWorldLaws] = useState('');

    const handleSave = () => {
        if(!name || !description) {
            alert("El nombre y la descripción son obligatorios.");
            return;
        }
        onSave({ name, description, history, worldLaws, timeline: {}, races: [], magicSystems: [], technologies: [] });
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
             <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-2xl animate-palette-enter">
                <h3 className="text-xl font-bold text-primary mb-4">Crear Nuevo Universo</h3>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div>
                        <label htmlFor="uni-name" className="block text-sm font-medium text-text-secondary">Nombre del Universo</label>
                        <input id="uni-name" type="text" value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 bg-brand-bg border border-border-color rounded-md py-2 px-3" placeholder="Ej: Las Crónicas de Aethel"/>
                    </div>
                     <div>
                        <label htmlFor="uni-desc" className="block text-sm font-medium text-text-secondary">Descripción Breve</label>
                        <textarea id="uni-desc" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full mt-1 bg-brand-bg border border-border-color rounded-md py-2 px-3" placeholder="Un mundo de alta fantasía donde la magia se teje a partir de la luz estelar..."/>
                    </div>
                    <div>
                        <label htmlFor="uni-history" className="block text-sm font-medium text-text-secondary">Historia Principal</label>
                        <textarea id="uni-history" value={history} onChange={e => setHistory(e.target.value)} rows={5} className="w-full mt-1 bg-brand-bg border border-border-color rounded-md py-2 px-3" placeholder="Describe los eventos clave, eras y figuras históricas de tu mundo..."/>
                    </div>
                    <div>
                        <label htmlFor="uni-laws" className="block text-sm font-medium text-text-secondary">Leyes del Mundo</label>
                        <textarea id="uni-laws" value={worldLaws} onChange={e => setWorldLaws(e.target.value)} rows={5} className="w-full mt-1 bg-brand-bg border border-border-color rounded-md py-2 px-3" placeholder="¿Cómo funciona la magia? ¿Qué leyes físicas son diferentes? ¿Hay dioses o fuerzas cósmicas?"/>
                    </div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={onCancel} className="px-4 py-2 rounded-md bg-surface-light hover:bg-border-color">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-md bg-primary text-white hover:bg-primary-hover">Guardar Universo</button>
                </div>
            </div>
        </div>
    );
};

const UniverseDetailView: React.FC<{
    universe: Universe;
    onUpdate: (updatedUniverse: Universe) => void;
    onClose: () => void;
}> = ({ universe, onUpdate, onClose }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'lore' | 'characters' | 'relationships'>('overview');
    const [editableUniverse, setEditableUniverse] = useState(universe);

    const handleUpdateField = <K extends keyof Universe>(field: K, value: Universe[K]) => {
        setEditableUniverse(prev => ({...prev, [field]: value}));
    };
    
    const handleSave = () => {
        onUpdate(editableUniverse);
    };

    const renderTabContent = () => {
        // Placeholder components for editing different parts of the universe
        const LoreEditor = () => (
            <div className="space-y-4">
                {(editableUniverse.lore || []).map((entry, index) => (
                    <div key={entry.id} className="p-3 bg-brand-bg rounded-md">
                        <p className="font-bold">{entry.title} <span className="text-xs text-text-secondary">({entry.category})</span></p>
                        <p className="text-sm text-text-secondary">{entry.content}</p>
                    </div>
                ))}
                <button className="text-primary text-sm flex items-center gap-1"><Icon name="plus"/>Añadir Entrada de Lore</button>
            </div>
        );
        const CharacterEditor = () => (
             <div className="space-y-4">
                {(editableUniverse.characters || []).map((char) => (
                    <div key={char.id} className="p-3 bg-brand-bg rounded-md">
                        <p className="font-bold">{char.name} <span className="text-xs text-text-secondary">({char.role})</span></p>
                        <p className="text-sm text-text-secondary">{char.description}</p>
                    </div>
                ))}
                <button className="text-primary text-sm flex items-center gap-1"><Icon name="plus"/>Añadir Personaje</button>
            </div>
        );
        const RelationshipEditor = () => (
            <div className="space-y-4">
                {(editableUniverse.relationships || []).map((rel) => {
                    const char1 = editableUniverse.characters.find(c => c.id === rel.character1Id)?.name;
                    const char2 = editableUniverse.characters.find(c => c.id === rel.character2Id)?.name;
                    return (
                        <div key={rel.id} className="p-3 bg-brand-bg rounded-md">
                            <p className="font-bold">{char1 || '?'} → {char2 || '?'} <span className="text-xs text-text-secondary">({rel.type})</span></p>
                            <p className="text-sm text-text-secondary">{rel.description}</p>
                        </div>
                    );
                })}
                <button className="text-primary text-sm flex items-center gap-1"><Icon name="plus"/>Añadir Relación</button>
            </div>
        );

        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary">Nombre</label>
                            <input type="text" value={editableUniverse.name} onChange={e => handleUpdateField('name', e.target.value)} className="w-full mt-1 p-2 bg-brand-bg border border-border-color rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary">Descripción</label>
                            <textarea value={editableUniverse.description} onChange={e => handleUpdateField('description', e.target.value)} rows={4} className="w-full mt-1 p-2 bg-brand-bg border border-border-color rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary">Historia</label>
                            <textarea value={editableUniverse.history} onChange={e => handleUpdateField('history', e.target.value)} rows={6} className="w-full mt-1 p-2 bg-brand-bg border border-border-color rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary">Leyes del Mundo</label>
                            <textarea value={editableUniverse.worldLaws} onChange={e => handleUpdateField('worldLaws', e.target.value)} rows={6} className="w-full mt-1 p-2 bg-brand-bg border border-border-color rounded-md" />
                        </div>
                    </div>
                );
            case 'lore': return <LoreEditor />;
            case 'characters': return <CharacterEditor />;
            case 'relationships': return <RelationshipEditor />;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col animate-palette-enter" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-border-color flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-primary flex items-center gap-3"><Icon name="globe" /> Editando: {universe.name}</h2>
                    <div className="flex items-center gap-2">
                         <button onClick={onClose} className="px-4 py-2 text-sm rounded-md bg-surface-light hover:bg-border-color">Cerrar</button>
                         <button onClick={handleSave} className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary-hover">Guardar Cambios</button>
                    </div>
                </header>
                <div className="flex flex-grow overflow-hidden">
                    <nav className="w-48 border-r border-border-color p-2 space-y-1">
                        {(['overview', 'lore', 'characters', 'relationships'] as const).map(tab => (
                             <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeTab === tab ? 'bg-primary/20 text-primary' : 'hover:bg-surface-light'}`}
                            >
                               <Icon name={tab === 'overview' ? 'info' : tab === 'lore' ? 'book-text' : tab === 'characters' ? 'users' : 'share-2'} className="w-4 h-4" />
                                <span className="capitalize">{tab === 'overview' ? 'General' : tab}</span>
                            </button>
                        ))}
                    </nav>
                    <main className="flex-1 p-6 overflow-y-auto">
                        {renderTabContent()}
                    </main>
                </div>
            </div>
        </div>
    )
};

interface UniverseHubProps {
    universes: Universe[];
    onUpdateUniverses: (universes: Universe[]) => void;
    effectiveTier: UserTier;
    onBack: () => void;
}

export const UniverseHub: React.FC<UniverseHubProps> = ({ universes, onUpdateUniverses, effectiveTier, onBack }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [selectedUniverse, setSelectedUniverse] = useState<Universe | null>(null);
    
    const tierLimits = {
        free: 1,
        essentials: 5,
        pro: Infinity,
        ultra: Infinity,
    };

    const canCreate = universes.length < tierLimits[effectiveTier];

    const handleCreateUniverse = (newUniverseData: Omit<Universe, 'id' | 'storyIds' | 'lore' | 'characters' | 'relationships'>) => {
        const newUniverse: Universe = {
            ...newUniverseData,
            id: crypto.randomUUID(),
            storyIds: [],
            lore: [],
            characters: [],
            relationships: [],
        };
        onUpdateUniverses([...universes, newUniverse]);
        setIsCreating(false);
    };

    const handleUpdateSelectedUniverse = (updatedUniverse: Universe) => {
        const newUniverses = universes.map(u => u.id === updatedUniverse.id ? updatedUniverse : u);
        onUpdateUniverses(newUniverses);
        setSelectedUniverse(updatedUniverse); // Keep the detail view open with updated data
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {isCreating && <CreateUniverseForm onSave={handleCreateUniverse} onCancel={() => setIsCreating(false)} />}
            {selectedUniverse && <UniverseDetailView universe={selectedUniverse} onUpdate={handleUpdateSelectedUniverse} onClose={() => setSelectedUniverse(null)} />}
            
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-surface-light">
                        <Icon name="arrow-left" className="w-6 h-6 text-primary" />
                    </button>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Icon name="globe" /> Weaver Universe <span className="text-sm font-semibold bg-primary/20 text-primary px-2 py-0.5 rounded-full">Beta</span>
                    </h1>
                </div>
                 <div className="relative">
                    <button onClick={() => setIsCreating(true)} disabled={!canCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed">
                        <Icon name="plus" className="w-5 h-5"/>
                        Crear Nuevo Universo
                    </button>
                    {!canCreate && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-md z-10 bg-black/60 backdrop-blur-sm cursor-not-allowed">
                           <ProBadge isLocked tierName={effectiveTier === 'free' ? 'ESSENTIALS' : 'PRO'} />
                        </div>
                    )}
                </div>
            </div>

             {universes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {universes.map(uni => (
                        <button key={uni.id} onClick={() => setSelectedUniverse(uni)} className="bg-surface rounded-lg shadow-lg p-6 flex flex-col text-left hover:shadow-primary/20 hover:-translate-y-1 transition-all duration-300">
                             <div className="flex-grow">
                                <h3 className="text-xl font-bold text-primary truncate">{uni.name}</h3>
                                <p className="text-sm text-text-secondary h-20 mt-2 overflow-hidden text-ellipsis">{uni.description}</p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-border-color grid grid-cols-3 gap-2 text-xs text-text-secondary">
                                <span className="truncate"><Icon name="book-open" className="w-3 h-3 inline mr-1" /> {uni.storyIds.length} Historias</span>
                                <span className="truncate"><Icon name="users" className="w-3 h-3 inline mr-1" /> {uni.characters.length} Personajes</span>
                                <span className="truncate"><Icon name="book-text" className="w-3 h-3 inline mr-1" /> {uni.lore.length} Entradas Lore</span>
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-surface rounded-lg border-2 border-dashed border-border-color">
                    <Icon name="globe" className="w-20 h-20 mx-auto text-text-secondary opacity-50"/>
                    <h2 className="mt-4 text-2xl font-semibold">Tu lienzo de mundos está en blanco</h2>
                    <p className="mt-2 text-text-secondary">Crea tu primer universo para empezar a construir sagas y conectar historias.</p>
                </div>
            )}
        </div>
    );
};