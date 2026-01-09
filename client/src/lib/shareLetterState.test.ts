import { describe, it, expect } from "vitest";
import { deriveShareLetterState } from "./shareLetterState";

describe("deriveShareLetterState", () => {
    it("returns NETWORK_OR_UNKNOWN on fetch error", () => {
        expect(deriveShareLetterState(undefined, new Error("Net error"))).toBe("NETWORK_OR_UNKNOWN");
    });

    it("returns NETWORK_OR_UNKNOWN on unexpected null data without error", () => {
        expect(deriveShareLetterState(undefined, null)).toBe("NETWORK_OR_UNKNOWN");
    });

    it("returns TOKEN_NOT_FOUND when error is not_found", () => {
        expect(deriveShareLetterState({ error: "not_found" }, null)).toBe("TOKEN_NOT_FOUND");
    });

    it("returns TOKEN_CANCELED when error is canceled", () => {
        expect(deriveShareLetterState({ error: "canceled" }, null)).toBe("TOKEN_CANCELED");
    });

    it("returns TOKEN_REVOKED when error is revoked", () => {
        expect(deriveShareLetterState({ error: "revoked" }, null)).toBe("TOKEN_REVOKED");
    });

    it("returns TOKEN_ROTATED when error is rotated", () => {
        expect(deriveShareLetterState({ error: "rotated" }, null)).toBe("TOKEN_ROTATED");
    });

    it("returns ALREADY_OPENED if unlockedAt is present", () => {
        expect(deriveShareLetterState({ canUnlock: true, letter: { unlockedAt: "2024-01-01T00:00:00Z" } }, null)).toBe("ALREADY_OPENED");
    });

    it("returns NOT_YET_OPENABLE if canUnlock is false", () => {
        expect(deriveShareLetterState({ canUnlock: false, letter: { unlockAt: "2099-01-01T00:00:00Z" } }, null)).toBe("NOT_YET_OPENABLE");
    });

    it("returns READY_TO_UNLOCK if canUnlock is true and no errors", () => {
        expect(deriveShareLetterState({ canUnlock: true, letter: {} }, null)).toBe("READY_TO_UNLOCK");
    });
});
