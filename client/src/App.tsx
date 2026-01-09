import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "./components/PageTransition";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { Loader2 } from "lucide-react";

// Eager load critical pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";

// Lazy load feature pages
const CreateLetter = lazy(() => import("./pages/CreateLetter"));
const MyLetters = lazy(() => import("./pages/MyLetters"));
const ShareLetter = lazy(() => import("./pages/ShareLetter"));
const Drafts = lazy(() => import("./pages/Drafts"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const HowToUse = lazy(() => import("./pages/HowToUse"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Settings = lazy(() => import("./pages/Settings"));
const LetterDetail = lazy(() => import("./pages/LetterDetail"));
const AccountRecovery = lazy(() => import("./pages/AccountRecovery"));
const Interview = lazy(() => import("./pages/Interview"));
const Family = lazy(() => import("./pages/Family"));
const FamilyInvite = lazy(() => import("./pages/FamilyInvite"));
const Notifications = lazy(() => import("./pages/Notifications"));

// Loading fallback
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505]">
      <Loader2 className="h-8 w-8 animate-spin text-white/30" />
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function Router() {
  const [location] = useLocation();

  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait">
        <Switch key={location}>
          <Route path={"/login"}>
            <PageTransition><Login /></PageTransition>
          </Route>
          <Route path={"/privacy"}>
            <PageTransition><Privacy /></PageTransition>
          </Route>
          <Route path={"/terms"}>
            <PageTransition><Terms /></PageTransition>
          </Route>
          <Route path={"/lp"}>
            <PageTransition><Landing /></PageTransition>
          </Route>
          <Route path={"/share/:token"}>
            <PageTransition><ShareLetter /></PageTransition>
          </Route>

          {/* Protected routes */}
          <Route path={"/"}>
            <PageTransition><Home /></PageTransition>
          </Route>
          <Route path={"/create"}>
            <PageTransition><ProtectedRoute component={CreateLetter} /></PageTransition>
          </Route>
          <Route path={"/interview"}>
            <PageTransition><ProtectedRoute component={Interview} /></PageTransition>
          </Route>
          <Route path={"/my-letters"}>
            <PageTransition><ProtectedRoute component={MyLetters} /></PageTransition>
          </Route>
          <Route path={"/letter/:id"}>
            <PageTransition><ProtectedRoute component={LetterDetail} /></PageTransition>
          </Route>
          <Route path={"/drafts"}>
            <PageTransition><ProtectedRoute component={Drafts} /></PageTransition>
          </Route>
          <Route path={"/how-to-use"}>
            <PageTransition><ProtectedRoute component={HowToUse} /></PageTransition>
          </Route>
          <Route path={"/faq"}>
            <PageTransition><ProtectedRoute component={FAQ} /></PageTransition>
          </Route>
          <Route path={"/settings"}>
            <PageTransition><ProtectedRoute component={Settings} /></PageTransition>
          </Route>
          <Route path={"/account-recovery"}>
            <PageTransition><ProtectedRoute component={AccountRecovery} /></PageTransition>
          </Route>
          <Route path={"/family"}>
            <PageTransition><ProtectedRoute component={Family} /></PageTransition>
          </Route>
          <Route path={"/family/invite/:token"}>
            <PageTransition><ProtectedRoute component={FamilyInvite} /></PageTransition>
          </Route>
          <Route path={"/notifications"}>
            <PageTransition><ProtectedRoute component={Notifications} /></PageTransition>
          </Route>
          <Route path={"/404"}>
            <PageTransition><NotFound /></PageTransition>
          </Route>
          {/* Final fallback route */}
          <Route>
            <PageTransition><NotFound /></PageTransition>
          </Route>
        </Switch>
      </AnimatePresence>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <Toaster />
            <PWAInstallPrompt />
            <OfflineIndicator />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
