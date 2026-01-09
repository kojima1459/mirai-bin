import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBv_3g0R4WO6ACD2JGPbA5s41DznoOGNKo",
    authDomain: "miraibin.firebaseapp.com",
    projectId: "miraibin",
    storageBucket: "miraibin.firebasestorage.app",
    messagingSenderId: "123192018128",
    appId: "1:123192018128:web:1c5d91372add71ea128ad5",
    measurementId: "G-TYVF2RHVNE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Initialize Analytics (only in browser)
let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== "undefined") {
    analytics = getAnalytics(app);
}

// Auth functions
export async function signInWithGoogle(): Promise<User> {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
}

export async function signOutUser(): Promise<void> {
    await signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
}

export async function getIdToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken();
}

export function getCurrentUser(): User | null {
    return auth.currentUser;
}

export { auth, analytics, app };
