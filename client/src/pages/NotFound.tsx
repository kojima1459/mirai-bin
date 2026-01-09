import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#050505] text-white font-sans antialiased p-6">
      {/* Background Grain Texture */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md mx-auto text-center relative z-10 space-y-8"
      >
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-white/50" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-4">
          <h1 className="text-6xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
            404
          </h1>
          <h2 className="text-xl font-semibold tracking-tight">
            Page Not Found
          </h2>
          <p className="text-white/50 leading-relaxed max-w-xs mx-auto">
            お探しのページは存在しないか、移動または削除されました。
          </p>
        </div>

        {/* Button */}
        <div className="pt-4">
          <Button
            onClick={handleGoHome}
            className="bg-white text-black hover:bg-white/90 rounded-full font-semibold px-8 py-6 text-base shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            <Home className="w-4 h-4 mr-2" />
            ホームへ戻る
          </Button>
        </div>

        {/* Footer link */}
        <div className="pt-8">
          <Link href="/">
            <span className="text-xs text-white/30 hover:text-white cursor-pointer transition-colors border-b border-transparent hover:border-white/20 pb-0.5">
              mirai-bin
            </span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
