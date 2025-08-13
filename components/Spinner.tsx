
import React from 'react';
import { Icon } from './Icon';

interface SpinnerProps {
    message: string;
    disableAnimations?: boolean;
}

const Spinner: React.FC<SpinnerProps> = ({ message, disableAnimations = false }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50">
        <Icon name="loader" className={`w-16 h-16 text-primary ${!disableAnimations && 'animate-spin'}`} />
        <p className={`text-text-main text-xl mt-4 ${!disableAnimations && 'animate-pulse'}`}>{message}</p>
        <p className="text-text-secondary text-sm mt-2">Esto puede tardar unos momentos...</p>
    </div>
);

export default Spinner;