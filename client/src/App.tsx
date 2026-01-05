import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import CreateLetter from "./pages/CreateLetter";
import MyLetters from "./pages/MyLetters";
import ShareLetter from "./pages/ShareLetter";
import Drafts from "./pages/Drafts";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import HowToUse from "./pages/HowToUse";
import FAQ from "./pages/FAQ";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/create"} component={CreateLetter} />
      <Route path={"/my-letters"} component={MyLetters} />
      <Route path={"/share/:token"} component={ShareLetter} />
      <Route path={"/drafts"} component={Drafts} />
      <Route path={"/privacy"} component={Privacy} />
      <Route path={"/terms"} component={Terms} />
      <Route path={"/how-to-use"} component={HowToUse} />
      <Route path={"/faq"} component={FAQ} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <PWAInstallPrompt />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
