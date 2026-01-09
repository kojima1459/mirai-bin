import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { LetterListItem } from "@/components/LetterListItem";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InviteFamilyDialog } from "@/components/InviteFamilyDialog";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

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
  Settings,
  Search,
  ArrowUpDown
} from "lucide-react";

type LetterScope = "private" | "family" | "link";

export default function MyLetters() {
  const { loading: authLoading, isAuthenticated, user } = useAuth();
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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Family creation state
  const [familyName, setFamilyName] = useState("");
  const [isCreatingFamily, setIsCreatingFamily] = useState(false);

  // Family status query
  const { data: familyMemberships, isLoading: familyLoading, refetch: refetchFamily } =
    trpc.family.getMyFamily.useQuery(undefined, { enabled: !!user });
  const myFamily = familyMemberships?.[0];

  // Family create mutation
  const createFamilyMutation = trpc.family.create.useMutation({
    onSuccess: () => {
      toast.success("家族グループを作成しました");
      setFamilyName("");
      refetchFamily();
    },
    onError: (error) => {
      toast.error("作成に失敗しました", { description: error.message });
    },
  });

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      toast.error("グループ名を入力してください");
      return;
    }
    setIsCreatingFamily(true);
    try {
      await createFamilyMutation.mutateAsync({ name: familyName.trim() });
    } finally {
      setIsCreatingFamily(false);
    }
  };

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
      <div className="min-h-screen bg-[#050505] text-white">
        <header className="fixed top-0 w-full z-50 px-6 py-5 flex justify-between items-center border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
          <Skeleton className="h-8 w-32 bg-white/5" />
          <Skeleton className="h-10 w-28 rounded-full bg-white/5" />
        </header>
        <main className="pt-24 pb-12 px-6 max-w-3xl mx-auto">
          <div className="space-y-8">
            <Skeleton className="h-12 w-full rounded-xl bg-white/5" />
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full rounded-xl bg-white/5" />
              ))}
            </div>
          </div>
        </main>
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

    // Filter by draft status (Private only)
    if (scope === "private" && showDraftsOnly) {
      rawLetters = rawLetters.filter(l => l.status === "draft");
    }

    // Filter by Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rawLetters = rawLetters.filter(l =>
        (l.recipientName && l.recipientName.toLowerCase().includes(q)) ||
        (l.templateUsed && l.templateUsed.toLowerCase().includes(q))
      );
    }

    // Sort
    return [...rawLetters].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });
  };

  const renderFamilyEmptyState = () => {
    // No family - show inline creation
    if (!myFamily) {
      return (
        <div className="py-16 text-center space-y-8">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Users className="h-8 w-8 text-white/50" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tighter mb-3">家族グループを作成</h2>
            <p className="text-white/50 max-w-sm mx-auto leading-relaxed">
              家族グループを作って、メンバーと手紙を共有しましょう。
            </p>
          </div>
          <div className="max-w-xs mx-auto space-y-4">
            <Input
              placeholder="グループ名（例: 田中家）"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFamily()}
              className="h-14 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 rounded-xl text-center"
            />
            <Button
              onClick={handleCreateFamily}
              disabled={isCreatingFamily}
              className="w-full bg-white text-black hover:bg-white/90 rounded-full font-semibold h-14"
            >
              {isCreatingFamily ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />作成中...</>
              ) : (
                <><Users className="mr-2 h-4 w-4" />グループを作成</>
              )}
            </Button>
          </div>
        </div>
      );
    }

    // Family exists but no letters
    return (
      <div className="py-24 text-center">
        <div className="relative w-24 h-24 mx-auto mb-8 group">
          <div className="absolute inset-0 bg-white/5 rounded-3xl rotate-6 transition-transform group-hover:rotate-12" />
          <div className="absolute inset-0 bg-white/5 rounded-3xl -rotate-6 transition-transform group-hover:-rotate-12" />
          <div className="relative w-full h-full bg-[#1a1a1a] border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl">
            <Users className="h-10 w-10 text-white/40" />
          </div>
        </div>
        <h2 className="text-xl font-bold mb-4 text-white tracking-tight">家族への手紙はまだありません</h2>
        <p className="text-white/40 mb-10 max-w-sm mx-auto leading-relaxed">
          大切な家族への想いを、未来のその日までお届けします
        </p>
        <div className="flex flex-col gap-4 items-center w-full max-w-xs mx-auto">
          <Button onClick={() => navigate("/create")} className="w-full h-12 bg-white text-black hover:bg-white/90 rounded-full font-semibold">
            <PenLine className="mr-2 h-4 w-4" />
            家族への手紙を書く
          </Button>
          <Button variant="ghost" onClick={() => navigate("/family")} className="w-full text-white/50 hover:text-white hover:bg-white/5 rounded-full">
            <Users className="mr-2 h-4 w-4" />
            メンバーを招待
          </Button>
        </div>
      </div>
    );
  };

  const renderEmptyState = (message: string) => (
    <div className="py-24 text-center">
      <div className="relative w-24 h-24 mx-auto mb-8 group">
        <div className="absolute inset-0 bg-white/5 rounded-3xl rotate-6 transition-transform group-hover:rotate-12" />
        <div className="absolute inset-0 bg-white/5 rounded-3xl -rotate-6 transition-transform group-hover:-rotate-12" />
        <div className="relative w-full h-full bg-[#1a1a1a] border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl">
          <Mail className="h-10 w-10 text-white/40" />
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4 text-white tracking-tight">{message}</h2>
      <p className="text-white/40 mb-10 max-w-sm mx-auto leading-relaxed">
        大切な人への想いを、未来のその日までお届けします
      </p>

      <Button onClick={() => navigate("/create")} className="h-12 px-8 bg-white text-black hover:bg-white/90 rounded-full font-semibold shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all">
        <PenLine className="mr-2 h-4 w-4" />
        未来への手紙を書く
      </Button>
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
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  placeholder="宛名やテンプレートで検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl focus:bg-white/10 transition-all"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
                className="h-11 px-4 bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10 rounded-xl gap-2 shrink-0"
              >
                <ArrowUpDown className="h-4 w-4" />
                {sortOrder === "desc" ? "新しい順" : "古い順"}
              </Button>
            </div>
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

              {/* Scope Description */}
              <div className="mb-6 text-center">
                {activeTab === "private" && (
                  <p className="text-sm text-white/50">
                    <span className="text-white/70 font-medium">自分だけ</span>が見られる手紙です
                  </p>
                )}
                {activeTab === "family" && (
                  <p className="text-sm text-white/50">
                    <span className="text-white/70 font-medium">家族グループ</span>のメンバーに共有されます
                  </p>
                )}
                {activeTab === "link" && (
                  <p className="text-sm text-white/50">
                    <span className="text-white/70 font-medium">URLと解錠コード</span>を知る人が開封できます
                  </p>
                )}
              </div>

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
                    renderFamilyEmptyState()
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
