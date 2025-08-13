import React from 'react';
import { Icon } from './Icon';

interface ProBadgeProps {
  tierName?: string;
  isLocked?: boolean;
  compact?: boolean;
}

export const ProBadge: React.FC<ProBadgeProps> = ({ tierName = 'PRO', isLocked = false, compact = false }) => {
    const icon = isLocked ? 'lock' : 'award';
    const text = isLocked ? `Mejorar a ${tierName}` : tierName;
    const dynamicClasses = compact 
        ? 'px-2 py-1 gap-1 rounded-md' 
        : 'px-2.5 py-1.5 gap-2 rounded-lg';

    return (
        <div className={`inline-flex items-center text-xs font-bold text-pro-gold bg-pro-gold-bg border border-pro-gold/50 cursor-pointer hover:bg-pro-gold/20 transition-colors shrink-0 ${dynamicClasses}`}>
            <Icon name={icon} className="w-3 h-3" />
            <span>{text}</span>
        </div>
    );
};