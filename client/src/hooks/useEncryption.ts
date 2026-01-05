import { useState, useCallback } from "react";
import { encryptLetter, EncryptionResult } from "@/lib/crypto";
import { createProof, ProofData } from "@/lib/proof";

export interface EncryptionState {
  isEncrypting: boolean;
  progress: string;
  result: EncryptionResult | null;
  proof: ProofData | null;
  error: string | null;
}

export interface UseEncryptionReturn extends EncryptionState {
  encrypt: (content: string) => Promise<{ encryption: EncryptionResult; proof: ProofData } | null>;
  reset: () => void;
}

export function useEncryption(): UseEncryptionReturn {
  const [state, setState] = useState<EncryptionState>({
    isEncrypting: false,
    progress: "",
    result: null,
    proof: null,
    error: null,
  });

  const encrypt = useCallback(async (content: string) => {
    try {
      setState((prev) => ({
        ...prev,
        isEncrypting: true,
        progress: "鍵を生成中...",
        error: null,
      }));

      // 暗号化
      setState((prev) => ({ ...prev, progress: "暗号化中..." }));
      const encryptionResult = await encryptLetter(content);

      // ハッシュ生成
      setState((prev) => ({ ...prev, progress: "証跡を生成中..." }));
      const proofData = await createProof(encryptionResult.ciphertext);

      setState({
        isEncrypting: false,
        progress: "完了",
        result: encryptionResult,
        proof: proofData,
        error: null,
      });

      return {
        encryption: encryptionResult,
        proof: proofData,
      };
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isEncrypting: false,
        progress: "",
        error: err instanceof Error ? err.message : "暗号化に失敗しました",
      }));
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isEncrypting: false,
      progress: "",
      result: null,
      proof: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    encrypt,
    reset,
  };
}
