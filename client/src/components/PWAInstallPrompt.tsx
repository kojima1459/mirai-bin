import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X, Share, Plus, Smartphone } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // 初回表示から3秒後にプロンプトを表示
  useEffect(() => {
    // 既にインストール済みまたは却下済みの場合は表示しない
    if (isInstalled || dismissed) return;

    // ローカルストレージで却下状態を確認
    const dismissedAt = localStorage.getItem("pwa-install-dismissed");
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const now = new Date();
      // 7日以内に却下された場合は表示しない
      if (now.getTime() - dismissedDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
        return;
      }
    }

    // インストール可能またはiOSの場合、3秒後に表示
    if (isInstallable || isIOS) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, isIOS, dismissed]);

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", new Date().toISOString());
  };

  // インストール済みまたは表示しない場合は何も表示しない
  if (isInstalled || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm"
      >
        <Card className="shadow-lg border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
                <Smartphone className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground">アプリをインストール</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  ホーム画面に追加して、いつでも簡単にアクセスできます
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 -mt-1 -mr-1"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {isIOS ? (
              // iOS用の手動インストール手順
              <div className="mt-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  iOSでインストールするには：
                </p>
                <ol className="text-sm space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                      1
                    </span>
                    <span>
                      <Share className="inline h-4 w-4 text-blue-500" /> 共有ボタンをタップ
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                      2
                    </span>
                    <span>
                      <Plus className="inline h-4 w-4" /> 「ホーム画面に追加」を選択
                    </span>
                  </li>
                </ol>
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={handleDismiss}
                >
                  あとで
                </Button>
              </div>
            ) : (
              // Android/デスクトップ用のインストールボタン
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleDismiss}
                >
                  あとで
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                  onClick={handleInstall}
                >
                  <Download className="h-4 w-4 mr-2" />
                  インストール
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
