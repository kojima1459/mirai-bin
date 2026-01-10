/**
 * Google Analytics 4 integration
 * 
 * Usage:
 *   trackEvent('letter_created', { template: 'birthday' });
 *   trackPageView('/my-letters');
 */

// GA Measurement ID - replace with your actual ID
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';

// Initialize GA4
export function initAnalytics() {
    if (typeof window === 'undefined') return;

    // Check if already initialized
    if ((window as any).gtag) return;

    // Add the gtag script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // Initialize dataLayer and gtag function
    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: any[]) {
        (window as any).dataLayer.push(args);
    }
    (window as any).gtag = gtag;

    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
        send_page_view: false, // We'll handle page views manually
    });
}

// Track page view
export function trackPageView(path: string) {
    if (typeof window === 'undefined' || !(window as any).gtag) return;

    (window as any).gtag('event', 'page_view', {
        page_path: path,
    });
}

// Track custom event
export function trackEvent(
    eventName: string,
    params?: Record<string, string | number | boolean>
) {
    if (typeof window === 'undefined' || !(window as any).gtag) return;

    (window as any).gtag('event', eventName, params);
}

// Common events
export const AnalyticsEvents = {
    LETTER_CREATED: 'letter_created',
    LETTER_OPENED: 'letter_opened',
    LETTER_DELETED: 'letter_deleted',
    AUDIO_RECORDED: 'audio_recorded',
    TEMPLATE_SELECTED: 'template_selected',
    PWA_INSTALLED: 'pwa_installed',
    PUSH_SUBSCRIBED: 'push_subscribed',
    SHARE_LINK_GENERATED: 'share_link_generated',
} as const;
