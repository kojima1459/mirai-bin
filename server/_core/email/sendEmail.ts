/**
 * Email Sending Adapter
 * 
 * Supports multiple providers:
 * - mock: console.log only (development)
 * - sendgrid: real SendGrid delivery (production)
 * - ses: AWS SES (future, same interface)
 * 
 * Security: NEVER include unlock codes, backup shares, or plaintext content
 * Rate limiting: Prevents duplicate sends within 24 hours per letter/type
 */

import { ENV } from "../env";

export interface SendEmailParams {
    to: string;
    subject: string;
    text: string;
    html?: string;
    category?: string;  // For SendGrid analytics
    meta?: Record<string, unknown>;  // For logging/debugging
}

export interface SendEmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

// In-memory rate limiter: key = `${letterId}:${type}`, value = timestamp
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if we should rate-limit this send
 */
export function shouldRateLimit(letterId: number, type: string): boolean {
    const key = `${letterId}:${type}`;
    const lastSent = rateLimitMap.get(key);
    if (lastSent && Date.now() - lastSent < RATE_LIMIT_MS) {
        return true;
    }
    return false;
}

/**
 * Mark a send as completed (for rate limiting)
 */
export function markSent(letterId: number, type: string): void {
    const key = `${letterId}:${type}`;
    rateLimitMap.set(key, Date.now());
}

/**
 * Clear rate limit (for testing)
 */
export function clearRateLimit(letterId: number, type: string): void {
    const key = `${letterId}:${type}`;
    rateLimitMap.delete(key);
}

/**
 * Send email using configured provider
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    const provider = ENV.mailProvider;

    console.log(`[Email] Sending via ${provider} to ${params.to}: ${params.subject}`);

    if (provider === "mock") {
        return sendMockEmail(params);
    } else if (provider === "sendgrid") {
        return sendSendGridEmail(params);
    } else {
        console.warn(`[Email] Unknown provider "${provider}", falling back to mock`);
        return sendMockEmail(params);
    }
}

/**
 * Mock provider: just log to console
 */
async function sendMockEmail(params: SendEmailParams): Promise<SendEmailResult> {
    console.log("=".repeat(60));
    console.log("[Email Mock] Would send email:");
    console.log(`  To: ${params.to}`);
    console.log(`  Subject: ${params.subject}`);
    console.log(`  Category: ${params.category || "none"}`);
    console.log(`  Text Preview: ${params.text.substring(0, 200)}...`);
    if (params.meta) {
        console.log(`  Meta: ${JSON.stringify(params.meta)}`);
    }
    console.log("=".repeat(60));

    return { success: true, messageId: `mock-${Date.now()}` };
}

/**
 * SendGrid provider: real email delivery
 */
async function sendSendGridEmail(params: SendEmailParams): Promise<SendEmailResult> {
    if (!ENV.sendgridApiKey) {
        console.error("[Email] SENDGRID_API_KEY not configured");
        return { success: false, error: "SENDGRID_API_KEY not configured" };
    }

    if (!ENV.mailFrom) {
        console.error("[Email] MAIL_FROM not configured");
        return { success: false, error: "MAIL_FROM not configured" };
    }

    try {
        // Dynamic import to avoid bundling issues when not using SendGrid
        const sgMail = await import("@sendgrid/mail");
        sgMail.default.setApiKey(ENV.sendgridApiKey);

        const msg: {
            to: string;
            from: string;
            subject: string;
            text: string;
            html?: string;
            categories?: string[];
        } = {
            to: params.to,
            from: ENV.mailFrom,
            subject: params.subject,
            text: params.text,
        };

        if (params.html) {
            msg.html = params.html;
        }

        if (params.category) {
            msg.categories = [params.category];
        }

        const [response] = await sgMail.default.send(msg);

        console.log(`[Email] SendGrid success: ${response.statusCode}`);
        return {
            success: true,
            messageId: response.headers["x-message-id"] as string || `sg-${Date.now()}`
        };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("[Email] SendGrid error:", errorMsg);
        return { success: false, error: errorMsg };
    }
}
