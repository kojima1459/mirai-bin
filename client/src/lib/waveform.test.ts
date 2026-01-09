import { describe, it, expect } from "vitest";
import { generatePeaks } from "./waveform";

describe("generatePeaks", () => {
    it("returns array of specified length", () => {
        const channelData = new Float32Array([0.5, -0.5, 0.3, -0.3, 0.8, -0.8, 0.1, -0.1]);
        const peaks = generatePeaks(channelData, 4);

        expect(peaks).toHaveLength(4);
    });

    it("normalizes values between 0 and 1", () => {
        const channelData = new Float32Array([0.5, -1.0, 0.3, -0.3, 0.8, -0.8, 0.1, -0.1]);
        const peaks = generatePeaks(channelData, 4);

        peaks.forEach(peak => {
            expect(peak).toBeGreaterThanOrEqual(0);
            expect(peak).toBeLessThanOrEqual(1);
        });

        // 最大値が1になっていることを確認
        expect(Math.max(...peaks)).toBe(1);
    });

    it("handles empty input", () => {
        const channelData = new Float32Array([]);
        const peaks = generatePeaks(channelData, 10);

        expect(peaks).toHaveLength(10);
        peaks.forEach(peak => {
            expect(peak).toBe(0);
        });
    });

    it("handles single-sample input", () => {
        const channelData = new Float32Array([0.5]);
        const peaks = generatePeaks(channelData, 5);

        expect(peaks).toHaveLength(5);
        expect(peaks[0]).toBe(1); // 正規化されて1になる
        // 残りは0
        for (let i = 1; i < 5; i++) {
            expect(peaks[i]).toBe(0);
        }
    });

    it("finds maximum absolute value in each segment", () => {
        // 各セグメントの最大絶対値をテスト
        const channelData = new Float32Array([
            0.1, 0.2,  // segment 0: max = 0.2
            -0.8, 0.1, // segment 1: max = 0.8 (absolute)
            0.4, 0.4,  // segment 2: max = 0.4
            0.0, 0.0   // segment 3: max = 0.0
        ]);
        const peaks = generatePeaks(channelData, 4);

        // 最大値(0.8)で正規化されるので
        expect(peaks[0]).toBeCloseTo(0.2 / 0.8);
        expect(peaks[1]).toBe(1); // 0.8 / 0.8 = 1
        expect(peaks[2]).toBeCloseTo(0.4 / 0.8);
        expect(peaks[3]).toBe(0);
    });

    it("handles input length less than numPeaks", () => {
        const channelData = new Float32Array([0.5, -0.3]);
        const peaks = generatePeaks(channelData, 10);

        expect(peaks).toHaveLength(10);
        // 最初の2つは値があり、残りは0
        expect(peaks[0]).toBe(1);    // 0.5 / 0.5 = 1
        expect(peaks[1]).toBeCloseTo(0.3 / 0.5);
    });

    it("handles all zero input", () => {
        const channelData = new Float32Array([0, 0, 0, 0]);
        const peaks = generatePeaks(channelData, 2);

        expect(peaks).toHaveLength(2);
        peaks.forEach(peak => {
            expect(peak).toBe(0);
        });
    });

    it("uses default numPeaks of 200 when not specified", () => {
        // 大きな配列を作成
        const channelData = new Float32Array(1000);
        for (let i = 0; i < 1000; i++) {
            channelData[i] = Math.sin(i * 0.1);
        }

        const peaks = generatePeaks(channelData);
        expect(peaks).toHaveLength(200);
    });
});
