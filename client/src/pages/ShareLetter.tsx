import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { ShareStateView } from "@/components/share/ShareStateView";
import { UnlockForm } from "@/components/share/UnlockForm";
import { DecryptedLetterView } from "@/components/share/DecryptedLetterView";
import { deriveShareLetterState, ShareLetterState } from "@/lib/shareLetterState";
import { AnimatePresence } from "framer-motion";
import { useLetterDecryption } from "@/hooks/useLetterDecryption";
import { toast } from "sonner";

export default function ShareLetter() {
  const [match, params] = useRoute("/share/:token");
  const shareToken = params?.token || "";
  const { user } = useAuth();

  // UI State
  const [unlockCode, setUnlockCode] = useState("");

  // Custom Hook for Logic Refactor
  const {
    decrypt,
    isDecrypting,
    error: decryptError,
    decryptedContent,
    resetState
  } = useLetterDecryption({
    shareToken,
    onSuccess: () => {
      // Optional: Could trigger confetti or analytics here
    }
  });

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

  // Refactor: Reset hook state when data changes (replaces onSuccess)
  useEffect(() => {
    if (data) {
      resetState();
    }
  }, [data]);

  // State Derivation
  // Map hook specific "AUTH" error to the generic "CODE_INVALID" state for UI compatibility
  const state: ShareLetterState = decryptError === "AUTH"
    ? "CODE_INVALID"
    : deriveShareLetterState(data, fetchError);

  // Effect: Handle Network/System errors via Toast
  useEffect(() => {
    if (decryptError === "NETWORK") {
      toast.error("通信エラーが発生しました", { description: "インターネット接続を確認してください" });
    } else if (decryptError === "SYSTEM") {
      toast.error("システムエラー", { description: "予期せぬエラーが発生しました。時間を置いてお試しください。" });
    }
  }, [decryptError]);

  // DEV-only: Log state transitions
  if (import.meta.env.DEV) {
    console.debug(`[ShareLetter] State: ${state}`, {
      canUnlock: data?.canUnlock,
      decryptError,
    });
  }

  // Effects for meta tag
  useEffect(() => {
    if (data?.letter?.recipientName) {
      document.title = `${data.letter.recipientName}への手紙 | 未来便`;
    }
  }, [data]);

  const handleUnlock = () => {
    if (data) {
      decrypt(unlockCode, data);
    }
  };

  const handleRetry = () => {
    if (state === "CODE_INVALID") {
      resetState();
      setUnlockCode("");
    } else {
      refetch();
      window.location.reload();
    }
  };

  // --- VIEW BRANCHING ---

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">
        <Loader2 className="h-8 w-8 animate-spin text-white/20" />
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {decryptedContent ? (
        <DecryptedLetterView
          key="decrypted"
          content={decryptedContent.content}
          audioUrl={decryptedContent.audioUrl}
          recipientName={data?.letter?.recipientName ?? undefined}
          templateUsed={data?.letter?.templateUsed ?? undefined}
          createdAt={data?.letter?.createdAt}
        />
      ) : state === "READY_TO_UNLOCK" ? (
        <UnlockForm
          key="unlock"
          recipientName={data?.letter?.recipientName ?? undefined}
          templateUsed={data?.letter?.templateUsed ?? undefined}
          unlockCode={unlockCode}
          isDecrypting={isDecrypting}
          onUnlockCodeChange={setUnlockCode}
          onSubmit={handleUnlock}
          decryptionError={decryptError === "AUTH"}
        />
      ) : (
        <ShareStateView
          key="state"
          state={state}
          unlockAt={data?.letter?.unlockAt}
          onRetry={handleRetry}
        />
      )}
    </AnimatePresence>
  );
}
