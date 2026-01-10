/**
 * 音声録音ユーティリティ
 * Web Audio API を使用
 */

export interface RecordingResult {
  blob: Blob;
  duration: number; // 秒
  url: string; // Blob URL（プレビュー用）
}

export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startTime: number = 0;
  private stream: MediaStream | null = null;

  async start(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1, // Mono for voice
          sampleRate: 16000, // Whisper推奨
        },
      });

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      this.chunks = [];
      this.startTime = Date.now();

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.chunks.push(e.data);
        }
      };

      this.mediaRecorder.start();
    } catch (error) {
      console.error("録音開始エラー:", error);
      throw new Error("マイクへのアクセスが拒否されました");
    }
  }

  async stop(): Promise<RecordingResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("録音が開始されていません"));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: "audio/webm" });
        const duration = Math.floor((Date.now() - this.startTime) / 1000);
        const url = URL.createObjectURL(blob);

        // ストリームを停止
        this.stream?.getTracks().forEach((track) => track.stop());

        resolve({ blob, duration, url });
      };

      this.mediaRecorder.stop();
    });
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === "recording";
  }

  cleanup(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.mediaRecorder = null;
    this.stream = null;
    this.chunks = [];
  }
}

// Blob を Base64 に変換
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // data:audio/webm;base64, を除去
      const base64Data = base64.split(",")[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// 録音時間のフォーマット（MM:SS）
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
