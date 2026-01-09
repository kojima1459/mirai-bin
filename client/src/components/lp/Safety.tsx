import { motion } from "framer-motion";
import { ShieldCheck, EyeOff, FileKey } from "lucide-react";

export function Safety() {
    return (
        <section className="py-32 bg-[#050505] text-white px-6">
            <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="space-y-8"
                >
                    <span className="text-xs font-semibold tracking-[0.2em] text-white/40 uppercase block">Security</span>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
                        誰も読めない。<br />
                        だから、<br />
                        本当のことが書ける。
                    </h2>
                    <p className="text-lg text-white/60 leading-relaxed font-light">
                        封緘（暗号化）された手紙は、運営者であっても内容を見ることはできません。
                        未来のその瞬間に、解錠コードを持つ受取人だけが開封できます。
                    </p>
                </motion.div>

                <div className="space-y-4">
                    {[
                        {
                            icon: EyeOff,
                            title: "ゼロ知識証明",
                            desc: "本文は端末内で暗号化され、サーバーには乱数として保存されます。"
                        },
                        {
                            icon: FileKey,
                            title: "鍵の分散管理",
                            desc: "開封には「共有リンク」と「解錠コード」の両方が必要です。"
                        },
                        {
                            icon: ShieldCheck,
                            title: "厳格な時限ロック",
                            desc: "指定された日時より1秒でも早い開封は、システム的に不可能です。"
                        }
                    ].map((item, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 + idx * 0.1, duration: 0.5 }}
                            className="group p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                        >
                            <div className="flex items-start gap-5">
                                <div className="mt-1">
                                    <item.icon className="w-5 h-5 text-white/70" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-white mb-2">{item.title}</h3>
                                    <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
