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

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/create"} component={CreateLetter} />
      <Route path={"/my-letters"} component={MyLetters} />
      <Route path={"/share/:token"} component={ShareLetter} />
      <Route path={"/drafts"} component={Drafts} />
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
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
