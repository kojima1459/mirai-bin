import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
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
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 shadow-[0_0_40px_rgba(0,0,0,0.5)] backdrop-blur-md">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-white/80" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white tracking-tight">アプリをインストール</h3>
              <p className="text-sm text-white/50 mt-1 leading-relaxed">
                ホーム画面に追加して、いつでも簡単にアクセス
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 -mt-1 -mr-1 text-white/40 hover:text-white hover:bg-white/5 rounded-full"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {isIOS ? (
            // iOS用の手動インストール手順
            <div className="mt-5 space-y-4">
              <p className="text-xs text-white/40 uppercase tracking-[0.1em]">
                iOSでインストール
              </p>
              <ol className="text-sm space-y-3">
                <li className="flex items-center gap-3 text-white/70">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 text-white/60 flex items-center justify-center text-xs font-semibold">
                    1
                  </span>
                  <span>
                    <Share className="inline h-4 w-4 text-blue-400" /> 共有ボタンをタップ
                  </span>
                </li>
                <li className="flex items-center gap-3 text-white/70">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 text-white/60 flex items-center justify-center text-xs font-semibold">
                    2
                  </span>
                  <span>
                    <Plus className="inline h-4 w-4" /> 「ホーム画面に追加」を選択
                  </span>
                </li>
              </ol>
              <Button
                variant="outline"
                className="w-full mt-2 border-white/10 text-white/60 hover:text-white hover:bg-white/5 rounded-full"
                onClick={handleDismiss}
              >
                あとで
              </Button>
            </div>
          ) : (
            // Android/デスクトップ用のインストールボタン
            <div className="mt-5 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-white/10 text-white/60 hover:text-white hover:bg-white/5 rounded-full h-11"
                onClick={handleDismiss}
              >
                あとで
              </Button>
              <Button
                className="flex-1 bg-white text-black hover:bg-white/90 rounded-full font-semibold h-11 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                onClick={handleInstall}
              >
                <Download className="h-4 w-4 mr-2" />
                インストール
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
