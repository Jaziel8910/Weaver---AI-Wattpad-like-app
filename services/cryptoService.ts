import type { SweFileBundle, ProfileCardData, SignedProfileCard, AppSettings, Friend, Universe } from '../types';

// --- Helper Functions for Base64 <-> ArrayBuffer / String ---
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

// Use modern, safe methods for string to base64 conversion
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const safeStringToBase64 = (str: string) => arrayBufferToBase64(textEncoder.encode(str));
const safeBase64ToString = (b64: string) => textDecoder.decode(base64ToArrayBuffer(b64));


// --- Helper Functions for base64url used in WebAuthn ---
const base64urlEncode = (buffer: ArrayBuffer): string => {
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(buffer))))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};

const base64urlDecode = (str: string): ArrayBuffer => {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
        str += '=';
    }
    const decoded = atob(str);
    const buffer = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
        buffer[i] = decoded.charCodeAt(i);
    }
    return buffer.buffer;
};


// --- Core Cryptographic Functions ---

/**
 * Hashes a string using SHA-256. Used for security question answers.
 */
export const hashText = async (text: string): Promise<string> => {
    const data = textEncoder.encode(text.trim().toLowerCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return arrayBufferToBase64(hashBuffer);
};


/**
 * Derives a key from a password and salt using PBKDF2 for AES-GCM encryption.
 */
const getEncryptionKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
    const baseKey = await crypto.subtle.importKey(
        'raw', 
        textEncoder.encode(password), 
        { name: 'PBKDF2' }, 
        false, 
        ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
};

/**
 * Encrypts the account data for file export.
 * @returns An ArrayBuffer containing [salt(16b)][iv(12b)][encrypted_data].
 */
export const encryptForFile = async (data: SweFileBundle, password: string): Promise<ArrayBuffer> => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await getEncryptionKey(password, salt);
    
    const serializedData = textEncoder.encode(JSON.stringify(data));
    
    const encryptedData = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, serializedData);

    const resultBuffer = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
    resultBuffer.set(salt, 0);
    resultBuffer.set(iv, salt.length);
    resultBuffer.set(new Uint8Array(encryptedData), salt.length + iv.length);
    
    return resultBuffer.buffer;
};

/**
 * Decrypts a .swe file buffer.
 */
export const decryptFromFile = async (fileBuffer: ArrayBuffer, password: string): Promise<SweFileBundle> => {
    try {
        const salt = new Uint8Array(fileBuffer.slice(0, 16));
        const iv = new Uint8Array(fileBuffer.slice(16, 28));
        const data = new Uint8Array(fileBuffer.slice(28));
        
        const key = await getEncryptionKey(password, salt);
        
        const decryptedData = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
        
        const decryptedString = textDecoder.decode(decryptedData);
        return JSON.parse(decryptedString) as SweFileBundle;
    } catch (error) {
        console.error("Decryption failed:", error);
        throw new Error("La desencriptación falló. Revisa tu contraseña o el archivo puede estar corrupto.");
    }
};

/**
 * Generates a new ECDSA key pair for signing profiles.
 */
export const generateSigningKeyPair = (): Promise<CryptoKeyPair> => {
    return crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign', 'verify']
    );
};

/**
 * Creates a signed, shareable Profile Card string.
 */
export const createProfileCard = async (account: AppSettings['account']): Promise<string> => {
    const { userId, username, avatarUrl, status, signingKeyPair } = account;
    const privateKey = await crypto.subtle.importKey('jwk', signingKeyPair.privateKey, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);

    const profileData: ProfileCardData = { userId, username, avatarUrl, status };
    const encodedData = safeStringToBase64(JSON.stringify(profileData));
    
    const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: { name: 'SHA-256' } },
        privateKey,
        textEncoder.encode(encodedData)
    );

    const card: SignedProfileCard = {
        v: 'wpc1',
        publicKey: signingKeyPair.publicKey,
        data: encodedData,
        sig: arrayBufferToBase64(signature)
    };

    return safeStringToBase64(JSON.stringify(card));
};

/**
 * Verifies a Profile Card and returns the friend's public data if valid.
 */
export const verifyProfileCard = async (cardString: string): Promise<Friend> => {
    try {
        const card: SignedProfileCard = JSON.parse(safeBase64ToString(cardString));
        if (card.v !== 'wpc1') throw new Error("Versión de tarjeta no soportada.");

        const publicKey = await crypto.subtle.importKey('jwk', card.publicKey, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']);
        const signature = base64ToArrayBuffer(card.sig);
        const dataToVerify = textEncoder.encode(card.data);

        const isValid = await crypto.subtle.verify(
            { name: 'ECDSA', hash: { name: 'SHA-256' } },
            publicKey,
            signature,
            dataToVerify
        );

        if (!isValid) throw new Error("Firma inválida. La tarjeta de perfil puede haber sido manipulada.");

        const profileData: ProfileCardData = JSON.parse(safeBase64ToString(card.data));
        
        return {
            userId: profileData.userId,
            username: profileData.username,
            avatarUrl: profileData.avatarUrl,
            status: profileData.status
        };

    } catch (error) {
        console.error("Error al verificar la tarjeta de perfil:", error);
        throw new Error("La tarjeta de perfil no es válida o está corrupta.");
    }
};

/**
 * Creates a new WebAuthn credential (Passkey).
 */
export const createPasskey = async (username: string, userId: string): Promise<{ credentialId: string, publicKeyJwk: JsonWebKey, rawId: ArrayBuffer }> => {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credential = await navigator.credentials.create({
        publicKey: {
            challenge,
            rp: { name: "Weaver" },
            user: {
                id: textEncoder.encode(userId),
                name: username,
                displayName: username,
            },
            pubKeyCredParams: [{ type: "public-key", alg: -7 }], // ES256
            authenticatorSelection: {
                authenticatorAttachment: 'platform',
                requireResidentKey: true,
                userVerification: 'preferred',
            },
            timeout: 60000,
            attestation: 'none'
        }
    });

    if (!credential || !(credential instanceof PublicKeyCredential) || !(credential.response instanceof AuthenticatorAttestationResponse)) {
        throw new Error("Error al crear la credencial de Passkey.");
    }
    
    const publicKeyJwk = await crypto.subtle.exportKey('jwk', await crypto.subtle.importKey('spki', credential.response.getPublicKey(), { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']));

    return { 
      credentialId: base64urlEncode(credential.rawId), 
      publicKeyJwk,
      rawId: credential.rawId,
    };
};

/**
 * Authenticates using an existing Passkey.
 */
export const getPasskey = async (rawId: ArrayBuffer): Promise<boolean> => {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    try {
        const credential = await navigator.credentials.get({
            publicKey: {
                challenge,
                allowCredentials: [{
                    type: 'public-key',
                    id: rawId,
                }],
                userVerification: 'required',
                timeout: 60000,
            }
        });

        // The presence of a credential is proof enough for this client-side 2FA-like check.
        // In a real server environment, we'd verify the signature against the challenge.
        return !!credential;
    } catch(err) {
        console.error("La autenticación con Passkey falló", err);
        return false;
    }
};

export const { base64urlDecode: passkeyBase64urlDecode } = { base64urlDecode };
