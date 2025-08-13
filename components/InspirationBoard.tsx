
import React, { useState, useEffect } from 'react';
import { generateIllustration } from '../services/geminiService';
import { Icon } from './Icon';
import type { AppSettings, UserTier, OpenLibraryBook } from '../types';
import { ProBadge } from './ProBadge';

interface InspirationBoardProps {
    settings: AppSettings;
    onContinue: (prompt: string) => void;
    effectiveTier: UserTier;
}

export const InspirationBoard: React.FC<InspirationBoardProps> = ({ settings, onContinue, effectiveTier }) => {
    const [prompt, setPrompt] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generations, setGenerations] = useState(0);

    const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
    const [bookQuery, setBookQuery] = useState('');
    const [bookResults, setBookResults] = useState<OpenLibraryBook[]>([]);
    const [isSearchingBooks, setIsSearchingBooks] = useState(false);
    const [bookSearchError, setBookSearchError] = useState<string | null>(null);
    const [selectedBookKey, setSelectedBookKey] = useState<string | null>(null);
    
    const isProOrHigher = effectiveTier === 'pro' || effectiveTier === 'ultra';
    const canGenerate = effectiveTier !== 'free' || generations < 1;

    useEffect(() => {
        if (localStorage.getItem('weaver_disclaimer_accepted') === 'true') {
            setDisclaimerAccepted(true);
        }
    }, []);

    const handleAcceptDisclaimer = () => {
        localStorage.setItem('weaver_disclaimer_accepted', 'true');
        setDisclaimerAccepted(true);
    };

    const handleGenerateInspiration = async () => {
        if (!prompt || !canGenerate) return;
        setIsLoading(true);
        setError(null);
        setImages([]);
        try {
            const imagePromises = Array(4).fill(0).map(() => 
                generateIllustration(prompt, 'arte conceptual', isProOrHigher ? settings.ai.imageQuality : 'Standard')
            );
            const generatedImages = await Promise.all(imagePromises);
            setImages(generatedImages.filter(img => !img.startsWith('https://picsum.photos')));
            if(generatedImages.some(img => img.startsWith('https://picsum.photos'))) {
                setError('Algunas imágenes no pudieron ser generadas.');
            }
            if(effectiveTier === 'free') {
                setGenerations(prev => prev + 1);
            }
        } catch (err) {
            if (err instanceof Error) setError(err.message);
            else setError('Ocurrió un error inesperado al generar la inspiración.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBookSearch = async () => {
        if (!bookQuery) return;
        setIsSearchingBooks(true);
        setBookSearchError(null);
        setBookResults([]);
        try {
            const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(bookQuery)}`);
            if (!response.ok) {
                throw new Error('La búsqueda de libros falló. Inténtalo de nuevo.');
            }
            const data = await response.json();
            setBookResults(data.docs.slice(0, 12));
        } catch (err) {
            setBookSearchError(err instanceof Error ? err.message : 'Un error desconocido ocurrió.');
        } finally {
            setIsSearchingBooks(false);
        }
    };

    const handleSelectBook = (book: OpenLibraryBook) => {
        setPrompt(`Una historia inspirada en el ambiente y estilo de "${book.title}" por ${book.author_name?.[0] || 'Autor Desconocido'}.`);
        setSelectedBookKey(book.key);
    };

    return (
        <div className="w-full max-w-5xl mx-auto p-8">
            <div className="text-center mb-8">
                <Icon name="palette" className="w-12 h-12 mx-auto text-primary" />
                <h2 className="text-3xl font-bold mt-3 text-text-main">Tablón de Inspiración</h2>
                <p className="mt-2 text-text-secondary max-w-2xl mx-auto">
                    ¿No sabes por dónde empezar? Describe una idea, una atmósfera o un estilo, y deja que la IA cree un moodboard visual para ti.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mb-8">
                <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Ej: Un detective cyberpunk en una ciudad lluviosa de neón, un bosque encantado bajo dos lunas..."
                    className="flex-grow bg-brand-bg border border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    rows={2}
                />
                <button 
                    onClick={handleGenerateInspiration}
                    disabled={isLoading || !prompt || !canGenerate}
                    className="w-full sm:w-auto flex justify-center items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? <Icon name="loader" className="w-5 h-5 mr-2"/> : <Icon name="wand" className="w-5 h-5 mr-2"/>}
                    Generar Inspiración
                </button>
            </div>
            
            {!canGenerate && (
                <div className="text-center text-sm text-pro-gold bg-pro-gold-bg p-3 rounded-md mb-8">
                    <p>Has alcanzado el límite de inspiración para usuarios gratuitos. Mejora a un plan superior para generaciones ilimitadas.</p>
                </div>
            )}

            {error && <p className="text-red-400 text-center my-4">{error}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 min-h-[200px]">
                {isLoading && Array(4).fill(0).map((_, i) => (
                    <div key={i} className="aspect-video bg-surface-light rounded-lg flex items-center justify-center animate-pulse">
                        <Icon name="image" className="w-10 h-10 text-text-secondary" />
                    </div>
                ))}
                {!isLoading && images.map((src, i) => (
                    <div key={i} className="aspect-video bg-surface-light rounded-lg overflow-hidden shadow-lg">
                        <img src={src} alt={`Inspiración visual ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                ))}
            </div>

            <div className="relative flex py-8 items-center">
                <div className="flex-grow border-t border-border-color"></div>
                <span className="flex-shrink mx-4 text-text-secondary">O</span>
                <div className="flex-grow border-t border-border-color"></div>
            </div>

            <div className="text-center">
                <h3 className="text-xl font-bold text-text-main">Busca inspiración en un libro existente</h3>
                <p className="mt-1 text-sm text-text-secondary">Encuentra una obra y úsala como punto de partida para tu propia creación.</p>
            </div>

            <div className="mt-6">
                {!disclaimerAccepted ? (
                    <div className="p-4 bg-yellow-900/50 border border-yellow-700 rounded-lg text-yellow-300">
                        <div className="flex items-start gap-3">
                            <Icon name="shield" className="w-8 h-8 flex-shrink-0 mt-1" />
                            <div>
                                <h4 className="font-bold">Aviso de Derechos de Autor</h4>
                                <p className="text-xs mt-1">Al buscar y usar obras existentes como inspiración, reconoces que los derechos de autor pertenecen a sus respectivos dueños. Weaver no se hace responsable del uso indebido del material protegido. Esta herramienta es para inspiración y reimaginación, no para plagio. El contenido generado debe ser una obra transformadora.</p>
                                <button onClick={handleAcceptDisclaimer} className="mt-3 px-4 py-1.5 bg-yellow-400 text-black text-sm font-bold rounded-md">He leído y entiendo el aviso</button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="text"
                                value={bookQuery}
                                onChange={e => setBookQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleBookSearch()}
                                placeholder="Buscar por título o autor..."
                                className="flex-grow bg-brand-bg border border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            />
                            <button
                                onClick={handleBookSearch}
                                disabled={isSearchingBooks || !bookQuery}
                                className="w-full sm:w-auto flex justify-center items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                            >
                                <Icon name="search" className="w-5 h-5 mr-2" />
                                Buscar Libro
                            </button>
                        </div>

                        {isSearchingBooks && (
                             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                                {Array(6).fill(0).map((_, i) => (
                                    <div key={i} className="aspect-[2/3] bg-surface-light rounded-lg flex items-center justify-center animate-pulse">
                                        <Icon name="loader" className="w-8 h-8 text-text-secondary" />
                                    </div>
                                ))}
                            </div>
                        )}
                        {bookSearchError && <p className="text-red-400 text-center">{bookSearchError}</p>}
                        {bookResults.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {bookResults.map(book => {
                                    const coverUrl = book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : `https://via.placeholder.com/180x270.png?text=Sin+Portada`;
                                    const isSelected = selectedBookKey === book.key;
                                    return (
                                        <button
                                            key={book.key}
                                            onClick={() => handleSelectBook(book)}
                                            className={`text-left bg-surface rounded-lg overflow-hidden shadow-lg group transition-all duration-200 ${isSelected ? 'ring-2 ring-primary scale-105' : 'hover:scale-105 hover:shadow-primary/20'}`}
                                        >
                                            <img src={coverUrl} alt={book.title} className="w-full aspect-[2/3] object-cover bg-surface-light"/>
                                            <div className="p-2">
                                                <p className="text-xs font-bold text-text-main truncate" title={book.title}>{book.title}</p>
                                                <p className="text-xs text-text-secondary truncate">{book.author_name?.[0] || 'Desconocido'}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex justify-center items-center gap-4 border-t border-border-color pt-6 mt-8">
                <button onClick={() => onContinue('')} className="text-text-secondary hover:text-text-main transition-colors">
                    Omitir e ir al formulario
                </button>
                <button 
                    onClick={() => onContinue(prompt)}
                    className="px-6 py-3 bg-surface hover:bg-surface-light rounded-md font-semibold"
                >
                    Continuar con esta inspiración
                </button>
            </div>
        </div>
    );
};
