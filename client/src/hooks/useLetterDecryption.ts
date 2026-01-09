import { useState } from "react";
import { decryptLetter, unwrapClientShare, decryptAudio } from "@/lib/crypto";
import { combineShares } from "@/lib/shamir";
import { trpc } from "@/lib/trpc";
import { RouterOutput } from "@/lib/trpc";

// Type alias for the trpc output
type LetterData = RouterOutput["letter"]["getByShareToken"];

interface UseLetterDecryptionProps {
    shareToken: string;
    onSuccess: () => void;
}

export type DecryptionErrorType = "AUTH" | "NETWORK" | "SYSTEM" | null;

export type AudioDecryptError = "DECODE_FAILED" | "UNSUPPORTED_MIME" | null;

export interface DecryptedContent {
    content: string;
    audioUrl?: string;
    audioBlob?: Blob;
    audioError?: AudioDecryptError;
}

export function useLetterDecryption({ shareToken, onSuccess }: UseLetterDecryptionProps) {
    const [isDecrypting, setIsDecrypting] = useState(false);
    const [error, setError] = useState<DecryptionErrorType>(null);
    const [decryptedContent, setDecryptedContent] = useState<DecryptedContent | null>(null);

    const markOpenedMutation = trpc.letter.markOpened.useMutation();

    const decrypt = async (unlockCode: string, data: LetterData) => {
        if (!data || !data.canUnlock || !data.unlockEnvelope) {
            setError("SYSTEM");
            return;
        }

        setIsDecrypting(true);
        setError(null);

        try {
            // Validate Input
            if (unlockCode.length !== 12) {
                throw new Error("INVALID_CODE_FORMAT");
            }

            // Check required data
            if (!data.serverShare || !data.letter?.ciphertextUrl || !data.letter?.encryptionIv) {
                console.error("Missing encryption data");
                throw new Error("MISSING_DATA");
            }

            // Client Share Unwrap
            let clientShare;
            try {
                clientShare = await unwrapClientShare(data.unlockEnvelope, unlockCode);
            } catch (e) {
                // If unwrap fails, it's almost certainly a wrong code (Auth error)
                throw new Error("AUTH_FAILED");
            }

            // Combine Shares
            const keyBase64 = await combineShares(clientShare, data.serverShare);

            // Fetch Ciphertext
            let ciphertext;
            try {
                const res = await fetch(data.letter.ciphertextUrl);
                if (!res.ok) throw new Error("Fetch failed");
                ciphertext = await res.text();
            } catch (e) {
                throw new Error("NETWORK_FAILED");
            }

            // Decrypt Letter
            const content = await decryptLetter(
                ciphertext,
                data.letter.encryptionIv,
                keyBase64
            );

            // Decrypt Audio (Optional)
            let audioUrl: string | undefined;
            let audioBlob: Blob | undefined;
            let audioError: AudioDecryptError = null;

            if (data.encryptedAudio) {
                try {
                    const audioRes = await fetch(data.encryptedAudio.url);
                    if (audioRes.ok) {
                        const audioBuffer = await audioRes.arrayBuffer();
                        const mimeType = data.encryptedAudio.mimeType || "audio/webm";

                        // Safari互換性チェック（audio/webmはSafariで非対応の可能性）
                        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
                        if (isSafari && mimeType.includes("webm")) {
                            console.warn("Safari detected with webm audio - may not play");
                        }

                        audioBlob = await decryptAudio(
                            audioBuffer,
                            data.encryptedAudio.iv || "",
                            keyBase64,
                            mimeType
                        );
                        audioUrl = URL.createObjectURL(audioBlob);
                    }
                } catch (e) {
                    console.warn("Audio decryption failed", e);
                    audioError = "DECODE_FAILED";
                    // Non-fatal error - continue with text
                }
            }

            // Success side effects
            await markOpenedMutation.mutateAsync({ shareToken }).catch(e => {
                console.warn("Failed to mark as opened", e);
                // Non-fatal
            });

            setDecryptedContent({ content, audioUrl, audioBlob, audioError });
            onSuccess();

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);

            if (message === "AUTH_FAILED" || message === "INVALID_CODE_FORMAT") {
                setError("AUTH");
            } else if (message === "NETWORK_FAILED") {
                setError("NETWORK");
            } else {
                console.error("Decryption system error:", err);
                // Fallback: If it was a crypto error during unwrap that wasn't caught specifically
                // it might render as a System error, but usually unwrap throws specific errors.
                // For safety in this specific user flow, general crypto failures are often bad passwords.
                // But we distinguished unwrap above.
                setError("SYSTEM");
            }
        } finally {
            setIsDecrypting(false);
        }
    };

    /**
     * 緊急復号: backupShare + serverShare で復号
     * 解錠コードを紛失した場合に使用
     */
    const decryptWithBackup = async (backupShare: string, data: LetterData) => {
        if (!data || !data.canUnlock || !data.serverShare) {
            setBackupError("DECRYPT_FAILED");
            return;
        }

        setIsDecrypting(true);
        setBackupError(null);

        try {
            // Validate Input
            if (backupShare.length < 10) {
                throw new Error("INVALID_FORMAT");
            }

            // Check required data
            if (!data.letter?.ciphertextUrl || !data.letter?.encryptionIv) {
                console.error("Missing encryption data");
                throw new Error("MISSING_DATA");
            }

            // Combine backupShare + serverShare (instead of clientShare + serverShare)
            let keyBase64;
            try {
                keyBase64 = await combineShares(backupShare, data.serverShare);
            } catch (e) {
                console.error("Failed to combine shares:", e);
                throw new Error("DECRYPT_FAILED");
            }

            // Fetch Ciphertext
            let ciphertext;
            try {
                const res = await fetch(data.letter.ciphertextUrl);
                if (!res.ok) throw new Error("Fetch failed");
                ciphertext = await res.text();
            } catch (e) {
                throw new Error("NETWORK_FAILED");
            }

            // Decrypt Letter
            let content;
            try {
                content = await decryptLetter(
                    ciphertext,
                    data.letter.encryptionIv,
                    keyBase64
                );
            } catch (e) {
                console.error("Letter decryption failed:", e);
                throw new Error("DECRYPT_FAILED");
            }

            // Decrypt Audio (Optional)
            let audioUrl: string | undefined;
            let audioBlob: Blob | undefined;
            let audioError: AudioDecryptError = null;

            if (data.encryptedAudio) {
                try {
                    const audioRes = await fetch(data.encryptedAudio.url);
                    if (audioRes.ok) {
                        const audioBuffer = await audioRes.arrayBuffer();
                        const mimeType = data.encryptedAudio.mimeType || "audio/webm";

                        audioBlob = await decryptAudio(
                            audioBuffer,
                            data.encryptedAudio.iv || "",
                            keyBase64,
                            mimeType
                        );
                        audioUrl = URL.createObjectURL(audioBlob);
                    }
                } catch (e) {
                    console.warn("Audio decryption failed", e);
                    audioError = "DECODE_FAILED";
                }
            }

            // Success side effects
            await markOpenedMutation.mutateAsync({ shareToken }).catch(e => {
                console.warn("Failed to mark as opened", e);
            });

            setDecryptedContent({ content, audioUrl, audioBlob, audioError });
            onSuccess();

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);

            if (message === "INVALID_FORMAT") {
                setBackupError("INVALID_FORMAT");
            } else if (message === "NETWORK_FAILED") {
                setError("NETWORK");
            } else {
                setBackupError("DECRYPT_FAILED");
            }
        } finally {
            setIsDecrypting(false);
        }
    };

    const [backupError, setBackupError] = useState<"INVALID_FORMAT" | "DECRYPT_FAILED" | null>(null);

    const resetState = () => {
        setError(null);
        setBackupError(null);
        setDecryptedContent(null);
    };

    return {
        decrypt,
        decryptWithBackup,
        isDecrypting,
        error,
        backupError,
        decryptedContent,
        resetState
    };
}
