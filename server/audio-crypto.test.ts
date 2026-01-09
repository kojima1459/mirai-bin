/**
 * Client-side Audio Encryption Unit Tests
 * 
 * Tests for encryptAudio, decryptAudio, and deriveAudioKey functions
 * using Web Crypto API simulation.
 */
import { describe, expect, it, beforeAll } from "vitest";

// Mock Web Crypto API for Node.js environment
import { webcrypto } from "crypto";

// Set up global crypto for Node.js
if (typeof globalThis.crypto === "undefined") {
    // @ts-expect-error - assigning webcrypto to global
    globalThis.crypto = webcrypto;
}

// Helper functions (copy from crypto.ts for testing)
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return Buffer.from(binary, "binary").toString("base64");
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = Buffer.from(base64, "base64").toString("binary");
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer as ArrayBuffer;
}

// Inline implementations for testing (mirroring crypto.ts)
async function generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

async function exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey("raw", key);
    return arrayBufferToBase64(exported);
}

async function deriveAudioKey(masterKeyBase64: string): Promise<CryptoKey> {
    const masterKeyBytes = base64ToArrayBuffer(masterKeyBase64);

    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        masterKeyBytes,
        "HKDF",
        false,
        ["deriveKey"]
    );

    const salt = new Uint8Array(16); // all zeros
    const info = new TextEncoder().encode("audio-v1");

    return await crypto.subtle.deriveKey(
        {
            name: "HKDF",
            hash: "SHA-256",
            salt: salt,
            info: info,
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

interface AudioEncryptionResult {
    ciphertext: ArrayBuffer;
    iv: string;
    mimeType: string;
    version: string;
}

async function encryptAudio(
    audioData: ArrayBuffer,
    mimeType: string,
    masterKeyBase64: string
): Promise<AudioEncryptionResult> {
    const audioKey = await deriveAudioKey(masterKeyBase64);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        audioKey,
        audioData
    );

    return {
        ciphertext: encrypted,
        iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
        mimeType: mimeType,
        version: "audio-v1",
    };
}

async function decryptAudio(
    encryptedData: ArrayBuffer,
    ivBase64: string,
    masterKeyBase64: string,
    mimeType: string
): Promise<{ data: ArrayBuffer; mimeType: string }> {
    const audioKey = await deriveAudioKey(masterKeyBase64);
    const iv = base64ToArrayBuffer(ivBase64);

    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        audioKey,
        encryptedData
    );

    return { data: decrypted, mimeType };
}

describe("Audio Encryption Unit Tests", () => {
    let masterKeyBase64: string;

    beforeAll(async () => {
        // Generate a test master key
        const key = await generateKey();
        masterKeyBase64 = await exportKey(key);
    });

    describe("deriveAudioKey", () => {
        it("should derive a valid AES-GCM key from masterKey", async () => {
            const audioKey = await deriveAudioKey(masterKeyBase64);

            expect(audioKey).toBeDefined();
            expect(audioKey.algorithm.name).toBe("AES-GCM");
            expect(audioKey.extractable).toBe(false);
            expect(audioKey.usages).toContain("encrypt");
            expect(audioKey.usages).toContain("decrypt");
        });

        it("should derive the same key for the same masterKey", async () => {
            const audioKey1 = await deriveAudioKey(masterKeyBase64);
            const audioKey2 = await deriveAudioKey(masterKeyBase64);

            // Both keys should work to decrypt the same data
            const testData = new TextEncoder().encode("test audio data");
            const iv = crypto.getRandomValues(new Uint8Array(12));

            const encrypted1 = await crypto.subtle.encrypt(
                { name: "AES-GCM", iv },
                audioKey1,
                testData
            );

            // Should be able to decrypt with audioKey2
            const decrypted = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv },
                audioKey2,
                encrypted1
            );

            expect(new Uint8Array(decrypted)).toEqual(testData);
        });

        it("should derive different keys for different masterKeys", async () => {
            const key2 = await generateKey();
            const masterKey2Base64 = await exportKey(key2);

            const audioKey1 = await deriveAudioKey(masterKeyBase64);
            const audioKey2 = await deriveAudioKey(masterKey2Base64);

            // Encrypt with audioKey1
            const testData = new TextEncoder().encode("test audio data");
            const iv = crypto.getRandomValues(new Uint8Array(12));

            const encrypted = await crypto.subtle.encrypt(
                { name: "AES-GCM", iv },
                audioKey1,
                testData
            );

            // Should NOT be able to decrypt with audioKey2
            await expect(
                crypto.subtle.decrypt({ name: "AES-GCM", iv }, audioKey2, encrypted)
            ).rejects.toThrow();
        });
    });

    describe("encryptAudio / decryptAudio", () => {
        it("should encrypt and decrypt audio data correctly", async () => {
            const originalData = new TextEncoder().encode("This is test audio data");
            const mimeType = "audio/webm";

            const encrypted = await encryptAudio(originalData.buffer as ArrayBuffer, mimeType, masterKeyBase64);

            expect(encrypted.version).toBe("audio-v1");
            expect(encrypted.mimeType).toBe(mimeType);
            expect(encrypted.iv).toBeDefined();
            expect(encrypted.ciphertext.byteLength).toBeGreaterThan(0);

            // Ciphertext should be different size from plaintext (GCM adds auth tag)
            expect(encrypted.ciphertext.byteLength).not.toBe(originalData.byteLength);

            // Decrypt
            const decrypted = await decryptAudio(
                encrypted.ciphertext,
                encrypted.iv,
                masterKeyBase64,
                encrypted.mimeType
            );

            expect(decrypted.mimeType).toBe(mimeType);
            expect(new Uint8Array(decrypted.data)).toEqual(originalData);
        });

        it("should fail decryption with wrong masterKey", async () => {
            const originalData = new TextEncoder().encode("Secret audio content");

            const encrypted = await encryptAudio(originalData.buffer as ArrayBuffer, "audio/mp4", masterKeyBase64);

            // Generate a different master key
            const wrongKey = await generateKey();
            const wrongKeyBase64 = await exportKey(wrongKey);

            // Decryption should fail
            await expect(
                decryptAudio(encrypted.ciphertext, encrypted.iv, wrongKeyBase64, encrypted.mimeType)
            ).rejects.toThrow();
        });

        it("should fail decryption with wrong IV", async () => {
            const originalData = new TextEncoder().encode("Another test");

            const encrypted = await encryptAudio(originalData.buffer as ArrayBuffer, "audio/webm", masterKeyBase64);

            // Use a different IV
            const wrongIv = arrayBufferToBase64(crypto.getRandomValues(new Uint8Array(12)).buffer as ArrayBuffer);

            // Decryption should fail
            await expect(
                decryptAudio(encrypted.ciphertext, wrongIv, masterKeyBase64, encrypted.mimeType)
            ).rejects.toThrow();
        });

        it("should handle large audio data", async () => {
            // Simulate 100KB of audio data (within crypto.getRandomValues limit)
            const largeData = new Uint8Array(100 * 1024);
            // Fill with deterministic pattern instead of random data
            for (let i = 0; i < largeData.length; i++) {
                largeData[i] = i % 256;
            }

            const encrypted = await encryptAudio(largeData.buffer as ArrayBuffer, "audio/webm", masterKeyBase64);

            expect(encrypted.ciphertext.byteLength).toBeGreaterThan(largeData.byteLength);

            const decrypted = await decryptAudio(
                encrypted.ciphertext,
                encrypted.iv,
                masterKeyBase64,
                encrypted.mimeType
            );

            expect(new Uint8Array(decrypted.data)).toEqual(largeData);
        });
    });

    describe("Security Properties", () => {
        it("should produce different ciphertext for same plaintext (random IV)", async () => {
            const data = new TextEncoder().encode("Same content").buffer as ArrayBuffer;

            const encrypted1 = await encryptAudio(data, "audio/webm", masterKeyBase64);
            const encrypted2 = await encryptAudio(data, "audio/webm", masterKeyBase64);

            // IVs should be different
            expect(encrypted1.iv).not.toBe(encrypted2.iv);

            // Ciphertexts should be different (due to random IV)
            const cipher1 = new Uint8Array(encrypted1.ciphertext);
            const cipher2 = new Uint8Array(encrypted2.ciphertext);

            let isDifferent = false;
            for (let i = 0; i < cipher1.length; i++) {
                if (cipher1[i] !== cipher2[i]) {
                    isDifferent = true;
                    break;
                }
            }
            expect(isDifferent).toBe(true);
        });

        it("should not expose masterKey in encryption result", async () => {
            const data = new TextEncoder().encode("test").buffer as ArrayBuffer;
            const encrypted = await encryptAudio(data, "audio/webm", masterKeyBase64);

            // Result should not contain the master key
            const resultJson = JSON.stringify({
                iv: encrypted.iv,
                mimeType: encrypted.mimeType,
                version: encrypted.version,
            });

            expect(resultJson).not.toContain(masterKeyBase64);
        });
    });
});
