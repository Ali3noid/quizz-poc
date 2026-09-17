export async function hashPassword(password: string): Promise<string> {
    const saltBytes = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = Array.from(saltBytes, (b) => b.toString(16).padStart(2, '0')).join('');

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: saltBytes as unknown as BufferSource,
            iterations: 100_000,
            hash: 'SHA-512'
        },
        keyMaterial,
        512
    );

    const hashArray = Array.from(new Uint8Array(derivedBits));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    try {
        const [saltHex, expectedHashHex] = storedHash.split(':');
        if (!saltHex || !expectedHashHex) return false;

        const saltMatches = saltHex.match(/.{1,2}/g);
        if (!saltMatches) return false;

        const saltBytes = new Uint8Array(saltMatches.map((byte) => parseInt(byte, 16)));

        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveBits']
        );

        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: saltBytes as unknown as BufferSource,
                iterations: 100_000,
                hash: 'SHA-512'
            },
            keyMaterial,
            512
        );

        const hashArray = Array.from(new Uint8Array(derivedBits));
        const computedHashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

        if (computedHashHex.length !== expectedHashHex.length) return false;

        let diff = 0;
        for (let i = 0; i < computedHashHex.length; i++) {
            diff |= computedHashHex.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
        }
        return diff === 0;
    } catch {
        return false;
    }
}
