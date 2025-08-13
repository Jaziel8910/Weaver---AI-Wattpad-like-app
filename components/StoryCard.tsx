import React, { useRef, useEffect, useState } from 'react';
import type { Story } from '../types';
import { Icon } from './Icon';

interface StoryCardProps {
  story: Story;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
  reduceAnimations: boolean;
}

const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
    <div className="flex items-center">
        {[...Array(5)].map((_, i) => {
            const starValue = i + 1;
            return <Icon key={i} name="star" className={`w-3 h-3 ${rating >= starValue ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} />;
        })}
    </div>
);


export const StoryCard: React.FC<StoryCardProps> = ({ story, onSelect, onDelete, onEdit, reduceAnimations }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [transformStyle, setTransformStyle] = useState({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '0px 0px 100px 0px', // Pre-load images 100px before they enter viewport
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduceAnimations || !cardRef.current) return;
    const { left, top, width, height } = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;

    const rotateX = -y * 10;
    const rotateY = x * 10;
    const translateX = x * 5;
    const translateY = y * 5;

    setTransformStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateX(${translateX}px) translateY(${translateY}px) scale(1.05)`,
    });
  };

  const handleMouseLeave = () => {
     if (reduceAnimations) return;
    setTransformStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)',
    });
  };
  
  return (
    <div 
      ref={cardRef}
      className="bg-surface rounded-lg shadow-lg overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 group flex flex-col"
      style={!reduceAnimations ? { transition: 'transform 0.1s ease-out' } : {}}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        onClick={onSelect}
        className="relative h-64 bg-surface-light overflow-hidden cursor-pointer"
        style={!reduceAnimations ? { transformStyle: 'preserve-3d', transition: 'transform 0.4s ease-out' } : {}}
      >
        {isVisible && <img src={story.coverUrl} alt={`Cover for ${story.title}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" style={transformStyle} loading="lazy" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{background: 'radial-gradient(circle at center, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 60%)'}}></div>
        {story.isCuratedForKids && (
             <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-green-500/90 rounded-full text-white text-xs font-bold flex items-center gap-1 backdrop-blur-sm shadow-lg" title="Curado para Niños">
                <Icon name="star" className="w-3 h-3 fill-current"/>
                <span>Para Niños</span>
            </div>
        )}
        <div className="absolute top-2 right-2 z-10 flex gap-2">
            <button 
              onClick={onEdit}
              className="p-1.5 bg-black/50 rounded-full text-white/70 hover:text-white hover:bg-primary/80 transition-colors"
              aria-label="Edit story details"
            >
                <Icon name="edit" className="w-4 h-4"/>
            </button>
            <button 
              onClick={onDelete}
              className="p-1.5 bg-black/50 rounded-full text-white/70 hover:text-white hover:bg-red-600/80 transition-colors"
              aria-label="Delete story"
            >
                <Icon name="trash" className="w-4 h-4"/>
            </button>
        </div>
        <div className="absolute bottom-0 left-0 p-4" style={{transform: 'translateZ(20px)'}}>
          <h3 className="text-xl font-bold text-white">{story.title}</h3>
          <p className="text-sm text-text-secondary mt-1">{story.params.storyType === 'Fanfiction' ? story.params.fandom : 'Historia Original'}</p>
        </div>
      </div>
      <div className="p-4 flex-grow flex flex-col bg-surface">
        <div className="flex justify-between items-center mb-2">
            <div className="flex flex-wrap gap-1">
                {story.params.genres.slice(0, 2).map(genre => (
                    <span key={genre} className="text-xs bg-primary/20 text-primary-hover px-2 py-0.5 rounded-full">{genre}</span>
                ))}
            </div>
            {story.weaverAgeRating && <span className="text-xs font-bold border px-1.5 py-0.5 rounded">{story.weaverAgeRating}</span>}
        </div>
        <p className="text-text-secondary text-sm h-16 overflow-hidden text-ellipsis flex-grow">{story.summary}</p>
        <div className="flex flex-wrap gap-1 mt-2">
            {(story.tags || []).slice(0, 4).map(tag => (
                <span key={tag} className="text-xs bg-surface-light text-text-secondary px-2 py-0.5 rounded-full border border-border-color"><Icon name="tag" className="w-3 h-3 inline-block mr-1"/>{tag}</span>
            ))}
        </div>
        <div className="flex justify-between items-center mt-4 text-xs text-text-secondary border-t border-border-color pt-2">
          <span>{story.chapters.length} Capítulos</span>
          {story.starRating && <StarRating rating={story.starRating} />}
          <span>~{story.readingTimeMinutes} min</span>
        </div>
      </div>
    </div>
  );
};