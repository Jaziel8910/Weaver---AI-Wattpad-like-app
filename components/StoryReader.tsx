import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Story, ReaderTheme, ReaderFont, Chapter, UserTier, ReaderDefaultSettings, Note } from '../types';
import { Icon, IconProps } from './Icon';
import jsPDF from 'jspdf';
import { ProBadge } from './ProBadge';

interface StoryReaderProps {
  story: Story;
  onBack: () => void;
  onUpdateStory: (updatedStory: Story) => void;
  readerDefaults: ReaderDefaultSettings;
  onReaderDefaultsChange: (settings: ReaderDefaultSettings) => void;
  effectiveTier: UserTier;
  onUpdateLastRead: (storyId: string, chapterId: string, scrollPosition: number) => void;
  onCritiqueChapter: (chapterId: string) => void;
  isKidsMode: boolean;
}

const ReaderSettings: React.FC<{
    settings: ReaderDefaultSettings;
    onSettingsChange: (settings: ReaderDefaultSettings) => void;
    isProOrHigher: boolean;
}> = ({ settings, onSettingsChange, isProOrHigher }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-full hover:bg-surface-light transition-colors">
                <Icon name="settings" className="w-5 h-5" />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-surface rounded-lg shadow-xl z-20 p-4 border border-border-color animate-palette-enter">
                    <div className="space-y-4">
                        <div>
                           <label className="text-sm font-medium text-text-secondary">Tema</label>
                            <div className="mt-2 grid grid-cols-5 gap-1">
                                {(['light', 'sepia', 'dark', 'high-contrast'] as ReaderTheme[]).map(theme => (
                                    <button 
                                      key={theme} 
                                      onClick={() => onSettingsChange({...settings, theme})} 
                                      className={`w-full h-8 rounded border-2 capitalize ${settings.theme === theme ? 'border-primary' : 'border-transparent'} 
                                        ${theme === 'light' ? 'bg-white' : theme === 'sepia' ? 'bg-sepia-bg' : theme === 'dark' ? 'bg-brand-bg' : theme === 'high-contrast' ? 'bg-high-contrast-bg' : ''}`}
                                      aria-label={`Set theme to ${theme}`}
                                     ></button>
                                ))}
                                 <button 
                                      key='neon-noir'
                                      onClick={() => isProOrHigher && onSettingsChange({...settings, theme: 'neon-noir'})} 
                                      className={`relative w-full h-8 rounded border-2 capitalize bg-neon-noir-bg ${settings.theme === 'neon-noir' ? 'border-primary' : 'border-transparent'} ${!isProOrHigher ? 'cursor-not-allowed' : ''}`}
                                      aria-label={`Set theme to neon-noir`}
                                      disabled={!isProOrHigher}
                                     >
                                        {!isProOrHigher && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><ProBadge compact={true} /></div>}
                                     </button>
                            </div>
                        </div>
                         <div>
                           <label className="text-sm font-medium text-text-secondary">Fuente</label>
                           <div className="mt-2 grid grid-cols-3 gap-2">
                                <button onClick={() => onSettingsChange({...settings, font: 'sans'})} className={`py-1 rounded ${settings.font === 'sans' ? 'bg-primary text-white' : 'bg-surface-light'}`}>Sans</button>
                                <button onClick={() => onSettingsChange({...settings, font: 'serif'})} className={`py-1 rounded font-serif ${settings.font === 'serif' ? 'bg-primary text-white' : 'bg-surface-light'}`}>Serif</button>
                                <button onClick={() => onSettingsChange({...settings, font: 'dyslexic'})} className={`py-1 rounded font-dyslexic ${settings.font === 'dyslexic' ? 'bg-primary text-white' : 'bg-surface-light'}`}>OpenDyslexic</button>
                           </div>
                        </div>
                        <div>
                           <label className="text-sm font-medium text-text-secondary">Tamaño de Fuente</label>
                           <div className="flex items-center gap-2 mt-2">
                            <span className="text-sm">A</span>
                             <input 
                                type="range" 
                                min="14" max="24" step="1" 
                                value={settings.fontSize}
                                onChange={e => onSettingsChange({...settings, fontSize: parseInt(e.target.value)})}
                                className="w-full h-2 bg-border-color rounded-lg appearance-none cursor-pointer accent-primary"
                             />
                             <span className="text-xl">A</span>
                           </div>
                        </div>
                         <div className="border-t border-border-color pt-3">
                            <label className="flex items-center justify-between">
                                 <span className="text-sm font-medium text-text-secondary">Lectura Biónica</span>
                                 <input type="checkbox" checked={settings.enableBionicReading} onChange={e => onSettingsChange({...settings, enableBionicReading: e.target.checked})} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                            </label>
                         </div>
                    </div>
                </div>
            )}
        </div>
    )
}

const TTSControls: React.FC<{ chapterText: string; isEnabled: boolean }> = ({ chapterText, isEnabled }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        const loadVoices = () => {
            setVoices(speechSynthesis.getVoices());
        };
        loadVoices();
        speechSynthesis.onvoiceschanged = loadVoices;

        if (!isEnabled) {
            speechSynthesis.cancel();
            setIsPlaying(false);
        }
        return () => {
            speechSynthesis.cancel();
        };
    }, [isEnabled, chapterText]);

    const handlePlay = () => {
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }
        utteranceRef.current = new SpeechSynthesisUtterance(chapterText);
        utteranceRef.current.onend = () => setIsPlaying(false);
        // Simple voice selection for demo
        const spanishVoice = voices.find(v => v.lang.startsWith('es'));
        if (spanishVoice) utteranceRef.current.voice = spanishVoice;

        speechSynthesis.speak(utteranceRef.current);
        setIsPlaying(true);
    };

    const handlePause = () => {
        speechSynthesis.pause();
        setIsPlaying(false);
    };

    const handleStop = () => {
        speechSynthesis.cancel();
        setIsPlaying(false);
    };
    
    if (!isEnabled) return null;

    return (
        <div className="flex items-center gap-2">
            <button onClick={isPlaying ? handlePause : handlePlay} className="p-2 rounded-full hover:bg-surface-light transition-colors" title={isPlaying ? "Pausar" : "Leer en voz alta"}>
                <Icon name={isPlaying ? 'pause' : 'play'} className="w-5 h-5" />
            </button>
            <button onClick={handleStop} disabled={!isPlaying && !speechSynthesis.speaking} className="p-2 rounded-full hover:bg-surface-light transition-colors disabled:opacity-50" title="Detener">
                <Icon name="stop-circle" className="w-5 h-5" />
            </button>
        </div>
    )
}

const bionicReadingTransform = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const processNode = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent) {
            const newContent = document.createDocumentFragment();
            const words = node.textContent.split(/(\s+)/);
            words.forEach(word => {
                if (/\S/.test(word)) {
                    const boldLength = Math.ceil(word.length / 2);
                    const b = document.createElement('b');
                    b.textContent = word.substring(0, boldLength);
                    newContent.appendChild(b);
                    newContent.appendChild(document.createTextNode(word.substring(boldLength)));
                } else {
                    newContent.appendChild(document.createTextNode(word));
                }
            });
            node.parentNode?.replaceChild(newContent, node);
        } else {
            node.childNodes.forEach(processNode);
        }
    };

    processNode(tempDiv);
    return tempDiv.innerHTML;
};

const MiniHud: React.FC<{ onTogglePanel: (panel: 'notes' | 'glossary') => void }> = ({ onTogglePanel }) => (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-30 bg-surface/80 backdrop-blur-md rounded-full p-2 flex flex-col gap-3 border border-border-color shadow-lg">
        <button onClick={() => onTogglePanel('notes')} className="p-2 hover:text-primary rounded-full transition-colors" title="Notas"><Icon name="message-square" className="w-5 h-5"/></button>
        <button className="p-2 hover:text-primary rounded-full transition-colors" title="Marcadores"><Icon name="tag" className="w-5 h-5"/></button>
        <button onClick={() => onTogglePanel('glossary')} className="p-2 hover:text-primary rounded-full transition-colors" title="Glosario"><Icon name="book-text" className="w-5 h-5"/></button>
    </div>
);

const SidePanel: React.FC<{title: string; icon: IconProps['name']; onClose: () => void; children: React.ReactNode}> = ({title, icon, onClose, children}) => (
     <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex justify-end animate-palette-enter" onClick={onClose}>
         <div className="w-full max-w-md h-full bg-surface p-6 overflow-y-auto shadow-2xl animate-slide-in-right" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-4 pb-4 border-b border-border-color">
                 <h3 className="text-xl font-bold text-primary flex items-center gap-2"><Icon name={icon} className="w-6 h-6"/>{title}</h3>
                 <button onClick={onClose} className="p-1 rounded-full hover:bg-surface-light"><Icon name="x-circle" className="w-6 h-6" /></button>
             </div>
             {children}
         </div>
     </div>
);


export const StoryReader: React.FC<StoryReaderProps> = ({ story, onBack, onUpdateStory, readerDefaults, onReaderDefaultsChange, effectiveTier, onUpdateLastRead, onCritiqueChapter, isKidsMode }) => {
  const [currentChapterId, setCurrentChapterId] = useState(story.chapterHistory[story.chapterHistory.length - 1]);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<'critique' | 'notes' | 'glossary' | null>(null);
  const [showBreakModal, setShowBreakModal] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<number | null>(null);
  
  const isEssentialsOrHigher = effectiveTier !== 'free';
  const isProOrHigher = effectiveTier === 'pro' || effectiveTier === 'ultra';
  
  const themeClasses = {
    dark: 'bg-brand-bg text-text-main',
    light: 'bg-white text-gray-800',
    sepia: 'bg-sepia-bg text-sepia-text',
    'high-contrast': 'bg-high-contrast-bg text-high-contrast-text',
    'neon-noir': 'bg-neon-noir-bg text-neon-noir-text',
    'solarized': '', // Managed by root variables
    'dracula': '', // Managed by root variables
  };
  
  const fontClasses = {
      sans: 'font-sans',
      serif: 'font-serif',
      dyslexic: 'font-dyslexic'
  }

  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = window.setTimeout(() => {
      if (containerRef.current) {
        onUpdateLastRead(story.id, currentChapterId, containerRef.current.scrollTop);
      }
    }, 500);
  }, [story.id, currentChapterId, onUpdateLastRead]);

  useEffect(() => {
    const currentRef = containerRef.current;
    if (currentRef) {
        currentRef.addEventListener('scroll', handleScroll);
        return () => currentRef.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);
  
  useEffect(() => {
    setCurrentChapterId(story.chapterHistory[story.chapterHistory.length - 1]);
    const lastReadPosition = (story.id === story.chapterHistory[0] && story.chapterHistory.length === 1 && story.id === currentChapterId)
        ? (story.params as any).lastRead?.scrollPosition || 0
        : 0;

    setTimeout(() => {
        containerRef.current?.scrollTo({top: lastReadPosition, behavior: 'smooth'});
    }, 100);
  }, [story.id, story.chapterHistory]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsFocusMode(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isKidsMode) {
        const breakTimer = setTimeout(() => {
            setShowBreakModal(true);
        }, 20 * 60 * 1000); // 20 minutes

        return () => {
            clearTimeout(breakTimer);
        }
    }
}, [isKidsMode, currentChapterId]);


  const currentChapter = useMemo(() => story.chapters.find(c => c.id === currentChapterId), [story.chapters, currentChapterId]);

  if (!currentChapter) {
    return <div>Error: Capítulo no encontrado.</div>
  }

  const handleChapterSelection = (id: string) => {
    const historyIndex = story.chapterHistory.indexOf(id);
    if(historyIndex !== -1) {
        const newHistory = story.chapterHistory.slice(0, historyIndex + 1);
        onUpdateStory({ ...story, chapterHistory: newHistory });
    }
  };
  
  const handleOptionClick = (nextChapterId: string) => {
    const newHistory = [...story.chapterHistory, nextChapterId];
    onUpdateStory({ ...story, chapterHistory: newHistory });
  };
  
  const handleStartEdit = (chapter: Chapter) => {
      if(!isEssentialsOrHigher) return;
      setEditingChapterId(chapter.id);
      setEditedContent(chapter.content);
  }

  const handleSaveEdit = () => {
      if (!editingChapterId) return;
      const updatedChapters = story.chapters.map(c => c.id === editingChapterId ? {...c, content: editedContent} : c);
      onUpdateStory({...story, chapters: updatedChapters});
      setEditingChapterId(null);
  }

  const handleExport = (format: 'txt' | 'pdf') => {
    setIsExportMenuOpen(false);
    if(format === 'txt' && isEssentialsOrHigher){
        let textContent = `Title: ${story.title}\n\nSummary: ${story.summary}\n\n----------------------------------------\n\n`;
        story.chapters.forEach((chapter, index) => {
            textContent += `Chapter ${index + 1}: ${chapter.title}\n\n${chapter.content}\n\n----------------------------------------\n\n`;
        });
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${story.title.replace(/ /g, '_')}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    } else if (format === 'pdf' && isProOrHigher) {
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text(story.title, 10, 20);
        doc.setFontSize(12);
        doc.text(`Summary: ${story.summary}`, 10, 30, { maxWidth: 180 });

        let y = 50;
        story.chapters.forEach((chapter, index) => {
            if (y > 250) {
              doc.addPage();
              y = 20;
            }
            doc.setFontSize(16);
            doc.text(`Chapter ${index + 1}: ${chapter.title}`, 10, y);
            y += 10;
            doc.setFontSize(12);
            const splitContent = doc.splitTextToSize(chapter.content, 180);
            doc.text(splitContent, 10, y);
            y += (splitContent.length * 5) + 10;
        });

        doc.save(`${story.title.replace(/ /g, '_')}.pdf`);
    }
  };

  const mainContent = (
    <>
      <div ref={containerRef} className="h-full overflow-y-auto" key={currentChapterId}>
            {currentChapter.illustrationUrl && !isFocusMode && (
                <div className="mb-8 rounded-lg overflow-hidden shadow-lg">
                    <img src={currentChapter.illustrationUrl} alt={`Illustration for ${currentChapter.title}`} className="w-full h-auto object-cover" />
                </div>
            )}
            <div className={`bg-opacity-50 rounded-lg p-6 md:p-10 ${readerDefaults.theme === 'dark' ? 'bg-surface' : readerDefaults.theme === 'high-contrast' ? 'bg-high-contrast-surface' : readerDefaults.theme === 'neon-noir' ? 'bg-neon-noir-surface/50' : 'bg-transparent'}`}>
                <div className="flex justify-between items-start">
                  <h2 className={`text-3xl font-bold mb-6 font-serif ${readerDefaults.theme === 'high-contrast' ? 'text-high-contrast-primary' : readerDefaults.theme === 'neon-noir' ? 'text-neon-noir-primary' : 'text-primary'}`}>{currentChapter.title}</h2>
                  {!isFocusMode && (
                    <div className="relative">
                      <button onClick={() => handleStartEdit(currentChapter)} className="p-2 rounded-full hover:bg-surface-light -mt-2 disabled:cursor-not-allowed disabled:opacity-50" disabled={!isEssentialsOrHigher}>
                          <Icon name="edit" className="w-4 h-4" />
                      </button>
                      {!isEssentialsOrHigher && (
                         <div className="absolute inset-0 bg-surface/50 backdrop-blur-sm flex items-center justify-center rounded-full z-10">
                           <ProBadge tierName='ESSENTIALS' compact={true}/>
                         </div>
                      )}
                    </div>
                  )}
                </div>
                {editingChapterId === currentChapter.id ? (
                    <div>
                        <textarea 
                            value={editedContent}
                            onChange={e => setEditedContent(e.target.value)}
                            className="w-full h-96 bg-surface-light border border-border-color rounded-md p-2 text-text-main"
                        />
                        <div className="flex gap-2 mt-2">
                            <button onClick={handleSaveEdit} className="px-4 py-1 bg-primary text-white rounded">Guardar</button>
                            <button onClick={() => setEditingChapterId(null)} className="px-4 py-1 bg-surface-light rounded">Cancelar</button>
                        </div>
                    </div>
                ) : (
                    <div 
                        className={`prose max-w-none ${readerDefaults.theme !== 'dark' ? '' : 'prose-invert'} ${readerDefaults.font === 'serif' ? 'font-serif' : readerDefaults.font === 'dyslexic' ? 'font-dyslexic' : 'font-sans'} ${readerDefaults.enableBionicReading ? 'bionic-reading' : ''}`}
                        style={{ 
                            fontSize: `${readerDefaults.fontSize}px`,
                            lineHeight: readerDefaults.lineHeight,
                            textAlign: readerDefaults.justifyText ? 'justify' : 'left',
                         }}
                        dangerouslySetInnerHTML={{ __html: readerDefaults.enableBionicReading ? bionicReadingTransform(currentChapter.content.replace(/\n/g, '<br />')) : currentChapter.content.replace(/\n/g, '<br />') }}
                    />
                )}

                {currentChapter.options && !editingChapterId && (
                    <div className="mt-10 pt-6 border-t border-border-color space-y-3">
                        <p className="font-semibold text-center">¿Qué sucede a continuación?</p>
                        {currentChapter.options.map((option, i) => (
                           <button key={i} onClick={() => handleOptionClick(option.nextChapterId)} className="block w-full text-left p-4 bg-surface hover:bg-primary transition-colors rounded-lg">
                               {option.text}
                           </button>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {!isFocusMode && (
           <nav className="mt-12 flex justify-between items-center">
                <button
                    onClick={() => handleChapterSelection(story.chapterHistory[story.chapterHistory.indexOf(currentChapterId) - 1])}
                    disabled={story.chapterHistory.indexOf(currentChapterId) === 0}
                    className="py-2 px-4 bg-surface rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary transition-colors text-text-main"
                >
                    Anterior
                </button>
                <select 
                    value={currentChapterId}
                    onChange={e => handleChapterSelection(e.target.value)}
                    className="py-2 px-4 bg-surface border border-border-color rounded-md text-text-secondary focus:ring-primary focus:border-primary"
                >
                    {story.chapterHistory.map((chapId, index) => {
                        const chap = story.chapters.find(c => c.id === chapId);
                        return chap && <option key={chapId} value={chapId}>Capítulo {index + 1}: {chap.title}</option>
                    })}
                </select>
                <button
                    onClick={() => handleChapterSelection(story.chapterHistory[story.chapterHistory.indexOf(currentChapterId) + 1])}
                    disabled={story.chapterHistory.indexOf(currentChapterId) === story.chapterHistory.length - 1 || !!currentChapter.options}
                    className="py-2 px-4 bg-surface rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary transition-colors text-text-main"
                >
                    Siguiente
                </button>
            </nav>
        )}
    </>
  );
  
  const renderCritiquePanel = () => {
      const critique = currentChapter.critique;
      if (!critique) return <p className="text-text-secondary">No hay análisis para este capítulo. Haz clic en el botón "Doctor IA" para generar uno.</p>;
      
      const categoryOrder = ['pacing', 'dialogue', 'description', 'consistency'];

      return (
          <div className="space-y-4">
              <p className="italic text-text-secondary">{critique.overall.comment || "Análisis general del capítulo."}</p>
              {categoryOrder.map(catKey => {
                  const catData = critique[catKey];
                  if (!catData) return null;
                  const scoreColor = catData.score < 5 ? 'text-red-400' : catData.score < 8 ? 'text-yellow-400' : 'text-green-400';
                  return (
                      <div key={catKey}>
                          <h4 className="font-semibold text-text-main capitalize flex justify-between items-center">{catKey} <span className={`font-bold text-lg ${scoreColor}`}>{catData.score}/10</span></h4>
                          <p className="text-sm text-text-secondary">{catData.comment}</p>
                          <p className="text-sm text-primary-hover mt-1 pl-2 border-l-2 border-primary"><b>Sugerencia:</b> {catData.suggestion}</p>
                      </div>
                  )
              })}
          </div>
      );
  }

    const renderNotesPanel = () => {
        const notes = currentChapter.notes || [];
        return (
            <div>
                <h4 className="font-semibold mb-2">Tus Notas</h4>
                {/* Placeholder for note creation UI */}
                <div className="space-y-3">
                    {notes.filter(n => n.authorId === 'current_user_id').map((note, i) => (
                        <div key={i} className="p-2 bg-brand-bg rounded">
                            <p className="text-sm">{note.content}</p>
                        </div>
                    ))}
                </div>
                 <h4 className="font-semibold my-4">Notas Públicas</h4>
                 {/* Placeholder for public notes */}
                 <p className="text-sm text-text-secondary">Aún no hay notas públicas para este capítulo.</p>
            </div>
        );
    }
    
    const renderGlossaryPanel = () => {
        const glossary = story.glossary || [];
        if (glossary.length === 0) {
            return <p className="text-text-secondary">No hay entradas en el glosario para esta historia.</p>;
        }
        return (
            <div className="space-y-3">
                {glossary.map((entry, i) => (
                    <div key={i} className="p-2 bg-brand-bg rounded">
                        <p className="font-bold text-text-main">{entry.term}</p>
                        <p className="text-sm text-text-secondary">{entry.definition}</p>
                    </div>
                ))}
            </div>
        );
    }

    const renderActivePanel = () => {
        if (!activePanel) return null;
        let title = '';
        let icon: IconProps['name'] = 'info';
        let content: React.ReactNode = null;

        switch(activePanel) {
            case 'critique':
                title = "Análisis del Doctor IA";
                icon = 'brain-circuit';
                content = renderCritiquePanel();
                break;
            case 'notes':
                title = "Notas";
                icon = 'message-square';
                content = renderNotesPanel();
                break;
            case 'glossary':
                title = "Glosario";
                icon = 'book-text';
                content = renderGlossaryPanel();
                break;
        }

        return <SidePanel title={title} icon={icon} onClose={() => setActivePanel(null)}>{content}</SidePanel>;
    }


  return (
    <div className={`transition-colors duration-300 ${themeClasses[readerDefaults.theme]} ${fontClasses[readerDefaults.font]} ${isFocusMode ? 'focus-mode' : ''}`}>
      {showBreakModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-surface rounded-lg p-6 text-center max-w-sm animate-palette-enter">
                <Icon name="clock" className="w-12 h-12 mx-auto text-primary mb-4" />
                <h3 className="text-xl font-bold">¡Hora de un descanso!</h3>
                <p className="text-text-secondary my-4">Has estado leyendo un buen rato. ¿Por qué no descansas la vista 5 minutos?</p>
                <button onClick={() => setShowBreakModal(false)} className="px-6 py-2 bg-primary text-white font-bold rounded-lg">¡Vale!</button>
            </div>
        </div>
      )}
      {readerDefaults.showMiniHud && !isFocusMode && <MiniHud onTogglePanel={setActivePanel} />}
      <div className="max-w-4xl mx-auto px-4 py-8 min-h-screen">
       {!isFocusMode && (
        <div className="flex justify-between items-center mb-8">
            <button
                onClick={onBack}
                className="flex items-center text-primary hover:text-primary-hover transition-colors"
            >
                <Icon name="arrow-left" className="w-5 h-5 mr-2" />
                Volver
            </button>
            <div className="flex items-center gap-2">
                <TTSControls chapterText={currentChapter.title + '.\n' + currentChapter.content} isEnabled={true} />
                 <div className="relative">
                    <button onClick={() => { onCritiqueChapter(currentChapter.id); setActivePanel('critique'); }} className="p-2 rounded-full hover:bg-surface-light transition-colors relative disabled:opacity-50 disabled:cursor-not-allowed" title="Doctor IA" disabled={!isProOrHigher}>
                        <Icon name="brain-circuit" className="w-5 h-5" />
                         {!isProOrHigher && <div className="absolute -top-1 -right-1"><ProBadge compact={true} /></div>}
                    </button>
                </div>
                <div className="relative">
                    <button onClick={() => setIsExportMenuOpen(o => !o)} className="p-2 rounded-full hover:bg-surface-light transition-colors" title="Exportar">
                        <Icon name="download" className="w-5 h-5" />
                    </button>
                    {isExportMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-surface rounded-lg shadow-xl z-20 border border-border-color">
                            <button onClick={() => handleExport('txt')} className="block w-full text-left px-4 py-2 text-sm hover:bg-surface-light disabled:text-text-secondary disabled:cursor-not-allowed relative" disabled={!isEssentialsOrHigher}>
                                Como TXT
                                {!isEssentialsOrHigher && <span className="absolute right-2 top-1/2 -translate-y-1/2"><ProBadge tierName="ESSENTIALS" compact={true} /></span>}
                            </button>
                            <button onClick={() => handleExport('pdf')} className="block w-full text-left px-4 py-2 text-sm hover:bg-surface-light disabled:text-text-secondary disabled:cursor-not-allowed relative" disabled={!isProOrHigher}>
                                Como PDF
                                {!isProOrHigher && <span className="absolute right-2 top-1/2 -translate-y-1/2"><ProBadge compact={true} /></span>}
                            </button>
                        </div>
                    )}
                </div>
                <button onClick={() => setIsFocusMode(true)} className="p-2 rounded-full hover:bg-surface-light transition-colors" title="Modo Foco">
                    <Icon name="maximize" className="w-5 h-5" />
                </button>
                <ReaderSettings settings={readerDefaults} onSettingsChange={onReaderDefaultsChange} isProOrHigher={isProOrHigher}/>
            </div>
        </div>
        )}

        {isFocusMode && (
             <button onClick={() => setIsFocusMode(false)} className="fixed top-4 right-4 z-50 p-2 rounded-full bg-surface/50 hover:bg-surface" title="Salir de Modo Foco">
                <Icon name="minimize" className="w-5 h-5" />
            </button>
        )}
        
        {renderActivePanel()}


        <header className={`text-center mb-12 ${isFocusMode ? 'hidden' : ''}`}>
            <h1 className={`text-4xl md:text-5xl font-bold font-serif ${readerDefaults.theme === 'high-contrast' ? 'text-high-contrast-primary' : readerDefaults.theme === 'neon-noir' ? 'text-neon-noir-primary' : ''} ${readerDefaults.theme === 'dark' ? 'text-text-main' : ''}`}>{story.title}</h1>
            <p className={`mt-2 ${readerDefaults.theme === 'dark' ? 'text-text-secondary' : readerDefaults.theme === 'neon-noir' ? 'text-neon-noir-text/70' : 'text-gray-500'}`}>
                {story.params.storyType === 'Fanfiction' ? `del fandom de ${story.params.fandom}` : 'Una historia original'}
            </p>
        </header>

       {mainContent}
      </div>
    </div>
  );
};