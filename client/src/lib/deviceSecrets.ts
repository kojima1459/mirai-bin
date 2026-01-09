/**
 * Device Secrets - Same-device 1-time unlock code reveal
 * 
 * Security design:
 * 1. Generate a device-specific key via WebCrypto (stored in IndexedDB)
 * 2. Encrypt unlock code with deviceKey before storing
 * 3. On reveal, decrypt and immediately delete from storage
 * 4. Other devices cannot reveal (no deviceKey)
 * 
 * This does NOT store unlock codes on the server - zero-knowledge is preserved.
 */

import { get, set, del, createStore } from "idb-keyval";

// Custom store for device secrets
const deviceSecretsStore = createStore("device-secrets-db", "device-secrets-store");

const DEVICE_KEY_NAME = "device-master-key";

/**
 * Get or create device-specific encryption key
 * This key stays on this device only, never transmitted
 */
async function getOrCreateDeviceKey(): Promise<CryptoKey> {
    const existingKeyData = await get<ArrayBuffer>(DEVICE_KEY_NAME, deviceSecretsStore);

    if (existingKeyData) {
        return crypto.subtle.importKey(
            "raw",
            existingKeyData,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
    }

    // Generate new device key
    const key = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );

    // Export and store
    const keyData = await crypto.subtle.exportKey("raw", key);
    await set(DEVICE_KEY_NAME, keyData, deviceSecretsStore);

    return key;
}

/**
 * Encrypt and store unlock code for later one-time reveal
 * Call this when letter is created successfully
 */
export async function saveEncryptedUnlockCodeOnce(
    letterId: number,
    unlockCode: string
): Promise<void> {
    try {
        const deviceKey = await getOrCreateDeviceKey();

        // Generate IV
        const iv = crypto.getRandomValues(new Uint8Array(12));

        // Encrypt unlock code
        const encoder = new TextEncoder();
        const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            deviceKey,
            encoder.encode(unlockCode)
        );

        // Store encrypted data
        const storeKey = `unlock-code-${letterId}`;
        await set(
            storeKey,
            {
                iv: Array.from(iv),
                ciphertext: Array.from(new Uint8Array(encrypted)),
                savedAt: Date.now(),
            },
            deviceSecretsStore
        );

        console.log(`[DeviceSecrets] Saved encrypted unlock code for letter ${letterId}`);
    } catch (error) {
        console.error("[DeviceSecrets] Failed to save unlock code:", error);
        // Don't throw - this is a convenience feature, not critical
    }
}

/**
 * Reveal and delete unlock code (one-time only)
 * Returns null if not found, already revealed, or on different device
 */
export async function revealAndDeleteUnlockCodeOnce(
    letterId: number
): Promise<string | null> {
    try {
        const storeKey = `unlock-code-${letterId}`;
        const storedData = await get<{
            iv: number[];
            ciphertext: number[];
            savedAt: number;
        }>(storeKey, deviceSecretsStore);

        if (!storedData) {
            console.log(`[DeviceSecrets] No unlock code found for letter ${letterId}`);
            return null;
        }

        const deviceKey = await getOrCreateDeviceKey();

        // Reconstruct IV and ciphertext
        const iv = new Uint8Array(storedData.iv);
        const ciphertext = new Uint8Array(storedData.ciphertext);

        // Decrypt
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            deviceKey,
            ciphertext
        );

        const decoder = new TextDecoder();
        const unlockCode = decoder.decode(decrypted);

        // Delete immediately after successful reveal
        await del(storeKey, deviceSecretsStore);
        console.log(`[DeviceSecrets] Revealed and deleted unlock code for letter ${letterId}`);

        return unlockCode;
    } catch (error) {
        console.error("[DeviceSecrets] Failed to reveal unlock code:", error);
        return null;
    }
}

/**
 * Check if unlock code is available for reveal (without revealing)
 */
export async function hasUnlockCodeStored(letterId: number): Promise<boolean> {
    try {
        const storeKey = `unlock-code-${letterId}`;
        const storedData = await get(storeKey, deviceSecretsStore);
        return !!storedData;
    } catch {
        return false;
    }
}

/**
 * Clear all stored unlock codes (for debugging/testing)
 */
export async function clearAllStoredUnlockCodes(): Promise<void> {
    // This is a simplified implementation - in production you'd iterate and delete
    console.warn("[DeviceSecrets] clearAllStoredUnlockCodes called - not fully implemented");
}
