import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";

export function FinalCta() {
    return (
        <section className="py-40 bg-[#050505] text-white px-6 text-center border-t border-white/5">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="space-y-10"
            >
                <h2 className="text-4xl md:text-6xl font-bold tracking-tighter leading-tight">
                    今日の自分を、<br />
                    未来に残す。
                </h2>

                <div>
                    <Link href="/create">
                        <Button
                            size="lg"
                            className="px-12 py-8 text-lg rounded-full bg-white text-black hover:bg-white/90 hover:scale-[1.02] transition-all duration-300 font-semibold shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                        >
                            最初の一通を作る
                        </Button>
                    </Link>
                    <div className="mt-8">
                        <Link href="/login">
                            <span className="text-sm text-white/30 hover:text-white/60 transition-colors cursor-pointer border-b border-transparent hover:border-white/30 pb-0.5">
                                すでにアカウントをお持ちの方はこちら
                            </span>
                        </Link>
                    </div>
                </div>

                <p className="text-xs text-white/20 pt-20">
                    © 2024 Mirai-Bin. All rights reserved.
                </p>
            </motion.div>
        </section>
    );
}
