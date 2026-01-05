import { useState, useCallback, useRef, useEffect } from "react";
import { VoiceRecorder, RecordingResult, blobToBase64 } from "@/lib/audio";

export interface UseVoiceRecorderOptions {
  maxDuration?: number; // 最大録音時間（秒）
  onProgress?: (elapsed: number) => void;
  onComplete?: (result: RecordingResult) => void;
}

export interface UseVoiceRecorderReturn {
  isRecording: boolean;
  elapsed: number;
  remaining: number;
  start: () => Promise<void>;
  stop: () => Promise<RecordingResult | null>;
  result: RecordingResult | null;
  base64: string | null;
  error: string | null;
  reset: () => void;
}

export function useVoiceRecorder(
  options: UseVoiceRecorderOptions = {}
): UseVoiceRecorderReturn {
  const { maxDuration = 90, onProgress, onComplete } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<RecordingResult | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<VoiceRecorder | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const remaining = maxDuration - elapsed;

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (recorderRef.current) {
      recorderRef.current.cleanup();
      recorderRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    try {
      setError(null);
      setResult(null);
      setBase64(null);
      setElapsed(0);

      const recorder = new VoiceRecorder();
      recorderRef.current = recorder;

      await recorder.start();
      setIsRecording(true);

      // タイマー開始
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          onProgress?.(next);

          // 最大時間に達したら自動停止
          if (next >= maxDuration) {
            stop();
          }

          return next;
        });
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "録音の開始に失敗しました");
      cleanup();
    }
  }, [maxDuration, onProgress, cleanup]);

  const stop = useCallback(async (): Promise<RecordingResult | null> => {
    if (!recorderRef.current || !isRecording) {
      return null;
    }

    try {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      const recordingResult = await recorderRef.current.stop();
      setIsRecording(false);
      setResult(recordingResult);

      // Base64に変換
      const base64Data = await blobToBase64(recordingResult.blob);
      setBase64(base64Data);

      onComplete?.(recordingResult);
      return recordingResult;
    } catch (err) {
      setError(err instanceof Error ? err.message : "録音の停止に失敗しました");
      setIsRecording(false);
      return null;
    }
  }, [isRecording, onComplete]);

  const reset = useCallback(() => {
    cleanup();
    setIsRecording(false);
    setElapsed(0);
    setResult(null);
    setBase64(null);
    setError(null);
  }, [cleanup]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isRecording,
    elapsed,
    remaining,
    start,
    stop,
    result,
    base64,
    error,
    reset,
  };
}
