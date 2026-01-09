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

export interface DecryptedContent {
    content: string;
    audioUrl?: string;
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
            if (data.encryptedAudio) {
                try {
                    const audioRes = await fetch(data.encryptedAudio.url);
                    if (audioRes.ok) {
                        const audioBuffer = await audioRes.arrayBuffer();
                        const audioBlob = await decryptAudio(
                            audioBuffer,
                            data.encryptedAudio.iv || "",
                            keyBase64,
                            data.encryptedAudio.mimeType || "audio/webm"
                        );
                        audioUrl = URL.createObjectURL(audioBlob);
                    }
                } catch (e) {
                    console.warn("Audio decryption failed", e);
                    // Non-fatal error
                }
            }

            // Success side effects
            await markOpenedMutation.mutateAsync({ shareToken }).catch(e => {
                console.warn("Failed to mark as opened", e);
                // Non-fatal
            });

            setDecryptedContent({ content, audioUrl });
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

    const resetState = () => {
        setError(null);
        setDecryptedContent(null);
    };

    return {
        decrypt,
        isDecrypting,
        error,
        decryptedContent,
        resetState
    };
}
