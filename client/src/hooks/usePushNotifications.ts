/**
 * Push Notifications Hook
 * 
 * Handles Web Push subscription management with:
 * - Browser/PWA support detection
 * - Permission handling
 * - Subscription registration with server
 * 
 * iOS requirement: Must be installed as PWA (standalone mode)
 */

import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";

export interface PushNotificationState {
    isSupported: boolean;
    isPWA: boolean;
    permission: NotificationPermission | "unknown";
    isSubscribed: boolean;
    isLoading: boolean;
    error: string | null;
    needsPWAInstall: boolean;
}

export function usePushNotifications() {
    const [state, setState] = useState<PushNotificationState>({
        isSupported: false,
        isPWA: false,
        permission: "unknown",
        isSubscribed: false,
        isLoading: true,
        error: null,
        needsPWAInstall: false,
    });

    const vapidQuery = trpc.user.getVapidPublicKey.useQuery();
    const statusQuery = trpc.user.getPushStatus.useQuery(undefined, {
        enabled: state.isSupported,
    });
    const registerMutation = trpc.user.registerPushSubscription.useMutation();
    const unregisterMutation = trpc.user.unregisterPushSubscription.useMutation();

    // Check browser support and PWA status
    useEffect(() => {
        const checkSupport = () => {
            const hasSW = "serviceWorker" in navigator;
            const hasPush = "PushManager" in window;
            const hasNotification = "Notification" in window;

            const isSupported = hasSW && hasPush && hasNotification;

            // Check if running as installed PWA (standalone mode)
            const isPWA = window.matchMedia("(display-mode: standalone)").matches ||
                (window.navigator as { standalone?: boolean }).standalone === true;

            // iOS detection
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const needsPWAInstall = isIOS && !isPWA;

            const permission = hasNotification ? Notification.permission : "unknown";

            setState(prev => ({
                ...prev,
                isSupported,
                isPWA,
                needsPWAInstall,
                permission,
                isLoading: false,
            }));
        };

        checkSupport();
    }, []);

    // Update subscription status when server data loads
    useEffect(() => {
        if (statusQuery.data) {
            setState(prev => ({
                ...prev,
                isSubscribed: statusQuery.data.subscriptions.length > 0,
            }));
        }
    }, [statusQuery.data]);

    // Subscribe to push notifications
    const subscribe = useCallback(async () => {
        if (!state.isSupported) {
            setState(prev => ({ ...prev, error: "Push notifications not supported" }));
            return false;
        }

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            // Request permission
            const permission = await Notification.requestPermission();
            setState(prev => ({ ...prev, permission }));

            if (permission !== "granted") {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: "通知の許可が必要です"
                }));
                return false;
            }

            // Get VAPID public key
            const vapidKey = vapidQuery.data?.publicKey;
            if (!vapidKey) {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: "Push configuration not available"
                }));
                return false;
            }

            // Get service worker registration
            const registration = await navigator.serviceWorker.ready;

            // Convert VAPID key to Uint8Array
            const urlBase64ToUint8Array = (base64String: string) => {
                const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
                const base64 = (base64String + padding)
                    .replace(/-/g, "+")
                    .replace(/_/g, "/");
                const rawData = window.atob(base64);
                const outputArray = new Uint8Array(rawData.length);
                for (let i = 0; i < rawData.length; ++i) {
                    outputArray[i] = rawData.charCodeAt(i);
                }
                return outputArray;
            };

            // Subscribe to push service
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey),
            });

            const json = subscription.toJSON();
            if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
                throw new Error("Invalid subscription data");
            }

            // Register with server
            await registerMutation.mutateAsync({
                endpoint: json.endpoint,
                p256dh: json.keys.p256dh,
                auth: json.keys.auth,
                userAgent: navigator.userAgent,
            });

            setState(prev => ({
                ...prev,
                isSubscribed: true,
                isLoading: false
            }));

            // Refresh status
            statusQuery.refetch();
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Subscription failed";
            console.error("[Push] Subscribe error:", err);
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: message
            }));
            return false;
        }
    }, [state.isSupported, vapidQuery.data, registerMutation, statusQuery]);

    // Unsubscribe from push notifications
    const unsubscribe = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                const endpoint = subscription.endpoint;

                // Unsubscribe from browser
                await subscription.unsubscribe();

                // Notify server
                await unregisterMutation.mutateAsync({ endpoint });
            }

            setState(prev => ({
                ...prev,
                isSubscribed: false,
                isLoading: false
            }));

            statusQuery.refetch();
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unsubscribe failed";
            console.error("[Push] Unsubscribe error:", err);
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: message
            }));
            return false;
        }
    }, [unregisterMutation, statusQuery]);

    // Toggle subscription
    const toggle = useCallback(async () => {
        if (state.isSubscribed) {
            return unsubscribe();
        } else {
            return subscribe();
        }
    }, [state.isSubscribed, subscribe, unsubscribe]);

    return {
        ...state,
        subscribe,
        unsubscribe,
        toggle,
        isConfigured: statusQuery.data?.isConfigured ?? false,
    };
}
