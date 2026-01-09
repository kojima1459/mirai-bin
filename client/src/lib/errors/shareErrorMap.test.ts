import { describe, it, expect } from "vitest";
import {
    SHARE_ERROR_MAP,
    mapServerErrorToCode,
    ShareErrorCode,
} from "./shareErrorMap";

describe("shareErrorMap", () => {
    describe("SHARE_ERROR_MAP completeness", () => {
        const allCodes: ShareErrorCode[] = [
            "TOKEN_NOT_FOUND",
            "TOKEN_CANCELED",
            "TOKEN_REVOKED",
            "TOKEN_ROTATED",
            "NOT_YET_OPENABLE",
            "ALREADY_OPENED",
            "CODE_INVALID",
            "NETWORK_OR_UNKNOWN",
        ];

        it("has config for all error codes", () => {
            allCodes.forEach((code) => {
                expect(SHARE_ERROR_MAP[code]).toBeDefined();
                expect(SHARE_ERROR_MAP[code].title).toBeTruthy();
                expect(SHARE_ERROR_MAP[code].description).toBeTruthy();
                expect(SHARE_ERROR_MAP[code].primaryAction).toBeTruthy();
            });
        });
    });

    describe("mapServerErrorToCode", () => {
        it("maps not_found to TOKEN_NOT_FOUND", () => {
            expect(mapServerErrorToCode("not_found")).toBe("TOKEN_NOT_FOUND");
        });

        it("maps canceled to TOKEN_CANCELED", () => {
            expect(mapServerErrorToCode("canceled")).toBe("TOKEN_CANCELED");
        });

        it("maps revoked to TOKEN_REVOKED", () => {
            expect(mapServerErrorToCode("revoked")).toBe("TOKEN_REVOKED");
        });

        it("maps rotated to TOKEN_ROTATED", () => {
            expect(mapServerErrorToCode("rotated")).toBe("TOKEN_ROTATED");
        });

        it("returns null for undefined", () => {
            expect(mapServerErrorToCode(undefined)).toBeNull();
        });

        it("returns null for unknown error", () => {
            expect(mapServerErrorToCode("unknown_error")).toBeNull();
        });
    });
});
