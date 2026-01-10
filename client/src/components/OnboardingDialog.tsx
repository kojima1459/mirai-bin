import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lock, Send, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ONBOARDING_KEY = "mirai-bin-onboarding-seen";

export function OnboardingDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(0);

    useEffect(() => {
        const seen = localStorage.getItem(ONBOARDING_KEY);
        if (!seen) {
            // 少し待ってから表示（ページ描画後）
            const timer = setTimeout(() => setIsOpen(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        localStorage.setItem(ONBOARDING_KEY, "true");
        setIsOpen(false);
    };

    const nextStep = () => {
        if (step < 2) {
            setStep(step + 1);
        } else {
            handleClose();
        }
    };

    const slides = [
        {
            title: "未来へ、封をする。",
            desc: "今の想いをタイムカプセルのように。\n未来のその瞬間まで、誰にも見られない手紙を残せます。",
            icon: <Sparkles className="w-12 h-12 text-yellow-400" />,
            color: "from-yellow-500/20 to-orange-500/20",
        },
        {
            title: "ゼロ知識の安全性",
            desc: "手紙はあなたの端末内で暗号化されます。\n運営者であっても中身を見ることはできません。",
            icon: <Lock className="w-12 h-12 text-indigo-400" />,
            color: "from-indigo-500/20 to-purple-500/20",

        },
        {
            title: "想いを届ける",
            desc: "発行される「共有リンク」と「解錠コード」を\n大切な人に渡してください。",
            icon: <Send className="w-12 h-12 text-blue-400" />,
            color: "from-blue-500/20 to-cyan-500/20",
        },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-sm w-full bg-[#0a0a0a] border-white/10 p-0 overflow-hidden sm:rounded-3xl">
                <DialogTitle className="sr-only">Onboarding Tutorial</DialogTitle>
                <DialogDescription className="sr-only">App introduction slides</DialogDescription>

                <div className="relative h-[480px] flex flex-col">
                    {/* Close Button */}
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 z-50 p-2 text-white/30 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors backdrop-blur-md"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Background Gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br transition-colors duration-700 ${slides[step].color}`} />
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />

                    {/* Content */}
                    <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 text-center mt-[-40px]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                                transition={{ duration: 0.4 }}
                                className="flex flex-col items-center gap-8"
                            >
                                <div className="w-24 h-24 rounded-3xl bg-white/10 border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.1)] backdrop-blur-xl">
                                    {slides[step].icon}
                                </div>
                                <div className="space-y-4">
                                    <h2 className="text-2xl font-bold text-white tracking-tight">
                                        {slides[step].title}
                                    </h2>
                                    <p className="text-white/60 text-sm leading-7 whitespace-pre-wrap">
                                        {slides[step].desc}
                                    </p>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Footer Controls */}
                    <div className="relative z-10 p-8 pt-0">
                        <div className="flex justify-center gap-2 mb-8">
                            {slides.map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full transition-all duration-300 ${i === step ? "w-6 bg-white" : "bg-white/20"
                                        }`}
                                />
                            ))}
                        </div>

                        <Button
                            onClick={nextStep}
                            className="w-full h-14 rounded-full bg-white text-black hover:bg-white/90 font-bold text-base shadow-lg shadow-white/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {step === slides.length - 1 ? (
                                "はじめる"
                            ) : (
                                <span className="flex items-center">
                                    次へ <ArrowRight className="ml-2 w-4 h-4" />
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
