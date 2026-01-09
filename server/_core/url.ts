/**
 * URL Utility
 * 
 * Centralized URL generation for server-side code.
 * Ensures consistent base URL across all environments.
 * 
 * Priority:
 * 1. APP_BASE_URL (recommended for production)
 * 2. OAUTH_SERVER_URL (legacy fallback, with /api stripped)
 * 3. localhost:5173 (development default)
 */

import { ENV } from "./env";

/**
 * Get the base URL for the application
 * 
 * @returns Base URL without trailing slash
 */
export function getAppBaseUrl(): string {
    // Priority 1: Explicit APP_BASE_URL
    if (ENV.appBaseUrl && ENV.appBaseUrl !== "https://miraibin.web.app") {
        return ENV.appBaseUrl.replace(/\/$/, "");
    }

    // Use configured APP_BASE_URL if set
    if (ENV.appBaseUrl) {
        return ENV.appBaseUrl.replace(/\/$/, "");
    }

    // Priority 2: OAUTH_SERVER_URL (strip /api suffix)
    if (ENV.oAuthServerUrl) {
        return ENV.oAuthServerUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
    }

    // Priority 3: Development default
    return "http://localhost:5173";
}

/**
 * Build a full URL with path and optional query parameters
 * 
 * @param path - Path to append (with or without leading slash)
 * @param params - Optional query parameters
 * @returns Full URL string
 */
export function makeUrl(path: string, params?: Record<string, string>): string {
    const baseUrl = getAppBaseUrl();
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    let url = `${baseUrl}${normalizedPath}`;

    if (params && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams(params);
        url += `?${searchParams.toString()}`;
    }

    return url;
}

/**
 * Generate a letter management URL
 */
export function makeLetterUrl(letterId: number): string {
    return makeUrl(`/letters/${letterId}`);
}

/**
 * Generate a settings verification URL
 */
export function makeVerifyEmailUrl(token: string): string {
    return makeUrl("/settings", { verify: token });
}
