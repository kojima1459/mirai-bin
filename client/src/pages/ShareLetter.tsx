import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { decryptLetter } from "@/lib/crypto";
import { ShareStateView } from "@/components/share/ShareStateView";
import { UnlockForm } from "@/components/share/UnlockForm";
import { DecryptedLetterView } from "@/components/share/DecryptedLetterView";
import { deriveShareLetterState, ShareLetterState } from "@/lib/shareLetterState";

export default function ShareLetter() {
  const [match, params] = useRoute("/share/:token");
  const shareToken = params?.token || "";
  const { user } = useAuth();

  // UI State
  const [unlockCode, setUnlockCode] = useState("");
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);

  // Decrypted Content
  const [decryptedLetter, setDecryptedLetter] = useState<{
    content: string;
    audioUrl?: string;
  } | null>(null);

  // tRPC Query
  const {
    data,
    isLoading,
    error: fetchError,
    refetch
  } = trpc.letter.getByShareToken.useQuery(
    { shareToken, userAgent: navigator.userAgent },
    {
      retry: false,
      refetchOnWindowFocus: false
    }
  );

  const markOpenedMutation = trpc.letter.markOpened.useMutation();

  // State Derivation
  const state: ShareLetterState = decryptionError
    ? "CODE_INVALID"
    : deriveShareLetterState(data, fetchError);

  // DEV-only: Log state transitions for debugging
  if (import.meta.env.DEV) {
    console.debug(`[ShareLetter] State: ${state}`, {
      canUnlock: data?.canUnlock,
      unlockedAt: data?.letter?.unlockedAt ?? null,
      serverError: data?.error ?? null,
      hasDecryptionError: !!decryptionError,
      hasFetchError: !!fetchError,
    });
  }

  // Effects for meta tag
  useEffect(() => {
    if (data?.letter?.recipientName) {
      document.title = `${data.letter.recipientName}への手紙 | 未来便`;
    }
  }, [data]);

  const handleUnlock = async () => {
    if (!data || !data.canUnlock || !data.unlockEnvelope) return;

    setIsDecrypting(true);
    setDecryptionError(null);

    try {
      // 1. Verify code length format locally
      if (unlockCode.length !== 12) {
        throw new Error("解錠コードは12文字です");
      }

      // 2. Decrypt
      const result = await decryptLetter({
        unlockCode,
        unlockEnvelope: data.unlockEnvelope,
        serverShare: data.serverShare,
        encryptedAudio: data.encryptedAudio,
        letter: {
          encryptionIv: data.letter.encryptionIv,
          ciphertextUrl: data.letter.ciphertextUrl,
        }
      });

      // 3. Mark as opened
      await markOpenedMutation.mutateAsync({ shareToken });

      setDecryptedLetter(result);
    } catch (err: unknown) {
      // DEV-only: Log decryption failure details
      if (import.meta.env.DEV) {
        console.debug("[ShareLetter] Decryption failed:", {
          error: err instanceof Error ? err.message : "Unknown error",
          codeLength: unlockCode.length,
        });
      }
      console.error("Decryption failed:", err);
      setDecryptionError("解除コードが正しくありません");
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleRetry = () => {
    if (state === "CODE_INVALID") {
      setDecryptionError(null);
      setUnlockCode("");
    } else {
      refetch();
      window.location.reload();
    }
  };

  // --- VIEW BRANCHING ---

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 1. Decrypted Content View
  if (decryptedLetter) {
    return (
      <DecryptedLetterView
        content={decryptedLetter.content}
        audioUrl={decryptedLetter.audioUrl}
        recipientName={data?.letter?.recipientName}
        templateUsed={data?.letter?.templateUsed}
        createdAt={data?.letter?.createdAt}
      />
    );
  }

  // 2. Ready to Unlock (Input Form)
  if (state === "READY_TO_UNLOCK") {
    return (
      <UnlockForm
        recipientName={data?.letter?.recipientName}
        templateUsed={data?.letter?.templateUsed}
        unlockCode={unlockCode}
        isDecrypting={isDecrypting}
        onUnlockCodeChange={setUnlockCode}
        onSubmit={handleUnlock}
      />
    );
  }

  // 3. Error / Wait States
  return (
    <ShareStateView
      state={state}
      unlockAt={data?.letter?.unlockAt}
      onRetry={handleRetry}
    />
  );
}
