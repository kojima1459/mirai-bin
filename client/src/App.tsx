import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Home from "./pages/Home";
import CreateLetter from "./pages/CreateLetter";
import MyLetters from "./pages/MyLetters";
import ShareLetter from "./pages/ShareLetter";
import Drafts from "./pages/Drafts";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import HowToUse from "./pages/HowToUse";
import FAQ from "./pages/FAQ";
import Settings from "./pages/Settings";
import LetterDetail from "./pages/LetterDetail";
import AccountRecovery from "./pages/AccountRecovery";
import Login from "./pages/Login";
import Interview from "./pages/Interview";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";

// Protected route wrapper
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="animate-pulse text-lg text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path={"/login"} component={Login} />
      <Route path={"/privacy"} component={Privacy} />
      <Route path={"/terms"} component={Terms} />
      <Route path={"/share/:token"} component={ShareLetter} />

      {/* Protected routes */}
      <Route path={"/"}>
        <ProtectedRoute component={Home} />
      </Route>
      <Route path={"/create"}>
        <ProtectedRoute component={CreateLetter} />
      </Route>
      <Route path={"/interview"}>
        <ProtectedRoute component={Interview} />
      </Route>
      <Route path={"/my-letters"}>
        <ProtectedRoute component={MyLetters} />
      </Route>
      <Route path={"/letter/:id"}>
        <ProtectedRoute component={LetterDetail} />
      </Route>
      <Route path={"/drafts"}>
        <ProtectedRoute component={Drafts} />
      </Route>
      <Route path={"/how-to-use"}>
        <ProtectedRoute component={HowToUse} />
      </Route>
      <Route path={"/faq"}>
        <ProtectedRoute component={FAQ} />
      </Route>
      <Route path={"/settings"}>
        <ProtectedRoute component={Settings} />
      </Route>
      <Route path={"/account-recovery"}>
        <ProtectedRoute component={AccountRecovery} />
      </Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
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
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
