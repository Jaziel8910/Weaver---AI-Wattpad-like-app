import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon';
import { getPasskey, passkeyBase64urlDecode } from '../services/cryptoService';

type LoginMethod = 'passkey' | 'quick' | 'file' | 'guest' | 'sync';

interface LoginScreenProps {
    onStartOnboarding: () => void;
    onFileLogin: (file: File, password: string) => void;
    onQuickAccessLogin: (password: string) => void;
    onGuestLogin: () => void;
    onSyncLogin: (vaultData: string, password: string) => void;
    onPasswordRecovery: () => void;
    hasQuickAccess: boolean;
    quickAccessMeta: { username: string, passkeyCredentialId?: string } | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ 
    onStartOnboarding, 
    onFileLogin,
    onQuickAccessLogin,
    onGuestLogin,
    onSyncLogin,
    onPasswordRecovery,
    hasQuickAccess,
    quickAccessMeta
}) => {
    const hasPasskey = hasQuickAccess && !!quickAccessMeta?.passkeyCredentialId;

    const [activeMethod, setActiveMethod] = useState<LoginMethod>(hasPasskey ? 'passkey' : hasQuickAccess ? 'quick' : 'file');
    const [password, setPassword] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [syncData, setSyncData] = useState('');
    const [passkeyVerified, setPasskeyVerified] = useState(false);
    const [isVerifyingPasskey, setIsVerifyingPasskey] = useState(false);
    const [passkeyError, setPasskeyError] = useState<string|null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (hasPasskey) {
            setActiveMethod('passkey');
        } else if (hasQuickAccess) {
            setActiveMethod('quick');
        }
    }, [hasQuickAccess, hasPasskey]);

    const handleFileLoginSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (file && password) {
            onFileLogin(file, password);
        } else {
            alert('Por favor, introduce tu contraseña y selecciona tu archivo de bóveda .swe.');
        }
    };
    
    const handleQuickAccessSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(password) {
            onQuickAccessLogin(password);
        }
    };
    
    const handleSyncSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(syncData && password) {
            onSyncLogin(syncData, password);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };
    
    const handleUnlockWithPasskey = async () => {
        if (!quickAccessMeta?.passkeyCredentialId) return;
        setIsVerifyingPasskey(true);
        setPasskeyError(null);
        const rawId = passkeyBase64urlDecode(quickAccessMeta.passkeyCredentialId);
        const success = await getPasskey(rawId);
        if (success) {
            setPasskeyVerified(true);
        } else {
            setPasskeyError("La verificación de la Weaver Key falló. Inténtalo de nuevo.");
        }
        setIsVerifyingPasskey(false);
    };

    const MethodTab: React.FC<{ method: LoginMethod, label: string, icon: any }> = ({ method, label, icon }) => (
        <button
            type="button"
            onClick={() => setActiveMethod(method)}
            className={`flex-1 py-3 px-2 text-sm font-medium flex flex-col sm:flex-row items-center justify-center gap-2 border-b-2 transition-all ${activeMethod === method ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-main'}`}
        >
            <Icon name={icon} className="w-5 h-5" />
            <span>{label}</span>
        </button>
    );

    const renderForm = () => {
        switch(activeMethod) {
            case 'passkey':
                return (
                     <form onSubmit={handleQuickAccessSubmit} className="space-y-4">
                        <p className="text-center text-sm text-text-secondary">Desbloquea tu bóveda con tu Weaver Key y tu contraseña.</p>
                         {!passkeyVerified ? (
                            <button type="button" onClick={handleUnlockWithPasskey} disabled={isVerifyingPasskey} className="w-full flex items-center justify-center gap-3 py-2.5 px-4 text-white bg-primary hover:bg-primary-hover rounded-md font-medium disabled:opacity-50">
                                {isVerifyingPasskey ? <Icon name="loader" className="w-5 h-5 animate-spin"/> : <Icon name="key" className="w-5 h-5" />}
                                {isVerifyingPasskey ? 'Verificando...' : `Desbloquear como ${quickAccessMeta?.username}`}
                            </button>
                         ) : (
                             <div className="space-y-4 animate-palette-enter">
                                <div className="p-3 bg-green-500/20 rounded-md text-center text-sm text-green-300 flex items-center justify-center gap-2">
                                    <Icon name="check" className="w-4 h-4"/> Weaver Key verificada. Introduce tu contraseña.
                                </div>
                                <div>
                                    <label htmlFor="qa_password" className="block text-sm font-medium text-text-secondary">Contraseña Maestra</label>
                                    <input id="qa_password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full bg-brand-bg border border-border-color rounded-md py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary" required autoFocus/>
                                </div>
                                <button type="submit" className="w-full flex items-center justify-center gap-3 py-2.5 px-4 text-white bg-primary hover:bg-primary-hover rounded-md font-medium" disabled={!password}>
                                    <Icon name="lock" className="w-5 h-5"/> Abrir Bóveda
                                </button>
                             </div>
                         )}
                         {passkeyError && <p className="text-xs text-center text-red-400">{passkeyError}</p>}
                    </form>
                )
            case 'quick':
                return (
                    <form onSubmit={handleQuickAccessSubmit} className="space-y-4">
                        <p className="text-center text-sm text-text-secondary">Desbloqueo rápido activado para este dispositivo.</p>
                        <div>
                            <label htmlFor="qa_password" className="block text-sm font-medium text-text-secondary">Contraseña Maestra</label>
                            <input id="qa_password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full bg-brand-bg border border-border-color rounded-md py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary" required />
                             <button type="button" onClick={onPasswordRecovery} className="text-xs text-primary hover:underline mt-1">¿Olvidaste tu contraseña?</button>
                        </div>
                        <button type="submit" className="w-full flex items-center justify-center gap-3 py-2.5 px-4 text-white bg-primary hover:bg-primary-hover rounded-md font-medium" disabled={!password}>
                            <Icon name="key" className="w-5 h-5"/> Desbloquear
                        </button>
                    </form>
                );
            case 'file':
                return (
                     <form onSubmit={handleFileLoginSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary">Archivo de Bóveda (.swe)</label>
                            <input type="file" accept=".swe" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-1 w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-border-color rounded-md bg-brand-bg hover:border-primary">
                                <Icon name="folder-open" className="w-5 h-5"/> {file ? file.name : 'Seleccionar archivo...'}
                            </button>
                        </div>
                        <div>
                            <label htmlFor="file_password" className="block text-sm font-medium text-text-secondary">Contraseña Maestra</label>
                            <input id="file_password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full bg-brand-bg border border-border-color rounded-md py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary" required />
                        </div>
                         <button type="submit" className="w-full flex items-center justify-center gap-3 py-2.5 px-4 text-white bg-primary hover:bg-primary-hover rounded-md font-medium" disabled={!file || !password}>
                            <Icon name="key" className="w-5 h-5"/> Desbloquear Bóveda
                        </button>
                    </form>
                );
            case 'sync':
                return (
                     <form onSubmit={handleSyncSubmit} className="space-y-4">
                         <p className="text-center text-sm text-text-secondary">Pega aquí los datos de la bóveda desde tu otro dispositivo para sincronizar.</p>
                        <div>
                            <label htmlFor="sync_data" className="block text-sm font-medium text-text-secondary">Datos de la Bóveda</label>
                            <textarea id="sync_data" value={syncData} onChange={e => setSyncData(e.target.value)} rows={3} className="mt-1 block w-full bg-brand-bg border border-border-color rounded-md py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary" placeholder="Pega los datos aquí..." required />
                        </div>
                        <div>
                            <label htmlFor="sync_password" className="block text-sm font-medium text-text-secondary">Contraseña Maestra</label>
                            <input id="sync_password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full bg-brand-bg border border-border-color rounded-md py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary" required />
                        </div>
                         <button type="submit" className="w-full flex items-center justify-center gap-3 py-2.5 px-4 text-white bg-primary hover:bg-primary-hover rounded-md font-medium" disabled={!syncData || !password}>
                           <Icon name="wifi" className="w-5 h-5" /> Sincronizar y Desbloquear
                        </button>
                    </form>
                )
            case 'guest':
                return (
                    <div className="text-center space-y-4 py-8">
                        <Icon name="user-check" className="w-12 h-12 text-primary mx-auto" />
                        <h3 className="text-lg font-semibold">Explorar como Invitado</h3>
                        <p className="text-text-secondary text-sm">Prueba Weaver con una bóveda temporal. Tu trabajo no se guardará a menos que crees una cuenta permanente más tarde.</p>
                        <button onClick={onGuestLogin} className="w-full flex items-center justify-center gap-3 py-2.5 px-4 text-white bg-primary hover:bg-primary-hover rounded-md font-medium">
                            Continuar como Invitado
                        </button>
                    </div>
                )
        }
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-brand-bg p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-6">
                    <Icon name="book-open" className="w-16 h-16 mx-auto text-primary" />
                    <h1 className="text-4xl font-bold text-text-main mt-4">Bienvenido a Weaver</h1>
                    <p className="text-text-secondary mt-2">Tu lienzo para crear universos narrativos.</p>
                </div>
                
                <div className="bg-surface rounded-lg shadow-xl">
                    <div className="flex border-b border-border-color">
                        {hasPasskey && <MethodTab method="passkey" label="Weaver Key (Alpha)" icon="key" />}
                        {hasQuickAccess && !hasPasskey && <MethodTab method="quick" label="Acceso Rápido" icon="key" />}
                        <MethodTab method="file" label="Desbloquear Bóveda" icon="folder-open" />
                        <MethodTab method="sync" label="Sincronizar" icon="wifi" />
                        <MethodTab method="guest" label="Invitado" icon="user-check" />
                    </div>
                    <div className="p-6">
                        {renderForm()}
                    </div>
                </div>
                
                <div className="text-center mt-6">
                     <p className="text-text-secondary text-sm">¿Eres nuevo aquí?</p>
                     <button
                        onClick={onStartOnboarding}
                        className="w-full max-w-sm mx-auto mt-2 flex items-center justify-center gap-3 py-2.5 px-4 border border-transparent rounded-md shadow-sm font-medium text-text-main bg-surface-light hover:bg-primary hover:text-white transition-colors"
                    >
                        <Icon name="plus" className="w-5 h-5" />
                        Crear Nueva Cuenta Segura
                    </button>
                </div>
            </div>
        </div>
    );
};