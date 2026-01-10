import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getIdToken } from "./lib/firebase";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = "/login";
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      async headers() {
        // Get Firebase ID token and send it with requests
        const token = await getIdToken();
        return token ? { authorization: `Bearer ${token}` } : {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

// Safe Analytics Injection (Umami)
const analyticsEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
const analyticsWebsiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID;

if (analyticsEndpoint && analyticsWebsiteId) {
  const s = document.createElement("script");
  s.defer = true;
  s.src = `${analyticsEndpoint.replace(/\/$/, "")}/umami`;
  s.dataset.websiteId = analyticsWebsiteId;
  document.head.appendChild(s);
}

// Google Analytics 4 Injection
const ga4MeasurementId = import.meta.env.VITE_GA4_MEASUREMENT_ID;
if (ga4MeasurementId) {
  const gaScript = document.createElement("script");
  gaScript.async = true;
  gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${ga4MeasurementId}`;
  document.head.appendChild(gaScript);

  (window as any).dataLayer = (window as any).dataLayer || [];
  const gtag = (...args: any[]) => { (window as any).dataLayer.push(args); };
  (window as any).gtag = gtag;
  gtag('js', new Date());
  gtag('config', ga4MeasurementId);
}

// Service Worker Registration with BUILD_ID
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const buildId = import.meta.env.VITE_BUILD_ID;
    navigator.serviceWorker.register(`/sw.js${buildId ? '?v=' + buildId : ''}`)
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
