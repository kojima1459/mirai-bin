import { motion } from "framer-motion";
import { Mic, Lock, Send } from "lucide-react";

const steps = [
    {
        icon: Mic,
        title: "声を吹き込む",
        desc: "最大90秒のメッセージと、\nテキストで想いを綴ります。"
    },
    {
        icon: Lock,
        title: "未来を指定して封緘",
        desc: "明日でも、10年後でも。\nその時が来るまで、誰も開けません。"
    },
    {
        icon: Send,
        title: "URLを共有",
        desc: "発行されたリンクと解錠コードを\n大切な人に渡すだけ。"
    }
];

export function HowItWorks() {
    return (
        <section className="py-32 bg-[#050505] text-white px-6 border-t border-white/5">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-24"
                >
                    <span className="text-xs font-semibold tracking-[0.2em] text-white/40 uppercase mb-4 block">Process</span>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">想いを届ける、<br />最もシンプルな方法。</h2>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-12 relative">
                    {steps.map((step, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.2, duration: 0.6 }}
                            className="relative flex flex-col items-center text-center space-y-6 group"
                        >
                            <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-white/20 group-hover:bg-white/10 transition-colors duration-500">
                                <step.icon strokeWidth={1} className="w-8 h-8 text-white/80" />
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-xl font-semibold tracking-tight">{step.title}</h3>
                                <p className="text-sm text-white/50 leading-loose whitespace-pre-wrap">{step.desc}</p>
                            </div>

                            {/* Connector Line (Desktop only) */}
                            {idx !== steps.length - 1 && (
                                <div className="hidden md:block absolute top-10 left-[calc(50%+40px)] w-[calc(100%-80px)] h-[1px] bg-gradient-to-r from-white/10 to-transparent" />
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
