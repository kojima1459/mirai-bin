import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { LetterListItem } from "@/components/LetterListItem";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InviteFamilyDialog } from "@/components/InviteFamilyDialog";

import { useLocation, useSearch } from "wouter";
import {
  ArrowLeft,
  Loader2,
  Mail,
  PenLine,
  User,
  Users,
  Link2,
  Filter
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
    <Card>
      <CardContent className="py-16">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Mail className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2">{message}</h2>
            <p className="text-muted-foreground">
              {showFamilyCTA
                ? "家族グループを作成して、メンバーと手紙を共有しましょう"
                : "大切な人への想いを、未来に届けましょう"}
            </p>
          </div>
          {showFamilyCTA ? (
            <div className="flex flex-col gap-2 items-center">
              <Button onClick={() => navigate("/family")}>
                <Users className="mr-2 h-4 w-4" />
                家族グループを管理
              </Button>
              <Button variant="ghost" onClick={() => navigate("/create")}>
                <PenLine className="mr-2 h-4 w-4" />
                手紙を書く
              </Button>
            </div>
          ) : (
            <Button onClick={() => navigate("/create")}>
              <PenLine className="mr-2 h-4 w-4" />
              手紙を書く
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2 ml-2">
                <Mail className="h-5 w-5 text-primary" />
                <span className="font-semibold">マイレター</span>
              </div>
            </div>
            <Button onClick={() => navigate("/create")}>
              <PenLine className="mr-2 h-4 w-4" />
              新しい手紙
            </Button>
          </div>
        </header>

        <main className="container py-8 max-w-3xl">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="private" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">自分だけ</span>
                <span className="sm:hidden">自分</span>
              </TabsTrigger>
              <TabsTrigger value="family" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">家族</span>
                <span className="sm:hidden">家族</span>
              </TabsTrigger>
              <TabsTrigger value="link" className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                <span className="hidden sm:inline">リンク共有</span>
                <span className="sm:hidden">リンク</span>
              </TabsTrigger>
            </TabsList>

            {/* Filter Toggle for Private Tab */}
            {activeTab === "private" && (
              <div className="flex items-center justify-end mb-4 px-1">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="draft-mode" className="text-sm text-muted-foreground cursor-pointer">
                    下書きだけ表示
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
                  <div className="space-y-3">
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
                <div className="flex justify-end mb-4 px-1">
                  <InviteFamilyDialog />
                </div>
                {getCurrentLetters("family").length > 0 ? (
                  <div className="space-y-3">
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
                  <div className="space-y-3">
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
        </main>
      </div>
    </TooltipProvider>
  );
}
