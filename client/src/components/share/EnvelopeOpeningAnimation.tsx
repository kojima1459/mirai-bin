import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface EnvelopeOpeningAnimationProps {
    isOpen: boolean;
    onComplete: () => void;
    recipientName?: string;
}

/**
 * Envelope opening animation component
 * Shows a beautiful animation of an envelope opening when the letter is unlocked
 */
export function EnvelopeOpeningAnimation({
    isOpen,
    onComplete,
    recipientName,
}: EnvelopeOpeningAnimationProps) {
    const [phase, setPhase] = useState<"closed" | "opening" | "letter-rising" | "complete">("closed");

    useEffect(() => {
        if (isOpen) {
            // Phase 1: Closed envelope appears
            setPhase("closed");

            // Phase 2: Envelope flap opens
            const openTimer = setTimeout(() => setPhase("opening"), 500);

            // Phase 3: Letter rises out
            const riseTimer = setTimeout(() => setPhase("letter-rising"), 1200);

            // Phase 4: Complete - trigger callback
            const completeTimer = setTimeout(() => {
                setPhase("complete");
                onComplete();
            }, 2500);

            return () => {
                clearTimeout(openTimer);
                clearTimeout(riseTimer);
                clearTimeout(completeTimer);
            };
        }
    }, [isOpen, onComplete]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {phase !== "complete" && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]"
                >
                    {/* Background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-b from-amber-900/10 to-transparent" />

                    {/* Envelope Container */}
                    <div className="relative w-72 h-56 md:w-96 md:h-72">
                        {/* Envelope Body */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="absolute inset-0"
                        >
                            {/* Main envelope body */}
                            <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-b from-amber-600 to-amber-700 rounded-b-lg shadow-2xl">
                                {/* Envelope texture */}
                                <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

                                {/* Decorative line */}
                                <div className="absolute top-4 left-4 right-4 h-[1px] bg-amber-500/30" />
                                <div className="absolute bottom-4 left-4 right-4 h-[1px] bg-amber-800/30" />
                            </div>

                            {/* Envelope back flap (bottom triangle) */}
                            <div
                                className="absolute bottom-0 left-0 right-0 h-[60%]"
                                style={{
                                    clipPath: "polygon(0% 100%, 50% 40%, 100% 100%)",
                                    background: "linear-gradient(to bottom, #b45309, #92400e)",
                                }}
                            />

                            {/* Left flap */}
                            <div
                                className="absolute top-[40%] left-0 w-[50%] h-[60%] bg-amber-800"
                                style={{
                                    clipPath: "polygon(0% 0%, 100% 50%, 0% 100%)",
                                    transformOrigin: "left center",
                                }}
                            />

                            {/* Right flap */}
                            <div
                                className="absolute top-[40%] right-0 w-[50%] h-[60%] bg-amber-800"
                                style={{
                                    clipPath: "polygon(100% 0%, 0% 50%, 100% 100%)",
                                    transformOrigin: "right center",
                                }}
                            />

                            {/* Top flap (animated) */}
                            <motion.div
                                initial={{ rotateX: 0 }}
                                animate={{
                                    rotateX: phase === "closed" ? 0 : 180,
                                }}
                                transition={{ duration: 0.6, ease: "easeInOut" }}
                                style={{
                                    transformOrigin: "top center",
                                    perspective: "1000px",
                                }}
                                className="absolute top-0 left-0 right-0 h-[50%]"
                            >
                                <div
                                    className="w-full h-full bg-gradient-to-b from-amber-500 to-amber-600 shadow-lg"
                                    style={{
                                        clipPath: "polygon(0% 0%, 50% 100%, 100% 0%)",
                                    }}
                                >
                                    {/* Seal */}
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-red-700 shadow-inner flex items-center justify-center">
                                        <div className="w-6 h-6 rounded-full bg-red-800 flex items-center justify-center text-amber-200 text-xs font-bold">
                                            ◆
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Letter paper (rises out) */}
                            <motion.div
                                initial={{ y: 0 }}
                                animate={{
                                    y: phase === "letter-rising" ? -80 : 0,
                                }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="absolute top-[20%] left-[10%] right-[10%] h-[50%] bg-white rounded shadow-lg"
                            >
                                {/* Letter lines */}
                                <div className="absolute top-6 left-4 right-4 space-y-2">
                                    <div className="h-2 bg-gray-200 rounded w-3/4" />
                                    <div className="h-2 bg-gray-200 rounded w-full" />
                                    <div className="h-2 bg-gray-200 rounded w-5/6" />
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>

                    {/* Text below envelope */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 0.5 }}
                        className="absolute bottom-24 text-center"
                    >
                        <p className="text-white/60 text-sm">
                            {recipientName ? `${recipientName}への手紙` : "あなたへの手紙"}
                        </p>
                        <p className="text-white/40 text-xs mt-2">
                            開封中...
                        </p>
                    </motion.div>

                    {/* Particle effects */}
                    {phase === "letter-rising" && (
                        <>
                            {[...Array(8)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{
                                        opacity: 0,
                                        scale: 0,
                                        x: 0,
                                        y: 0,
                                    }}
                                    animate={{
                                        opacity: [0, 1, 0],
                                        scale: [0, 1, 0.5],
                                        x: (Math.random() - 0.5) * 200,
                                        y: -100 - Math.random() * 100,
                                    }}
                                    transition={{
                                        duration: 1,
                                        delay: i * 0.1,
                                    }}
                                    className="absolute top-1/2 left-1/2 w-2 h-2 bg-amber-400/60 rounded-full"
                                    style={{
                                        boxShadow: "0 0 10px 2px rgba(251, 191, 36, 0.4)",
                                    }}
                                />
                            ))}
                        </>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
