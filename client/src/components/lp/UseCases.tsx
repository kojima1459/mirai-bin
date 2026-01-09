import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

const cases = [
    {
        target: "10年後の自分へ",
        desc: "今の情熱や悩みは、未来の財産になる。",
        date: "2034.01.01",
        theme: "bg-zinc-900 border-zinc-800"
    },
    {
        target: "成人する我が子へ",
        desc: "生まれた日の喜びを、声のまま残す。",
        date: "2042.04.01",
        theme: "bg-zinc-900 border-zinc-800"
    },
    {
        target: "結婚する親友へ",
        desc: "式前夜に届く、独身最後のメッセージ。",
        date: "2024.12.24",
        theme: "bg-zinc-900 border-zinc-800"
    }
];

export function UseCases() {
    return (
        <section className="py-32 bg-[#050505] text-white px-6 border-t border-white/5">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="text-xs font-semibold tracking-[0.2em] text-white/40 uppercase mb-4 block">Stories</span>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">時を超える、<br className="md:hidden" />想いの贈り物。</h2>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-6">
                    {cases.map((item, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1, duration: 0.5 }}
                        >
                            <Card className={`h-full ${item.theme} text-white border-white/10 hover:border-white/20 transition-all duration-500`}>
                                <CardContent className="p-8 flex flex-col h-full bg-transparent">
                                    <div className="mb-8">
                                        <div className="text-xs font-mono text-white/30 mb-2">UNLOCK DATE</div>
                                        <div className="text-xl font-mono tracking-widest text-white/70">{item.date}</div>
                                    </div>
                                    <div className="mt-auto space-y-3">
                                        <h3 className="text-xl font-bold">{item.target}</h3>
                                        <p className="text-sm text-white/50">{item.desc}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
