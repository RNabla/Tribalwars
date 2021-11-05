import { toHex, fromHex } from './common';

export async function exportKeyAsHexAsync(key) {
    const exportedKey = await window.crypto.subtle.exportKey(
        'raw',
        key
    );
    return toHex(new Uint8Array(exportedKey));
}

export async function importKeyFromHexAsync(encryptionKeyHex) {
    const rawKey = fromHex(encryptionKeyHex);
    const encryptionKey = await window.crypto.subtle.importKey(
        'raw',
        rawKey,
        'AES-CBC',
        true,
        ['encrypt', 'decrypt']
    );
    return encryptionKey;
}

export async function generateEncryptionKeyAsync() {
    return await window.crypto.subtle.generateKey({ name: 'AES-CBC', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

export async function encryptValueAsync(value, encryptionKey) {
    const textEncoder = new TextEncoder();
    const encoded = textEncoder.encode(value);
    const iv = window.crypto.getRandomValues(new Uint8Array(16));
    const ciphertext = await window.crypto.subtle.encrypt(
        { name: 'AES-CBC', iv },
        encryptionKey,
        encoded
    );
    return { iv: toHex(iv), ciphertext: toHex(new Uint8Array(ciphertext)) };
}

export async function decryptValueAsync(value, encryptionKey) {
    const iv = fromHex(value.iv);
    const ciphertext = fromHex(value.ciphertext);
    const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-CBC', iv },
        encryptionKey,
        ciphertext
    );
    let textDecoder = new TextDecoder();
    return textDecoder.decode(decrypted);
}