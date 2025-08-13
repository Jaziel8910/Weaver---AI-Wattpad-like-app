
import React, { useState, useRef, useEffect } from 'react';
import type { AppSettings, UserTier } from '../types';
import { Icon, type IconProps } from './Icon';
import { ProBadge } from './ProBadge';

interface UserMenuProps {
  settings: AppSettings;
  effectiveTier: UserTier;
  onProfileClick: () => void;
  onSettingsClick: () => void;
  onSaveBackup: () => void;
  onLogout: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ settings, effectiveTier, onProfileClick, onSettingsClick, onSaveBackup, onLogout }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const { account } = settings;
    const avatarFrameClass = account.avatarFrame !== 'none' ? `avatar-frame-${account.avatarFrame}` : '';

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const MenuItem: React.FC<{ icon: IconProps['name'], text: string, onClick: () => void }> = ({ icon, text, onClick }) => (
         <button onClick={onClick} className="flex items-center w-full px-3 py-2 text-sm text-text-secondary hover:bg-surface-light hover:text-text-main rounded-md transition-colors">
            <Icon name={icon} className="w-4 h-4 mr-3" />
            <span>{text}</span>
        </button>
    );

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 rounded-full p-1 hover:bg-surface-light transition-colors">
                <img 
                    src={account.avatarUrl || `https://i.pravatar.cc/150?u=weaver-default`}
                    alt="User Avatar" 
                    className={`w-8 h-8 rounded-full border-2 border-primary/50 object-cover transition-all duration-300 ${avatarFrameClass}`}
                />
                <Icon name="chevron-up-down" className="w-4 h-4 text-text-secondary hidden sm:block"/>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-surface rounded-lg shadow-2xl border border-border-color z-50 p-2">
                    <div className="px-3 py-2 border-b border-border-color mb-2">
                        <div className="flex items-center justify-between">
                             <p className="font-bold text-text-main truncate">{account.username}</p>
                            {effectiveTier !== 'free' && <ProBadge compact={true} tierName={effectiveTier.toUpperCase()}/>}
                        </div>
                         <p className="text-xs text-text-secondary">Rango: <span className="font-bold text-primary">{account.writerRank || 'C'}</span></p>
                        <div className="flex items-center gap-1 text-xs text-text-secondary mt-1">
                            <Icon name="award" className="w-3 h-3 text-pro-gold"/>
                            <span>{account.weaverins} Weaverins</span>
                        </div>
                    </div>

                    {effectiveTier === 'free' && (
                         <div className="px-1 py-2">
                             <button onClick={() => { onSettingsClick(); setIsOpen(false); }} className="flex items-center w-full p-2 text-sm rounded-md bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 transition-colors">
                                <Icon name="award" className="w-4 h-4 mr-3" />
                                <span>Ver Planes</span>
                            </button>
                        </div>
                    )}
                    
                    <div className="space-y-1">
                        <MenuItem icon="user" text="Mi Perfil" onClick={() => { onProfileClick(); setIsOpen(false); }} />
                        <MenuItem icon="settings" text="Ajustes" onClick={() => { onSettingsClick(); setIsOpen(false); }} />
                        <MenuItem icon="save" text="Guardar Copia de Seguridad (.swe)" onClick={() => { onSaveBackup(); setIsOpen(false); }} />
                    </div>
                    
                    <div className="border-t border-border-color mt-2 pt-2">
                        <MenuItem icon="log-out" text="Cerrar Sesión" onClick={() => { onLogout(); setIsOpen(false); }} />
                    </div>
                </div>
            )}
        </div>
    );
};
