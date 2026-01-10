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

const ONBOARDING_KEY = "silentmemo-onboarding-seen";

export function OnboardingDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(0);

    useEffect(() => {
        const seen = localStorage.getItem(ONBOARDING_KEY);
        if (!seen) {
            const timer = setTimeout(() => setIsOpen(true), 1200);
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
            desc: "今の声と想いを、デジタルな手紙に。\n誰にも読まれない、あなたと大切な人だけのタイムカプセル。",
            icon: <Sparkles className="w-8 h-8 text-white/90" strokeWidth={1.5} />,
            accent: "bg-purple-900/20",
            glow: "from-purple-500/10 to-transparent",
        },
        {
            title: "誰も読めない安全性",
            desc: "手紙は端末内で厳重に暗号化されます。\n運営者であっても、中身を見ることはシステム的に不可能です。",
            icon: <Lock className="w-8 h-8 text-white/90" strokeWidth={1.5} />,
            accent: "bg-blue-900/20",
            glow: "from-blue-500/10 to-transparent",
        },
        {
            title: "想いを届ける仕組み",
            desc: "発行される「共有リンク」と「解錠コード」を\n大切な人に伝えるだけ。その時まで大切に保管されます。",
            icon: <Send className="w-8 h-8 text-white/90" strokeWidth={1.5} />,
            accent: "bg-indigo-900/20",
            glow: "from-indigo-500/10 to-transparent",
        },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-md w-full bg-[#050505] border-white/5 p-0 overflow-hidden sm:rounded-[32px] shadow-2xl shadow-black">
                <DialogTitle className="sr-only">Onboarding Tutorial</DialogTitle>
                <DialogDescription className="sr-only">SilentMemo introduction slides</DialogDescription>

                <div className="relative h-[600px] flex flex-col font-sans antialiased">
                    {/* Grain Texture */}
                    <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none" />

                    {/* Close Button */}
                    <button
                        onClick={handleClose}
                        className="absolute top-6 right-6 z-50 p-2 text-white/30 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Ambience Background */}
                    <div className="absolute inset-0 z-0 overflow-hidden">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 1 }}
                                className={`absolute inset-0 bg-gradient-to-b ${slides[step].glow}`}
                            />
                        </AnimatePresence>
                    </div>

                    {/* Content Body */}
                    <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-10 text-center">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 1.05, y: -20 }}
                                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                className="w-full flex flex-col items-center"
                            >
                                {/* Icon Container with LP-like aesthetic */}
                                <div className={`w-20 h-20 rounded-[24px] ${slides[step].accent} border border-white/10 flex items-center justify-center mb-10 shadow-[0_0_40px_rgba(255,255,255,0.03)] backdrop-blur-md`}>
                                    {slides[step].icon}
                                </div>

                                <div className="space-y-6">
                                    <h2 className="text-3xl font-bold tracking-tighter text-white leading-tight">
                                        {slides[step].title}
                                    </h2>
                                    <p className="text-white/50 text-base leading-relaxed tracking-wide font-medium max-w-[280px] mx-auto">
                                        {slides[step].desc}
                                    </p>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Footer controls */}
                    <div className="relative z-10 p-10 pt-0 space-y-8 text-center">
                        {/* Dots */}
                        <div className="flex justify-center gap-1.5">
                            {slides.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1 rounded-full transition-all duration-500 ${i === step ? "w-8 bg-white/80" : "w-1.5 bg-white/10"
                                        }`}
                                />
                            ))}
                        </div>

                        <Button
                            onClick={nextStep}
                            size="lg"
                            className="w-full h-16 rounded-full bg-white text-black hover:bg-white/90 font-bold text-base transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                        >
                            {step === slides.length - 1 ? (
                                "手紙を書いてみる"
                            ) : (
                                <span className="flex items-center">
                                    次へ <ArrowRight className="ml-2 w-4 h-4" strokeWidth={3} />
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
