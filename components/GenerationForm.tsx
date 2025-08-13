import React, { useState, useEffect } from 'react';
import type { GenerationParams, Character, Genre, StoryType, Complexity, ChapterLength, WritingStyle, PointOfView, Tone, Pacing, GenerationPreset, ContextFile, UserTier, ContentRating, Universe, WeaverAgeRating } from '../types';
import { Icon, type IconProps } from './Icon';
import { FileUpload } from './FileUpload';
import { generateCharacterNames } from '../services/geminiService';
import { ProBadge } from './ProBadge';

interface GenerationFormProps {
  onGenerate: (params: GenerationParams) => void;
  isLoading: boolean;
  presets: GenerationPreset[];
  onSavePreset: (preset: GenerationPreset) => void;
  onLoadPreset: (preset: GenerationParams) => void;
  initialInspiration?: string;
  effectiveTier: UserTier;
  universes: Universe[];
  isLegacyMode: boolean;
  isKidsMode: boolean;
}

const Section: React.FC<{ title: string; icon: IconProps['name']; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, icon, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="bg-surface-light rounded-lg transition-all duration-300">
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 text-left">
                <div className="flex items-center">
                    <Icon name={icon} className="w-5 h-5 mr-3 text-primary" />
                    <h3 className="font-semibold text-text-main">{title}</h3>
                </div>
                <Icon name="chevron-down" className={`w-5 h-5 text-text-secondary transition-transform ${isOpen ? '' : '-rotate-90'}`} />
            </button>
            {isOpen && <div className="p-4 border-t border-border-color">{children}</div>}
        </div>
    );
};

export const GenerationForm: React.FC<GenerationFormProps> = ({ onGenerate, isLoading, presets, onSavePreset, onLoadPreset, initialInspiration = '', effectiveTier, universes, isLegacyMode, isKidsMode }) => {
  const [params, setParams] = useState<GenerationParams>({
    storyType: 'Original',
    fandom: 'Harry Potter',
    setting: '',
    genres: ['Fantasía', 'Aventura'],
    characters: [
      { id: crypto.randomUUID(), name: 'Arion', role: 'Protagonista', description: 'Un joven mago con un pasado misterioso y un poder latente.' },
      { id: crypto.randomUUID(), name: 'Lyra', role: 'Secundario', description: 'Una hábil ladrona con un corazón de oro y una lengua afilada.' },
    ],
    plotOutline: 'Arion y Lyra se unen para encontrar un artefacto antiguo antes de que caiga en manos de un culto oscuro que busca desatar el caos en el reino.',
    writingStyle: 'Cinematográfico',
    pointOfView: 'Tercera Persona Limitada',
    tone: 'Épico',
    pacing: 'Equilibrado',
    complexity: 'Media',
    chapters: 5,
    chapterLength: 'Media (~1500 palabras)',
    generateIllustrations: true,
    contextFiles: [],
    inspirationPrompt: initialInspiration,
    enableBranching: false,
    customIllustrationStyle: '',
    contentRating: 'Teen',
    weaverAgeRating: 'Teen',
    universeId: '',
  });
  
  const [isPresetDropdownOpen, setIsPresetDropdownOpen] = useState(false);
  const [nameSuggestions, setNameSuggestions] = useState<{ [charId: string]: string[] }>({});
  const [isSuggestingName, setIsSuggestingName] = useState<string | null>(null);

  const isEssentialsOrHigher = effectiveTier === 'essentials' || effectiveTier === 'pro' || effectiveTier === 'ultra';
  const isProOrHigher = effectiveTier === 'pro' || effectiveTier === 'ultra';
  const isUltra = effectiveTier === 'ultra';

  const maxChapters = effectiveTier === 'free' ? 10 : isEssentialsOrHigher ? 25 : 50;
  const maxFiles = effectiveTier === 'free' ? 2 : isEssentialsOrHigher ? 10 : 25;

  useEffect(() => {
    if (!isEssentialsOrHigher) {
        if (params.chapterLength === 'Larga (~2500 palabras)') {
            handleParamChange('chapterLength', 'Media (~1500 palabras)');
        }
    }
    if (!isProOrHigher) {
        if (params.complexity === 'Alta') handleParamChange('complexity', 'Media');
        if (params.contentRating === 'Mature') handleParamChange('contentRating', 'Teen');
    }
    if (!isUltra) {
        if (params.contentRating === 'Explicit') handleParamChange('contentRating', 'Mature');
    }
    if (params.chapters > maxChapters) {
        handleParamChange('chapters', maxChapters);
    }
    if (isKidsMode) {
        handleParamChange('weaverAgeRating', 'Kids');
        handleParamChange('contentRating', 'Family-Friendly');
    }
  }, [effectiveTier, maxChapters, params.chapterLength, params.complexity, params.chapters, params.contentRating, isKidsMode]);


  const handleParamChange = <K extends keyof GenerationParams>(key: K, value: GenerationParams[K]) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };
  
  const handleCharacterChange = (id: string, field: keyof Omit<Character, 'id'>, value: string) => {
    const newCharacters = params.characters.map(c => c.id === id ? { ...c, [field]: value } : c);
    handleParamChange('characters', newCharacters);
  };

  const addCharacter = () => {
    const newChar: Character = { id: crypto.randomUUID(), name: '', role: 'Secundario', description: '' };
    handleParamChange('characters', [...params.characters, newChar]);
  };

  const removeCharacter = (id: string) => {
    handleParamChange('characters', params.characters.filter(c => c.id !== id));
  };
  
  const handleGenreToggle = (genre: Genre) => {
    const newGenres = params.genres.includes(genre)
      ? params.genres.filter(g => g !== genre)
      : [...params.genres, genre];
    handleParamChange('genres', newGenres);
  };
  
  const handleSuggestName = async (char: Character) => {
      setIsSuggestingName(char.id);
      const suggestions = await generateCharacterNames(char.role, params.genres[0] || 'General');
      setNameSuggestions(prev => ({ ...prev, [char.id]: suggestions }));
      setIsSuggestingName(null);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading) {
      onGenerate(params);
    }
  };

  const handleSavePresetClick = () => {
    const presetName = prompt("Introduce un nombre para este preajuste:", "Mi Preajuste");
    if (presetName) {
        onSavePreset({ ...params, presetName });
    }
  };
  
  const handleLoadPresetClick = (preset: GenerationPreset) => {
    const { presetName, ...baseParams } = preset;
    setParams(baseParams);
    setIsPresetDropdownOpen(false);
  };

  const genres: Genre[] = ['Ciencia Ficción', 'Fantasía', 'Romance', 'Terror', 'Misterio', 'Aventura', 'Drama', 'Comedia', 'Thriller', 'Histórico', 'Cyberpunk'];
  const writingStyles: WritingStyle[] = ['Cinematográfico', 'Literario', 'Humorístico', 'Oscuro y Valiente', 'Poético'];
  const povs: PointOfView[] = ['Primera Persona (Protagonista)', 'Tercera Persona Limitada', 'Tercera Persona Omnisciente'];
  const tones: Tone[] = ['Épico', 'Comédico', 'Melancólico', 'Esperanzador', 'Suspenso', 'Serio'];
  const pacings: Pacing[] = ['Lento y Descriptivo', 'Equilibrado', 'Rápido y Lleno de Acción'];
  const chapterLengths: ChapterLength[] = ['Corta (~500 palabras)', 'Media (~1500 palabras)', 'Larga (~2500 palabras)'];
  const complexities: Complexity[] = ['Baja', 'Media', 'Alta'];
  const contentRatings: {id: WeaverAgeRating, name: string, tier: UserTier}[] = [
      {id: 'Kids', name: 'Infantil (Para todos)', tier: 'free'},
      {id: 'Teen', name: 'Adolescentes (13+)', tier: 'free'},
      {id: 'Mature', name: 'Madura (18+)', tier: 'pro'},
      {id: 'Adult', name: 'Explícita (+18 sin censura)', tier: 'ultra'},
  ];
  const characterRoles: Character['role'][] = ['Protagonista', 'Antagonista', 'Secundario', 'Interés Amoroso', 'Mentor'];

  return (
    <div className="w-full max-w-4xl mx-auto bg-surface rounded-lg shadow-xl p-8">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
                <Icon name="wand" className="w-8 h-8 text-primary" />
                <h2 className="text-3xl font-bold ml-3 text-text-main">Crea tu Historia</h2>
            </div>
            <div className="flex items-center gap-2">
                 <div className="relative">
                    <button type="button" onClick={handleSavePresetClick} className="flex items-center text-sm px-3 py-1.5 bg-surface-light border border-border-color rounded-md hover:bg-primary-hover hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={!isEssentialsOrHigher}>
                        <Icon name="save" className="w-4 h-4 mr-1.5"/> Guardar
                    </button>
                    {!isEssentialsOrHigher &&
                         <div className="absolute inset-0 flex items-center justify-center rounded-md z-10 bg-black/30 backdrop-blur-sm">
                           <ProBadge tierName='ESSENTIALS' isLocked/>
                        </div>
                    }
                 </div>
                <div className="relative">
                    <button type="button" onClick={() => setIsPresetDropdownOpen(p => !p)} className="flex items-center text-sm px-3 py-1.5 bg-surface-light border border-border-color rounded-md hover:bg-primary-hover hover:text-white transition-colors">
                        <Icon name="folder-open" className="w-4 h-4 mr-1.5"/> Cargar
                    </button>
                    {isPresetDropdownOpen && presets.length > 0 && (
                        <div className="absolute right-0 mt-2 w-48 bg-surface-light border border-border-color rounded-md shadow-lg z-10">
                            {presets.map(p => (
                                <button key={p.presetName} type="button" onClick={() => handleLoadPresetClick(p)} className="block w-full text-left px-4 py-2 text-sm hover:bg-primary">
                                    {p.presetName}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      <p className="text-center text-text-secondary mb-8">
        Define los detalles de tu narrativa y deja que la IA teja la magia para ti.
      </p>
      <form onSubmit={handleSubmit} className="space-y-6">
        {isKidsMode && (
            <div className="p-4 mb-2 bg-primary/20 border border-primary/30 rounded-lg text-center">
                <h3 className="font-bold text-primary flex items-center justify-center gap-2"><Icon name="star" /> Modo Weaver Kids Activado</h3>
                <p className="text-sm text-primary/80">Las historias se crearán con contenido apto para toda la familia.</p>
            </div>
        )}
        {initialInspiration && (
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                <p className="text-sm text-primary-hover"><b className="font-semibold">Inspiración:</b> {initialInspiration}</p>
            </div>
        )}
        <Section title="Información Básica" icon="file-text">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-medium text-text-secondary">Tipo de Historia</label>
                    <div className="mt-2 flex rounded-md shadow-sm">
                        {(['Fanfiction', 'Original'] as StoryType[]).map(type => (
                            <button type="button" key={type} onClick={() => handleParamChange('storyType', type)} className={`px-4 py-2 text-sm font-medium border ${params.storyType === type ? 'bg-primary border-primary text-white' : 'bg-brand-bg border-border-color hover:bg-surface-light'} ${type === 'Fanfiction' ? 'rounded-l-md' : 'rounded-r-md'}`}>{type}</button>
                        ))}
                    </div>
                </div>
                {params.storyType === 'Fanfiction' ? (
                    <div>
                        <label htmlFor="fandom" className="block text-sm font-medium text-text-secondary">Fandom</label>
                        <input type="text" id="fandom" value={params.fandom} onChange={e => handleParamChange('fandom', e.target.value)} className="mt-1 block w-full bg-brand-bg border border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" placeholder="Ej: Marvel Cinematic Universe" required />
                    </div>
                ) : (
                    <div>
                        <label htmlFor="setting" className="block text-sm font-medium text-text-secondary">Ambientación / Mundo</label>
                        <textarea id="setting" value={params.setting} onChange={e => handleParamChange('setting', e.target.value)} rows={2} className="mt-1 block w-full bg-brand-bg border border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" placeholder="Describe el mundo de tu historia..."></textarea>
                    </div>
                )}
            </div>
             <div className={`mt-6 ${isLegacyMode ? 'opacity-50' : ''}`}>
                <label htmlFor="universe" className="block text-sm font-medium text-text-secondary">Universo (Opcional)</label>
                <select id="universe" value={params.universeId} onChange={e => handleParamChange('universeId', e.target.value)} disabled={isLegacyMode} className="mt-1 block w-full bg-brand-bg border border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:cursor-not-allowed disabled:bg-surface-light">
                    <option value="">Ninguno (Historia Independiente)</option>
                    {universes.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <p className="text-xs text-text-secondary mt-1">{isLegacyMode ? 'La vinculación con Universos está desactivada en el modo de compatibilidad.' : 'Vincula esta historia a un universo que hayas creado en el Hub de Universos.'}</p>
            </div>
            <div className="mt-6">
                <label className="block text-sm font-medium text-text-secondary">Géneros</label>
                <div className="mt-2 flex flex-wrap gap-2">
                    {genres.map(genre => (
                        <button type="button" key={genre} onClick={() => handleGenreToggle(genre)} className={`px-3 py-1 text-xs font-medium rounded-full border ${params.genres.includes(genre) ? 'bg-primary border-primary text-white' : 'bg-surface border-border-color hover:border-primary'}`}>{genre}</button>
                    ))}
                </div>
            </div>
        </Section>
        
         <Section title="Contexto (Opcional)" icon="upload" defaultOpen={false}>
            <p className="text-sm text-text-secondary mb-4">Añade archivos (TXT, PDF, JPG, PNG) para dar contexto a la IA sobre personajes, tramas o mundos existentes.</p>
            <FileUpload files={params.contextFiles} setFiles={(files) => handleParamChange('contextFiles', files)} maxFiles={maxFiles} effectiveTier={effectiveTier} />
        </Section>
        
        <Section title="Personajes" icon="users">
            <div className="space-y-4">
              {params.characters.map((char, index) => (
                <div key={char.id} className="p-3 bg-brand-bg rounded-md border border-border-color space-y-3 relative">
                  <div className="flex justify-between items-start">
                    <p className="font-semibold text-text-main">Personaje {index + 1}</p>
                    {params.characters.length > 1 && <button type="button" onClick={() => removeCharacter(char.id)}><Icon name="trash" className="w-4 h-4 text-red-400 hover:text-red-600"/></button>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                        <input type="text" placeholder="Nombre" value={char.name} onChange={e => handleCharacterChange(char.id, 'name', e.target.value)} className="w-full bg-surface-light border border-border-color rounded-md py-1 px-2 text-sm" required />
                        <button type="button" onClick={() => handleSuggestName(char)} title="Sugerir nombre" className="p-1 text-primary hover:text-primary-hover disabled:opacity-50" disabled={isSuggestingName === char.id}>
                            {isSuggestingName === char.id ? <Icon name="loader" className="w-4 h-4" /> : <Icon name="dice-5" className="w-4 h-4" />}
                        </button>
                    </div>
                    <select value={char.role} onChange={e => handleCharacterChange(char.id, 'role', e.target.value as Character['role'])} className="w-full bg-surface-light border border-border-color rounded-md py-1 px-2 text-sm">
                      {characterRoles.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  {nameSuggestions[char.id] && (
                        <div className="flex flex-wrap gap-1">
                            {nameSuggestions[char.id].map(name => (
                                <button type="button" key={name} onClick={() => { handleCharacterChange(char.id, 'name', name); setNameSuggestions(p => ({...p, [char.id]: []})) }} className="px-2 py-0.5 text-xs bg-primary/20 text-primary-hover rounded-full">
                                    {name}
                                </button>
                            ))}
                        </div>
                   )}
                  <textarea placeholder="Descripción y personalidad..." value={char.description} onChange={e => handleCharacterChange(char.id, 'description', e.target.value)} rows={2} className="w-full bg-surface-light border border-border-color rounded-md py-1 px-2 text-sm"></textarea>
                </div>
              ))}
            </div>
            <button type="button" onClick={addCharacter} className="mt-4 flex items-center text-sm text-primary hover:text-primary-hover"><Icon name="plus" className="w-4 h-4 mr-1"/>Añadir Personaje</button>
        </Section>
        
        <Section title="Trama y Estilo" icon="palette">
             <div className="space-y-4">
                <div>
                    <label htmlFor="plotOutline" className="block text-sm font-medium text-text-secondary">Esquema de la Trama</label>
                    <textarea id="plotOutline" value={params.plotOutline} onChange={e => handleParamChange('plotOutline', e.target.value)} rows={4} className="mt-1 block w-full bg-brand-bg border border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" placeholder="Describe los puntos clave de la trama..."></textarea>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                        <label htmlFor="writingStyle" className="block text-sm font-medium text-text-secondary">Estilo de Escritura</label>
                        <select id="writingStyle" value={params.writingStyle} onChange={e => handleParamChange('writingStyle', e.target.value as WritingStyle)} className="mt-1 block w-full bg-brand-bg border border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                            {writingStyles.map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="pointOfView" className="block text-sm font-medium text-text-secondary">Punto de Vista</label>
                        <select id="pointOfView" value={params.pointOfView} onChange={e => handleParamChange('pointOfView', e.target.value as PointOfView)} className="mt-1 block w-full bg-brand-bg border border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                            {povs.map(p => <option key={p}>{p}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="tone" className="block text-sm font-medium text-text-secondary">Tono</label>
                        <select id="tone" value={params.tone} onChange={e => handleParamChange('tone', e.target.value as Tone)} className="mt-1 block w-full bg-brand-bg border border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                            {tones.map(t => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                </div>
            </div>
        </Section>
        
        <Section title="Estructura y Contenido" icon="image">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="contentRating" className="block text-sm font-medium text-text-secondary">Clasificación de Contenido</label>
                    <select id="contentRating" value={params.weaverAgeRating} onChange={e => handleParamChange('weaverAgeRating', e.target.value as WeaverAgeRating)} className="mt-1 block w-full bg-brand-bg border border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" disabled={isKidsMode}>
                        {contentRatings.map(cr => {
                            let disabled = false;
                            if (cr.tier === 'pro' && !isProOrHigher) disabled = true;
                            if (cr.tier === 'ultra' && !isUltra) disabled = true;
                            if (isKidsMode && cr.id !== 'Kids') disabled = true;
                            return <option key={cr.id} value={cr.id} disabled={disabled}>{cr.name}{disabled && !isKidsMode ? ` (${cr.tier.toUpperCase()})` : ''}</option>
                        })}
                    </select>
                </div>
                 <div>
                    <label htmlFor="pacing" className="block text-sm font-medium text-text-secondary">Ritmo</label>
                    <select id="pacing" value={params.pacing} onChange={e => handleParamChange('pacing', e.target.value as Pacing)} className="mt-1 block w-full bg-brand-bg border border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                        {pacings.map(p => <option key={p}>{p}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="complexity" className="block text-sm font-medium text-text-secondary">Complejidad</label>
                    <div className="flex items-center gap-4 mt-1">
                        <select id="complexity" value={params.complexity} onChange={e => handleParamChange('complexity', e.target.value as Complexity)} className="block w-full bg-brand-bg border border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-surface-light" disabled={!isProOrHigher}>
                            {complexities.map(c => <option key={c} disabled={c === 'Alta' && !isProOrHigher}>{c}</option>)}
                        </select>
                        {!isProOrHigher && <ProBadge tierName='PRO' isLocked />}
                    </div>
                </div>
                <div className="md:col-span-2">
                    <label htmlFor="chapterLength" className="block text-sm font-medium text-text-secondary">Longitud Capítulos</label>
                     <div className="flex items-center gap-4 mt-1">
                        <select id="chapterLength" value={params.chapterLength} onChange={e => handleParamChange('chapterLength', e.target.value as ChapterLength)} className="block w-full bg-brand-bg border border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-surface-light" disabled={!isEssentialsOrHigher}>
                             {chapterLengths.map(l => <option key={l} disabled={l === 'Larga (~2500 palabras)' && !isEssentialsOrHigher}>{l}</option>)}
                        </select>
                         {!isEssentialsOrHigher && <ProBadge tierName='ESSENTIALS' isLocked />}
                    </div>
                </div>
                <div className="md:col-span-2">
                    <label htmlFor="chapters" className="block text-sm font-medium text-text-secondary">Número de Capítulos: {params.chapters}</label>
                    <input type="range" id="chapters" min="1" max={maxChapters} value={params.chapters} onChange={e => handleParamChange('chapters', parseInt(e.target.value))} className="w-full h-2 bg-border-color rounded-lg appearance-none cursor-pointer accent-primary" />
                </div>
            </div>
            
            <div className="mt-6 space-y-4">
                 <div className="p-4 rounded-md bg-brand-bg border border-border-color">
                    <label className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input type="checkbox" checked={params.generateIllustrations} onChange={e => handleParamChange('generateIllustrations', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50" disabled={!isProOrHigher} />
                            <span className={`ml-3 text-sm ${!isProOrHigher ? 'text-text-secondary' : 'text-text-main'}`}>Generar una ilustración por capítulo</span>
                        </div>
                        {!isProOrHigher && <ProBadge tierName='PRO' isLocked />}
                    </label>
                </div>
                <div className="p-4 rounded-md bg-brand-bg border border-border-color">
                     <label className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input type="checkbox" checked={params.enableBranching} onChange={e => handleParamChange('enableBranching', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50" disabled={!isProOrHigher}/>
                            <span className={`ml-3 text-sm ${!isProOrHigher ? 'text-text-secondary' : 'text-text-main'}`}>Activar historia interactiva (experimental)</span>
                        </div>
                        {!isProOrHigher && <ProBadge tierName='PRO' isLocked />}
                    </label>
                </div>
            </div>
        </Section>
        
        <div className="pt-5">
            <div className="flex justify-end">
                <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-3 ml-3 inline-flex justify-center py-3 px-4 border border-transparent shadow-sm text-sm font-bold rounded-md text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50">
                    {isLoading ? <Icon name="loader" className="animate-spin" /> : <Icon name="wand"/>}
                    {isLoading ? 'Generando...' : 'Generar Capítulo Piloto'}
                </button>
            </div>
        </div>
      </form>
    </div>
  );
}