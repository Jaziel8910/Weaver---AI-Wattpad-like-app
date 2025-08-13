
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { AppSettings, Story, AccountSettings, WriterRank, AvatarFrame } from '../types';
import { Icon } from './Icon';
import { ProBadge } from './ProBadge';
import { StoryCard } from './StoryCard';

const AvatarUploader: React.FC<{ avatarUrl: string; onAvatarChange: (url: string) => void; }> = ({ avatarUrl, onAvatarChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);

    const processImage = (imageSrc: string) => {
        const img = new Image();
        img.src = imageSrc;
        img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const size = 256;
            canvas.width = size;
            canvas.height = size;

            const sourceX = img.width > img.height ? (img.width - img.height) / 2 : 0;
            const sourceY = img.height > img.width ? (img.height - img.width) / 2 : 0;
            const sourceSize = Math.min(img.width, img.height);
            
            ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
            
            onAvatarChange(canvas.toDataURL('image/jpeg', 0.9));
        };
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                processImage(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const openCamera = async () => {
        setCameraError(null);
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
                setIsCameraOn(true);
                setTimeout(() => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                }, 100);
            } catch (err) {
                console.error("Error accessing camera:", err);
                setCameraError("No se pudo acceder a la cámara. Asegúrate de haber dado permiso en tu navegador.");
                setIsCameraOn(false);
            }
        } else {
            setCameraError("La cámara no es compatible con este navegador.");
        }
    };

    const closeCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
        setIsCameraOn(false);
    };

    const takePhoto = () => {
        const video = videoRef.current;
        if (!video) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        const sourceX = videoWidth > videoHeight ? (videoWidth - videoHeight) / 2 : 0;
        const sourceY = videoHeight > videoWidth ? (videoHeight - videoWidth) / 2 : 0;
        const sourceSize = Math.min(videoWidth, videoHeight);

        ctx.drawImage(video, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
        onAvatarChange(canvas.toDataURL('image/jpeg', 0.9));
        closeCamera();
    };
    
    return (
        <div className="flex flex-col items-center gap-4">
            <canvas ref={canvasRef} className="hidden"></canvas>
            {cameraError && <p className="text-red-400 text-xs text-center">{cameraError}</p>}
            {isCameraOn && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={closeCamera}>
                    <div className="bg-surface p-4 rounded-lg" onClick={e => e.stopPropagation()}>
                        <video ref={videoRef} autoPlay playsInline className="rounded-md w-full max-w-lg"></video>
                        <button onClick={takePhoto} className="w-full mt-4 py-2 bg-primary text-white rounded-md font-bold">Tomar Foto</button>
                    </div>
                </div>
            )}
            <div className="flex gap-2">
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 text-sm bg-surface-light border border-border-color rounded-md hover:bg-primary-hover hover:text-white transition-colors flex items-center gap-2"><Icon name="upload" className="w-4 h-4"/> Subir</button>
                <button type="button" onClick={openCamera} className="px-3 py-1.5 text-sm bg-surface-light border border-border-color rounded-md hover:bg-primary-hover hover:text-white transition-colors flex items-center gap-2"><Icon name="camera" className="w-4 h-4"/> Cámara</button>
            </div>
        </div>
    );
};

const rankConfig: Record<WriterRank, { name: string; threshold: number; next: WriterRank | null }> = {
    'C': { name: 'Aprendiz de Tejedor', threshold: 0, next: 'B' },
    'B': { name: 'Tejedor Competente', threshold: 250, next: 'A' },
    'A': { name: 'Artesano de Historias', threshold: 1000, next: 'S' },
    'S': { name: 'Maestro Tejedor', threshold: 2500, next: 'S+' },
    'S+': { name: 'Leyenda del Universo', threshold: 5000, next: null },
};

const calculateRank = (points: number): { rank: WriterRank; progress: number; currentThreshold: number; nextThreshold: number | null } => {
    if (points >= rankConfig['S+'].threshold) return { rank: 'S+', progress: 100, currentThreshold: rankConfig['S+'].threshold, nextThreshold: null };
    if (points >= rankConfig['S'].threshold) {
        const currentThreshold = rankConfig['S'].threshold;
        const nextThreshold = rankConfig['S+'].threshold;
        return { rank: 'S', progress: ((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100, currentThreshold, nextThreshold };
    }
    if (points >= rankConfig['A'].threshold) {
        const currentThreshold = rankConfig['A'].threshold;
        const nextThreshold = rankConfig['S'].threshold;
        return { rank: 'A', progress: ((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100, currentThreshold, nextThreshold };
    }
    if (points >= rankConfig['B'].threshold) {
        const currentThreshold = rankConfig['B'].threshold;
        const nextThreshold = rankConfig['A'].threshold;
        return { rank: 'B', progress: ((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100, currentThreshold, nextThreshold };
    }
    const currentThreshold = rankConfig['C'].threshold;
    const nextThreshold = rankConfig['B'].threshold;
    return { rank: 'C', progress: ((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100, currentThreshold, nextThreshold };
};

interface ProfilePageProps {
  settings: AppSettings;
  stories: Story[];
  onUpdateAccountSettings: (updates: Partial<AccountSettings>) => void;
  onBack: () => void;
  onNavigateToSettings: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ settings, stories, onUpdateAccountSettings, onBack, onNavigateToSettings }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editableAccount, setEditableAccount] = useState(settings.account);

    useEffect(() => {
        setEditableAccount(settings.account);
    }, [settings.account]);

    const { totalPoints, rankData } = useMemo(() => {
        const pointsFromStories = stories.reduce((acc, story) => {
            const reads = story.socialStats?.activeReaders || 0;
            const positiveReviews = story.socialStats?.featuredReviews?.filter(r => r.rating > 3).length || 0;
            return acc + (reads * 1) + (positiveReviews * 5) + 10; // +10 points per story created
        }, 0);

        const pointsFromQuests = Object.values(settings.account.quests).filter(Boolean).length * 50;
        
        const total = pointsFromStories + pointsFromQuests;
        return { totalPoints: total, rankData: calculateRank(total) };
    }, [stories, settings.account.quests]);

    useEffect(() => {
        if (rankData.rank !== settings.account.writerRank || totalPoints !== settings.account.rankPoints) {
            onUpdateAccountSettings({ writerRank: rankData.rank, rankPoints: totalPoints });
        }
    }, [rankData.rank, totalPoints, settings.account.writerRank, settings.account.rankPoints, onUpdateAccountSettings]);

    const handleSave = () => {
        onUpdateAccountSettings(editableAccount);
        setIsEditing(false);
    };
    
    const handleCancel = () => {
        setEditableAccount(settings.account);
        setIsEditing(false);
    }
    
    const avatarFrames: AvatarFrame[] = ['none', 'gold', 'neon'];
    const { account } = isEditing ? { account: editableAccount } : settings;
    const isUltra = settings.account.tier === 'ultra';

    return (
        <div className="bg-brand-bg min-h-screen">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <header className="flex justify-between items-center mb-8">
                     <button onClick={onBack} className="flex items-center text-sm text-primary hover:text-primary-hover">
                        <Icon name="arrow-left" className="w-4 h-4 mr-2"/>
                        Volver a la Biblioteca
                    </button>
                    <div className="flex items-center gap-2">
                        {isEditing ? (
                             <>
                                <button onClick={handleCancel} className="px-4 py-2 text-sm rounded-md bg-surface-light hover:bg-border-color">Cancelar</button>
                                <button onClick={handleSave} className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary-hover flex items-center gap-2"><Icon name="save"/>Guardar Cambios</button>
                             </>
                        ) : (
                             <>
                                <button onClick={() => setIsEditing(true)} className="px-4 py-2 text-sm rounded-md bg-surface-light hover:bg-border-color flex items-center gap-2"><Icon name="edit"/>Editar Perfil</button>
                                <button onClick={onNavigateToSettings} className="p-2 rounded-full hover:bg-surface-light" title="Ajustes de la cuenta"><Icon name="settings"/></button>
                             </>
                        )}
                    </div>
                </header>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Profile Info */}
                    <div className="lg:col-span-1 flex flex-col items-center text-center p-6 bg-surface rounded-lg shadow-lg">
                        <div className="relative mb-4">
                            <img src={account.avatarUrl || `https://i.pravatar.cc/150?u=${account.username}`} alt="Avatar" className={`w-32 h-32 rounded-full border-4 object-cover bg-surface-light transition-all duration-300 ${'avatar-frame-' + account.avatarFrame}`} />
                        </div>
                        {isEditing && <AvatarUploader avatarUrl={account.avatarUrl} onAvatarChange={url => setEditableAccount(s => ({ ...s, avatarUrl: url }))} />}
                        
                        {isEditing ? (
                            <input type="text" value={editableAccount.username} onChange={e => setEditableAccount(s => ({ ...s, username: e.target.value }))} className="text-2xl font-bold bg-brand-bg border border-border-color rounded-md py-1 px-2 text-center mt-4"/>
                        ) : (
                            <h1 className="text-2xl font-bold text-text-main mt-4">{account.username}</h1>
                        )}

                        {isEditing ? (
                            <input type="text" value={editableAccount.status} onChange={e => setEditableAccount(s => ({ ...s, status: e.target.value }))} className="text-sm text-text-secondary bg-brand-bg border border-border-color rounded-md py-1 px-2 text-center mt-2 w-full"/>
                        ) : (
                             <p className="text-sm text-text-secondary mt-1 italic">"{account.status}"</p>
                        )}

                        {isEditing && (
                             <div className="mt-4 w-full">
                                <label className="block text-sm font-medium text-text-secondary">Marco de Avatar</label>
                                <div className="flex rounded-md shadow-sm mt-1">
                                    {avatarFrames.map(frame => (
                                        <button type="button" key={frame} onClick={() => setEditableAccount(s => ({...s, avatarFrame: frame}))} className={`w-full px-4 py-2 text-sm font-medium border capitalize ${account.avatarFrame === frame ? 'bg-primary border-primary text-white' : 'bg-brand-bg border-border-color hover:bg-surface-light'} first:rounded-l-md last:rounded-r-md disabled:opacity-50 disabled:cursor-not-allowed`} disabled={!isUltra}>
                                            {frame}
                                        </button>
                                    ))}
                                </div>
                                {!isUltra && <ProBadge tierName="ULTRA" isLocked compact />}
                             </div>
                        )}
                        
                        <div className="w-full mt-6 pt-6 border-t border-border-color">
                             <h3 className="font-semibold text-text-secondary text-left mb-2">Estadísticas</h3>
                             <div className="grid grid-cols-2 gap-4 text-left">
                                <div className="p-3 bg-brand-bg rounded-md">
                                    <p className="text-xs text-text-secondary">Historias Creadas</p>
                                    <p className="text-lg font-bold text-primary">{stories.length}</p>
                                </div>
                                 <div className="p-3 bg-brand-bg rounded-md">
                                    <p className="text-xs text-text-secondary">Capítulos Escritos</p>
                                    <p className="text-lg font-bold text-primary">{stories.reduce((acc, s) => acc + s.chapters.length, 0)}</p>
                                </div>
                                <div className="p-3 bg-brand-bg rounded-md">
                                    <p className="text-xs text-text-secondary">Lecturas (aprox)</p>
                                    <p className="text-lg font-bold text-primary">{stories.reduce((acc, s) => acc + (s.socialStats?.activeReaders || 0), 0)}</p>
                                </div>
                                 <div className="p-3 bg-brand-bg rounded-md">
                                    <p className="text-xs text-text-secondary">Reseñas Positivas</p>
                                    <p className="text-lg font-bold text-primary">{stories.reduce((acc, s) => acc + (s.socialStats?.featuredReviews?.filter(r=>r.rating > 3).length || 0), 0)}</p>
                                </div>
                             </div>
                        </div>

                    </div>
                    {/* Right Column: Rank and Stories */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Rank Card */}
                        <div className="p-6 bg-surface rounded-lg shadow-lg">
                            <h2 className="text-xl font-bold text-text-main mb-1">Rango de Escritor</h2>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-3xl font-bold text-primary`}>{rankData.rank}</span>
                                <span className="text-text-secondary">- {rankConfig[rankData.rank].name}</span>
                            </div>
                            <div className="mt-4">
                                <div className="flex justify-between text-xs text-text-secondary mb-1">
                                    <span>{totalPoints.toLocaleString()} RP</span>
                                    <span>{rankData.nextThreshold ? `Siguiente Rango: ${rankData.nextThreshold.toLocaleString()} RP` : '¡Rango Máximo!'}</span>
                                </div>
                                <div className="w-full bg-brand-bg rounded-full h-2.5">
                                    <div className="bg-primary h-2.5 rounded-full" style={{width: `${rankData.progress}%`}}></div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Stories */}
                        <div>
                            <h2 className="text-xl font-bold text-text-main mb-4">Mis Historias</h2>
                            {stories.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                     {stories.map(story => ( <StoryCard key={story.id} story={story} onSelect={() => {}} onDelete={(e) => {}} onEdit={(e) => {}} reduceAnimations={settings.accessibility.reduceAnimations} /> ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 bg-surface rounded-lg">
                                    <Icon name="book-open" className="w-12 h-12 mx-auto text-text-secondary" />
                                    <p className="mt-2 text-text-secondary">Aún no has creado ninguna historia.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
