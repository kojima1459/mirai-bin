import admin from "firebase-admin";
import { ENV } from "./env";

// Initialize Firebase Admin SDK
// In production, use service account credentials from environment
// For development, use default credentials or emulator

let firebaseApp: admin.app.App;

try {
    // Check if already initialized
    firebaseApp = admin.app();
} catch {
    // Initialize with project ID only (uses Application Default Credentials in production)
    firebaseApp = admin.initializeApp({
        projectId: "miraibin",
    });
}

export const firebaseAuth = admin.auth(firebaseApp);

/**
 * Verify Firebase ID token from Authorization header
 * @param authHeader - "Bearer <token>" format
 * @returns Decoded token with user info, or null if invalid
 */
export async function verifyIdToken(authHeader: string | undefined): Promise<admin.auth.DecodedIdToken | null> {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix

    try {
        const decodedToken = await firebaseAuth.verifyIdToken(token);
        return decodedToken;
    } catch (error) {
        console.warn("[Firebase Auth] Token verification failed:", error);
        return null;
    }
}

/**
 * Get user info from Firebase Auth
 * @param uid - Firebase user UID
 * @returns User record with email, name, etc.
 */
export async function getFirebaseUser(uid: string): Promise<admin.auth.UserRecord | null> {
    try {
        return await firebaseAuth.getUser(uid);
    } catch (error) {
        console.warn("[Firebase Auth] Failed to get user:", error);
        return null;
    }
}
