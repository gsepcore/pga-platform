/**
 * SkillSigner — Ed25519 signing and verification for Genome Shield skills.
 *
 * Signs skill code + manifest to guarantee integrity.
 * Unsigned skills blocked in Secure/Paranoid profiles.
 *
 * @module security
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-30
 */

import { createHash, createPrivateKey, sign, verify, generateKeyPairSync } from 'node:crypto';

// ─── Types ──────────────────────────────────────────────

export interface SkillSignature {
    /** Hex-encoded Ed25519 signature */
    signature: string;
    /** SHA-256 hash of (code + manifest + version) */
    contentHash: string;
    /** Public key that signed this (hex) */
    publicKey: string;
    /** Timestamp of signing */
    signedAt: string;
}

export interface KeyPair {
    publicKey: string;   // hex-encoded
    privateKey: string;  // hex-encoded
}

// ─── Signer ─────────────────────────────────────────────

/**
 * Signs and verifies skill integrity using Ed25519.
 *
 * Usage:
 * ```typescript
 * const signer = new SkillSigner();
 *
 * // Generate a key pair (once, store private key securely)
 * const keys = SkillSigner.generateKeyPair();
 *
 * // Sign a skill
 * const sig = signer.sign(skillCode, manifestJSON, '1.0.0', keys.privateKey);
 *
 * // Verify a skill
 * const valid = signer.verify(skillCode, manifestJSON, '1.0.0', sig, keys.publicKey);
 * ```
 */
export class SkillSigner {
    /** Known trusted public keys (publisher → key) */
    private trustedKeys: Map<string, string> = new Map();

    constructor(trustedKeys?: Record<string, string>) {
        if (trustedKeys) {
            for (const [publisher, key] of Object.entries(trustedKeys)) {
                this.trustedKeys.set(publisher, key);
            }
        }
    }

    /**
     * Sign skill content.
     */
    sign(code: string, manifestJSON: string, version: string, privateKeyHex: string): SkillSignature {
        const contentHash = this.computeContentHash(code, manifestJSON, version);
        const privateKey = Buffer.from(privateKeyHex, 'hex');

        const signature = sign(null, Buffer.from(contentHash, 'hex'), {
            key: privateKey,
            format: 'der',
            type: 'pkcs8',
        });

        // Derive public key from private for the signature record
        const publicKeyDer = this.derivePublicKey(privateKey);

        return {
            signature: signature.toString('hex'),
            contentHash,
            publicKey: publicKeyDer,
            signedAt: new Date().toISOString(),
        };
    }

    /**
     * Verify a skill signature.
     */
    verify(
        code: string,
        manifestJSON: string,
        version: string,
        sig: SkillSignature,
        publicKeyHex?: string,
    ): boolean {
        const expectedHash = this.computeContentHash(code, manifestJSON, version);

        // Step 1: Content hash must match
        if (sig.contentHash !== expectedHash) {
            return false;
        }

        // Step 2: Verify Ed25519 signature
        const pubKey = publicKeyHex ?? sig.publicKey;
        try {
            return verify(
                null,
                Buffer.from(sig.contentHash, 'hex'),
                { key: Buffer.from(pubKey, 'hex'), format: 'der', type: 'spki' },
                Buffer.from(sig.signature, 'hex'),
            );
        } catch {
            return false;
        }
    }

    /**
     * Check if a signature comes from a trusted publisher.
     */
    isTrustedPublisher(sig: SkillSignature): boolean {
        for (const [, key] of this.trustedKeys) {
            if (key === sig.publicKey) return true;
        }
        return false;
    }

    /**
     * Add a trusted public key.
     */
    addTrustedKey(publisher: string, publicKeyHex: string): void {
        this.trustedKeys.set(publisher, publicKeyHex);
    }

    /**
     * Generate a new Ed25519 key pair.
     */
    static generateKeyPair(): KeyPair {
        const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
            publicKeyEncoding: { type: 'spki', format: 'der' },
            privateKeyEncoding: { type: 'pkcs8', format: 'der' },
        });

        return {
            publicKey: (publicKey as Buffer).toString('hex'),
            privateKey: (privateKey as Buffer).toString('hex'),
        };
    }

    // ─── Internal ───────────────────────────────────────

    private computeContentHash(code: string, manifestJSON: string, version: string): string {
        return createHash('sha256')
            .update(code)
            .update('\0')
            .update(manifestJSON)
            .update('\0')
            .update(version)
            .digest('hex');
    }

    private derivePublicKey(privateKeyDer: Buffer): string {
        try {
            const keyObj = createPrivateKey({ key: privateKeyDer, format: 'der', type: 'pkcs8' });
            const pubDer = keyObj.export({ type: 'spki', format: 'der' });
            return (pubDer as Buffer).toString('hex');
        } catch {
            return '';
        }
    }
}
