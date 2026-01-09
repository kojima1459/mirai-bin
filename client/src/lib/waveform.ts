/**
 * 波形生成ユーティリティ
 * 
 * Web Audio API を使用して音声データからピーク配列を生成し、
 * 波形表示に必要なデータを提供する。
 */

// デフォルトの分割数（200本のバー）
const DEFAULT_NUM_PEAKS = 200;

// AudioContextのシングルトン（リソース節約）
let audioContextInstance: AudioContext | null = null;

function getAudioContext(): AudioContext {
    if (!audioContextInstance) {
        audioContextInstance = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContextInstance;
}

/**
 * PCMデータからピーク配列を生成（純粋関数）
 * 
 * @param channelData 音声のチャンネルデータ（Float32Arrayまたはnumber[]）
 * @param numPeaks 生成するピークの数
 * @returns 0〜1に正規化されたピーク配列
 */
export function generatePeaks(
    channelData: Float32Array | number[],
    numPeaks: number = DEFAULT_NUM_PEAKS
): number[] {
    const length = channelData.length;

    // 空の入力
    if (length === 0) {
        return Array(numPeaks).fill(0);
    }

    // サンプル数がピーク数より少ない場合
    if (length < numPeaks) {
        const peaks: number[] = [];
        for (let i = 0; i < length; i++) {
            peaks.push(Math.abs(channelData[i]));
        }
        // 残りを0で埋める
        while (peaks.length < numPeaks) {
            peaks.push(0);
        }
        return normalizePeaks(peaks);
    }

    const samplesPerPeak = Math.floor(length / numPeaks);
    const peaks: number[] = [];

    for (let i = 0; i < numPeaks; i++) {
        const start = i * samplesPerPeak;
        const end = Math.min(start + samplesPerPeak, length);

        let maxAbsValue = 0;
        for (let j = start; j < end; j++) {
            const absValue = Math.abs(channelData[j]);
            if (absValue > maxAbsValue) {
                maxAbsValue = absValue;
            }
        }
        peaks.push(maxAbsValue);
    }

    return normalizePeaks(peaks);
}

/**
 * ピーク配列を0〜1に正規化
 */
function normalizePeaks(peaks: number[]): number[] {
    const maxPeak = Math.max(...peaks);

    // すべて0の場合
    if (maxPeak === 0) {
        return peaks;
    }

    return peaks.map(peak => peak / maxPeak);
}

/**
 * BlobをAudioBufferにデコード
 * 
 * @param blob 音声Blob
 * @returns デコードされたAudioBuffer
 * @throws デコードに失敗した場合
 */
export async function decodeAudioBlob(blob: Blob): Promise<AudioBuffer> {
    const audioContext = getAudioContext();
    const arrayBuffer = await blob.arrayBuffer();

    // AudioContextがsuspendedの場合はresumeを試みる
    if (audioContext.state === "suspended") {
        await audioContext.resume();
    }

    return await audioContext.decodeAudioData(arrayBuffer);
}

/**
 * 音声Blobから波形ピーク配列を生成
 * 
 * @param blob 音声Blob
 * @param numPeaks 生成するピークの数（デフォルト: 200）
 * @returns 0〜1に正規化されたピーク配列
 * @throws デコードに失敗した場合
 */
export async function generateWaveformPeaks(
    blob: Blob,
    numPeaks: number = DEFAULT_NUM_PEAKS
): Promise<number[]> {
    const audioBuffer = await decodeAudioBlob(blob);

    // モノラル: チャンネル0を使用
    // ステレオ以上: チャンネル0を使用（簡略化）
    const channelData = audioBuffer.getChannelData(0);

    return generatePeaks(channelData, numPeaks);
}

// メモリキャッシュ（ページ内で有効）
const peaksCache = new Map<string, number[]>();

/**
 * キャッシュ付きで波形ピーク配列を生成
 * 
 * @param blob 音声Blob
 * @param cacheKey キャッシュキー（Blob URLなど）
 * @param numPeaks 生成するピークの数
 * @returns 0〜1に正規化されたピーク配列
 */
export async function generateWaveformPeaksWithCache(
    blob: Blob,
    cacheKey: string,
    numPeaks: number = DEFAULT_NUM_PEAKS
): Promise<number[]> {
    // キャッシュヒット
    const cached = peaksCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    // 生成
    const peaks = await generateWaveformPeaks(blob, numPeaks);

    // キャッシュに保存
    peaksCache.set(cacheKey, peaks);

    return peaks;
}

/**
 * キャッシュをクリア
 */
export function clearPeaksCache(): void {
    peaksCache.clear();
}
