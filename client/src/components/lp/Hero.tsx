import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "wouter";

export function Hero() {
    return (
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden bg-[#050505] text-white px-6">
            {/* Background Ambience */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-900/10 blur-[120px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-900/10 blur-[120px] rounded-full mix-blend-screen" />
                {/* Grain Texture */}
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto text-center space-y-12">
                {/* Main Copy */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-6"
                >
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
                        未来へ、封をする。
                    </h1>
                    <p className="text-lg md:text-xl text-white/60 font-medium tracking-wide max-w-xl mx-auto leading-relaxed">
                        今の声と想いを、デジタルな手紙に。<br className="hidden md:block" />
                        誰にも読まれない、あなたと大切な人だけのタイムカプセル。
                    </p>
                </motion.div>

                {/* CTA */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                    <Link href="/create">
                        <Button
                            size="lg"
                            className="px-8 py-6 text-base rounded-full bg-white text-black hover:bg-white/90 hover:scale-[1.02] transition-all duration-300 font-semibold shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                        >
                            今すぐ手紙を作る
                        </Button>
                    </Link>
                    <span className="text-sm text-white/40">登録不要で試せます</span>
                </motion.div>

                {/* Abstract Visual (CSS Audio Wave) */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 1 }}
                    className="pt-16 flex items-center justify-center gap-1.5 h-16"
                >
                    {[...Array(20)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="w-1 bg-gradient-to-t from-white/10 to-white/50 rounded-full"
                            animate={{
                                height: [16, Math.random() * 48 + 16, 16],
                                opacity: [0.3, 0.8, 0.3]
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: i * 0.05
                            }}
                            style={{ width: '2px' }}
                        />
                    ))}
                </motion.div>
            </div>

            {/* Scroll indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.8 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2"
            >
                <div className="w-[1px] h-12 bg-gradient-to-b from-white/0 via-white/20 to-white/0" />
            </motion.div>
        </section>
    );
}
