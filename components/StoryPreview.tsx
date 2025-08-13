import React, { useState, useEffect, useRef } from 'react';
import type { Story, Character } from '../types';
import { Icon } from './Icon';

interface StoryPreviewProps {
  story: Story;
  onBack: () => void;
  onStartReading: () => void;
}

const StarRating: React.FC<{ rating: number, size?: 'sm' | 'lg' }> = ({ rating, size = 'lg' }) => {
    const starSize = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
    return (
        <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
                <Icon
                    key={i}
                    name="star"
                    className={`${starSize} ${rating >= i + 1 ? 'text-yellow-400 fill-current' : 'text-gray-600'}`}
                />
            ))}
        </div>
    );
};

const CharacterCard: React.FC<{char: Character}> = ({char}) => (
    <div className="p-3 bg-surface/50 rounded-lg flex items-start gap-4 hover:bg-surface/80 transition-colors duration-200 backdrop-blur-sm border border-white/10">
        {char.portraitUrl && <img src={char.portraitUrl} alt={char.name} className="w-16 h-16 rounded-md object-cover flex-shrink-0 bg-surface-light shadow-md" />}
        <div className="min-w-0">
            <h4 className="font-bold text-text-main truncate">{char.name}</h4>
            <p className="text-xs text-primary-hover capitalize font-semibold">{char.role}</p>
            <p className="text-sm text-text-secondary mt-1 line-clamp-2">{char.description}</p>
        </div>
    </div>
);

export const StoryPreview: React.FC<StoryPreviewProps> = ({ story, onBack, onStartReading }) => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
        if(containerRef.current) {
            setScrollPosition(containerRef.current.scrollTop);
        }
    };
    const currentRef = containerRef.current;
    currentRef?.addEventListener('scroll', handleScroll);
    return () => currentRef?.removeEventListener('scroll', handleScroll);
  }, []);

  const parallaxStyle = {
    transform: `translateY(${scrollPosition * 0.3}px)`,
  };

  return (
    <div className="relative min-h-screen bg-brand-bg">
        {/* Background Image */}
        <div 
          className="fixed inset-0 bg-cover bg-center transition-opacity duration-500"
          style={{ backgroundImage: `url(${story.coverUrl})`, opacity: 0.3 }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-brand-bg/95 via-brand-bg/80 to-brand-bg"></div>
        </div>

      <div ref={containerRef} className="relative z-10 max-w-7xl mx-auto p-4 sm:p-8 h-screen overflow-y-auto">
        <button onClick={onBack} className="flex items-center text-sm text-primary hover:text-primary-hover mb-6 backdrop-blur-sm p-2 rounded-md bg-black/10">
            <Icon name="arrow-left" className="w-4 h-4 mr-2"/>
            Volver a la Biblioteca
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Cover and basic info */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-8 self-start" style={parallaxStyle}>
              <div className="relative group shadow-2xl shadow-primary/20 rounded-xl overflow-hidden">
                  <img src={story.coverUrl} alt={`Cover for ${story.title}`} className="w-full h-auto object-cover rounded-xl transition-transform duration-500 group-hover:scale-105" />
                  {story.animatedCoverUrl && <video src={story.animatedCoverUrl} autoPlay loop muted className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"/>}
                  <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 rounded-full text-xs font-bold backdrop-blur-sm">{story.weaverAgeRating || story.ageRating}</div>
              </div>
              <button onClick={onStartReading} className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover transition-transform duration-200 hover:scale-105 shadow-lg flex items-center justify-center gap-2">
                  <Icon name="book-open" className="w-5 h-5" />
                  Empezar a Leer
              </button>
              <div className="p-4 bg-surface/50 backdrop-blur-md rounded-lg border border-white/10">
                  <h3 className="font-semibold text-text-secondary mb-3 text-lg border-b border-white/10 pb-2">Estadísticas</h3>
                  <ul className="text-sm space-y-2">
                      <li className="flex justify-between items-center"><span><Icon name="users" className="w-4 h-4 inline mr-2 text-primary" /> Lectores Activos:</span> <span className="font-bold text-lg">{story.socialStats?.activeReaders || 0}</span></li>
                      <li className="flex justify-between items-center"><span><Icon name="message-square" className="w-4 h-4 inline mr-2 text-primary" /> Reseñas:</span> <span className="font-bold text-lg">{story.socialStats?.featuredReviews?.length || 0}</span></li>
                      <li className="flex justify-between items-center"><span><Icon name="library" className="w-4 h-4 inline mr-2 text-primary" /> Capítulos:</span> <span className="font-bold text-lg">{story.chapters.length}</span></li>
                      <li className="flex justify-between items-center"><span><Icon name="clock" className="w-4 h-4 inline mr-2 text-primary" /> Tiempo de lectura:</span> <span className="font-bold text-lg">~{story.readingTimeMinutes} min</span></li>
                  </ul>
              </div>
          </div>

          {/* Right Column: Title, Synopsis, Metadata */}
          <div className="lg:col-span-8">
              <div className="p-6 bg-surface/50 backdrop-blur-md rounded-lg border border-white/10">
                <h1 className="text-4xl lg:text-5xl font-bold text-text-main font-serif">{story.title}</h1>
                <div className="flex items-center gap-4 my-4 pb-4 border-b border-white/10">
                    {story.starRating && <StarRating rating={story.starRating} />}
                    <div className="flex flex-wrap gap-2">
                        {story.params.genres.map(genre => (
                            <span key={genre} className="text-xs bg-surface text-text-secondary px-3 py-1 rounded-full">{genre}</span>
                        ))}
                    </div>
                </div>

                <div className="prose prose-invert max-w-none prose-headings:text-primary prose-headings:font-serif">
                    <p className="text-lg italic text-text-secondary">{story.whatToExpect || 'Una aventura emocionante te espera.'}</p>
                    
                    <h2>Sinopsis</h2>
                    <p className="text-text-secondary">{story.summary}</p>
                    
                    {story.authorTrivia && (
                        <>
                            <h2>Curiosidades del Autor</h2>
                            <blockquote className="border-l-primary">{story.authorTrivia}</blockquote>
                        </>
                    )}

                    <h2>Personajes Principales</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose">
                      {story.params.characters.map(char => (
                        <CharacterCard key={char.id} char={char} />
                      ))}
                    </div>

                    <h2>Capítulos</h2>
                    <ul className="space-y-1 not-prose bg-surface/50 p-2 rounded-lg border border-white/10 max-h-96 overflow-y-auto">
                        {story.chapters.map((chap, index) => (
                            <li key={chap.id} className="text-sm p-3 rounded-md hover:bg-surface-light transition-colors duration-200">
                                <p className="font-semibold truncate pr-4 text-text-main flex items-center">
                                    <span className="text-primary mr-3">{index + 1}.</span>
                                    {chap.title}
                                </p>
                                {chap.microSummary && <p className="text-xs text-text-secondary pl-8 italic truncate">{chap.microSummary}</p>}
                            </li>
                        ))}
                    </ul>
                    
                    {story.interactiveMapUrl && (
                        <>
                            <h2>Mapa del Mundo</h2>
                            <img src={story.interactiveMapUrl} alt="Mapa del mundo" className="rounded-lg border border-border-color" />
                        </>
                    )}
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};