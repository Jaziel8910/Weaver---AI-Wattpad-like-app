import React from 'react';
import type { Story, Character } from '../types';
import { Icon } from './Icon';

interface StoryPreviewProps {
  story: Story;
  onBack: () => void;
  onStartReading: () => void;
}

const StarRating: React.FC<{ rating: number, size?: 'sm' | 'lg' }> = ({ rating, size = 'lg' }) => {
    const starSize = size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';
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
    <div className="p-3 bg-surface rounded-lg flex items-start gap-3">
        {char.portraitUrl && <img src={char.portraitUrl} alt={char.name} className="w-16 h-16 rounded-md object-cover flex-shrink-0 bg-surface-light" />}
        <div className="min-w-0">
            <h4 className="font-bold text-text-main truncate">{char.name} <span className="text-sm font-normal text-text-secondary">({char.age || 'N/A'})</span></h4>
            <p className="text-xs text-text-secondary capitalize">{char.role} - {char.status || 'Estado Desconocido'}</p>
            {char.relationships && char.relationships.length > 0 && (
                 <p className="text-xs text-primary-hover mt-1 italic truncate" title={char.relationships.map(r => `${r.type}: ${r.characterName}`).join(', ')}>
                    Relacionado con {char.relationships[0].characterName}
                </p>
            )}
        </div>
    </div>
);

export const StoryPreview: React.FC<StoryPreviewProps> = ({ story, onBack, onStartReading }) => {
  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8">
      <button onClick={onBack} className="flex items-center text-sm text-primary hover:text-primary-hover mb-6">
          <Icon name="arrow-left" className="w-4 h-4 mr-2"/>
          Volver a la Biblioteca
      </button>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Column: Cover and basic info */}
        <div className="md:col-span-4 space-y-4">
            <div className="relative group">
                <img src={story.coverUrl} alt={`Cover for ${story.title}`} className="w-full h-auto object-cover rounded-lg shadow-2xl shadow-primary/20 transition-transform duration-500 group-hover:scale-105" />
                {story.animatedCoverUrl && <video src={story.animatedCoverUrl} autoPlay loop muted className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"/>}
                 <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded-full text-xs font-bold backdrop-blur-sm">{story.weaverAgeRating || story.ageRating}</div>
            </div>
            <button onClick={onStartReading} className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center gap-2">
                <Icon name="book-open" className="w-5 h-5" />
                Empezar a Leer
            </button>
            <div className="p-4 bg-surface rounded-lg">
                <h3 className="font-semibold text-text-secondary mb-2">Estadísticas</h3>
                <ul className="text-sm space-y-2">
                    <li className="flex justify-between items-center"><span><Icon name="users" className="w-4 h-4 inline mr-1" /> Lectores Activos:</span> <span className="font-medium">{story.socialStats?.activeReaders || 0}</span></li>
                    <li className="flex justify-between items-center"><span><Icon name="message-square" className="w-4 h-4 inline mr-1" /> Reseñas:</span> <span className="font-medium">{story.socialStats?.featuredReviews?.length || 0}</span></li>
                    <li className="flex justify-between items-center"><span><Icon name="library" className="w-4 h-4 inline mr-1" /> Capítulos:</span> <span className="font-medium">{story.chapters.length}</span></li>
                    <li className="flex justify-between items-center"><span><Icon name="clock" className="w-4 h-4 inline mr-1" /> Tiempo de lectura:</span> <span className="font-medium">~{story.readingTimeMinutes} min</span></li>
                </ul>
            </div>
        </div>

        {/* Right Column: Title, Synopsis, Metadata */}
        <div className="md:col-span-8">
            <h1 className="text-4xl lg:text-5xl font-bold text-text-main font-serif">{story.title}</h1>
            <div className="flex items-center gap-4 my-4 pb-4 border-b border-border-color">
                {story.starRating && <StarRating rating={story.starRating} />}
                <div className="flex flex-wrap gap-2">
                    {story.params.genres.map(genre => (
                        <span key={genre} className="text-xs bg-surface-light text-text-secondary px-3 py-1 rounded-full">{genre}</span>
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

                <h2>Personajes</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose">
                  {story.params.characters.map(char => (
                    <CharacterCard key={char.id} char={char} />
                  ))}
                </div>

                <h2>Capítulos</h2>
                <ul className="space-y-2 max-h-60 overflow-y-auto bg-surface p-3 rounded-lg border border-border-color not-prose">
                    {story.chapters.map((chap, index) => (
                        <li key={chap.id} className="text-sm p-2 rounded hover:bg-surface-light">
                            <p className="font-semibold truncate pr-4">{index + 1}. {chap.title}</p>
                            {chap.microSummary && <p className="text-xs text-text-secondary pl-4 italic truncate">{chap.microSummary}</p>}
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
  );
};
