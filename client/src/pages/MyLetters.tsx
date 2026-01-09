import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { LetterListItem } from "@/components/LetterListItem";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InviteFamilyDialog } from "@/components/InviteFamilyDialog";
import { motion } from "framer-motion";

import { useLocation, useSearch, Link } from "wouter";
import {
  ArrowLeft,
  Loader2,
  Mail,
  PenLine,
  User,
  Users,
  Link2,
  Filter,
  Settings
} from "lucide-react";

type LetterScope = "private" | "family" | "link";

export default function MyLetters() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [location, navigate] = useLocation();
  const search = useSearch();

  // URL Query Parsing & Validation
  const getTabFromUrl = (): LetterScope => {
    const params = new URLSearchParams(search);
    const tab = params.get("tab");
    if (tab === "private" || tab === "family" || tab === "link") {
      return tab;
    }
    return "private"; // Default
  };

  const [activeTab, setActiveTabRaw] = useState<LetterScope>(getTabFromUrl());
  const [showDraftsOnly, setShowDraftsOnly] = useState(false);

  // URL Sync Logic
  useEffect(() => {
    const params = new URLSearchParams(search);
    const tab = params.get("tab");

    // Validate and correct URL if needed
    if (!tab || (tab !== "private" && tab !== "family" && tab !== "link")) {
      const newParams = new URLSearchParams(search);
      newParams.set("tab", "private");
      if (tab !== "private") {
        navigate(location + "?tab=private", { replace: true });
      }
    } else if (tab !== activeTab) {
      setActiveTabRaw(tab as LetterScope);
    }
  }, [search, location, navigate, activeTab]);

  const handleTabChange = (val: string) => {
    const newScope = val as LetterScope;
    setActiveTabRaw(newScope);
    // Update URL
    const params = new URLSearchParams(search);
    params.set("tab", newScope);
    navigate(location + "?" + params.toString());
  };

  // Queries
  const privateLetters = trpc.letter.list.useQuery({ scope: "private" });
  const familyLetters = trpc.letter.list.useQuery({ scope: "family" });
  const linkLetters = trpc.letter.list.useQuery({ scope: "link" });

  // Auth Redirect
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/login";
    }
  }, [authLoading, isAuthenticated]);

  const isLoading = authLoading || privateLetters.isLoading || familyLetters.isLoading || linkLetters.isLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <Loader2 className="h-8 w-8 animate-spin text-white/20" />
      </div>
    );
  }

  // Filter Logic
  const getCurrentLetters = (scope: LetterScope) => {
    let rawLetters = [];
    switch (scope) {
      case "private":
        rawLetters = privateLetters.data ?? [];
        break;
      case "family":
        rawLetters = familyLetters.data ?? [];
        break;
      case "link":
        rawLetters = linkLetters.data ?? [];
        break;
    }

    if (scope === "private" && showDraftsOnly) {
      return rawLetters.filter(l => l.status === "draft");
    }
    return rawLetters;
  };

  const renderEmptyState = (message: string, showFamilyCTA = false) => (
    <div className="py-20 text-center">
      <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
        <Mail className="h-8 w-8 text-white/50" />
      </div>
      <h2 className="text-xl font-semibold mb-3 text-white">{message}</h2>
      <p className="text-white/40 mb-8 max-w-sm mx-auto">
        {showFamilyCTA
          ? "家族グループを作成して、メンバーと手紙を共有しましょう"
          : "大切な人への想いを、未来に届けましょう"}
      </p>
      {showFamilyCTA ? (
        <div className="flex flex-col gap-3 items-center">
          <Button onClick={() => navigate("/family")} className="bg-white text-black hover:bg-white/90 rounded-full">
            <Users className="mr-2 h-4 w-4" />
            家族グループを管理
          </Button>
          <Button variant="ghost" onClick={() => navigate("/create")} className="text-white/50 hover:text-white hover:bg-white/5 rounded-full">
            <PenLine className="mr-2 h-4 w-4" />
            手紙を書く
          </Button>
        </div>
      ) : (
        <Button onClick={() => navigate("/create")} className="bg-white text-black hover:bg-white/90 rounded-full">
          <PenLine className="mr-2 h-4 w-4" />
          手紙を書く
        </Button>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#050505] text-white">
        {/* Background Grain Texture */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </div>

        {/* Header - LP style */}
        <header className="fixed top-0 w-full z-50 px-6 py-5 flex justify-between items-center border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full text-white/70 hover:text-white hover:bg-white/5">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="font-semibold tracking-tight">マイレター</span>
          </div>
          <Button onClick={() => navigate("/create")} className="bg-white text-black hover:bg-white/90 rounded-full font-semibold px-5">
            <PenLine className="mr-2 h-4 w-4" />
            新しい手紙
          </Button>
        </header>

        <main className="pt-24 pb-12 px-6 max-w-3xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8 bg-white/5 border border-white/10 rounded-xl p-1 h-auto">
                <TabsTrigger
                  value="private"
                  className="flex items-center gap-2 py-3 rounded-lg data-[state=active]:bg-white data-[state=active]:text-black text-white/60 transition-all"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">自分だけ</span>
                  <span className="sm:hidden">自分</span>
                </TabsTrigger>
                <TabsTrigger
                  value="family"
                  className="flex items-center gap-2 py-3 rounded-lg data-[state=active]:bg-white data-[state=active]:text-black text-white/60 transition-all"
                >
                  <Users className="h-4 w-4" />
                  <span>家族</span>
                </TabsTrigger>
                <TabsTrigger
                  value="link"
                  className="flex items-center gap-2 py-3 rounded-lg data-[state=active]:bg-white data-[state=active]:text-black text-white/60 transition-all"
                >
                  <Link2 className="h-4 w-4" />
                  <span className="hidden sm:inline">リンク共有</span>
                  <span className="sm:hidden">リンク</span>
                </TabsTrigger>
              </TabsList>

              {/* Filter Toggle for Private Tab */}
              {activeTab === "private" && (
                <div className="flex items-center justify-end mb-6">
                  <div className="flex items-center space-x-3 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                    <Filter className="h-4 w-4 text-white/40" />
                    <Label htmlFor="draft-mode" className="text-sm text-white/60 cursor-pointer">
                      下書きだけ
                    </Label>
                    <Switch
                      id="draft-mode"
                      checked={showDraftsOnly}
                      onCheckedChange={setShowDraftsOnly}
                    />
                  </div>
                </div>
              )}

              <div className="min-h-[400px]">
                <TabsContent value="private">
                  {getCurrentLetters("private").length > 0 ? (
                    <div className="space-y-4">
                      {getCurrentLetters("private").map((letter: any) => (
                        <LetterListItem
                          key={letter.id}
                          letter={letter}
                          scope="private"
                        />
                      ))}
                    </div>
                  ) : (
                    renderEmptyState(
                      showDraftsOnly ? "下書きの手紙はありません" : "自分だけの手紙はまだありません"
                    )
                  )}
                </TabsContent>

                <TabsContent value="family">
                  <div className="flex justify-end mb-6">
                    <InviteFamilyDialog />
                  </div>
                  {getCurrentLetters("family").length > 0 ? (
                    <div className="space-y-4">
                      {getCurrentLetters("family").map((letter: any) => (
                        <LetterListItem
                          key={letter.id}
                          letter={letter}
                          scope="family"
                        />
                      ))}
                    </div>
                  ) : (
                    renderEmptyState("家族への手紙はまだありません", true)
                  )}
                </TabsContent>

                <TabsContent value="link">
                  {getCurrentLetters("link").length > 0 ? (
                    <div className="space-y-4">
                      {getCurrentLetters("link").map((letter: any) => (
                        <LetterListItem
                          key={letter.id}
                          letter={letter}
                          scope="link"
                        />
                      ))}
                    </div>
                  ) : (
                    renderEmptyState("リンク共有の手紙はまだありません")
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </motion.div>
        </main>
      </div>
    </TooltipProvider>
  );
}
