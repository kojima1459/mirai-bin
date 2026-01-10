import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

export default function Contact() {
    const contactEmail = "mk19830920@gmail.com";

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans antialiased">
            {/* Background Grain Texture */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            </div>

            {/* Header */}
            <header className="fixed top-0 w-full z-50 px-6 py-5 flex items-center gap-4 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
                <Link href="/">
                    <Button variant="ghost" size="icon" className="rounded-full text-white/70 hover:text-white hover:bg-white/5">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <span className="font-semibold tracking-tight">お問い合わせ</span>
            </header>

            <main className="pt-28 pb-16 px-6 max-w-2xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-8"
                >
                    <div className="mb-8">
                        <span className="text-xs font-semibold tracking-[0.2em] text-white/40 uppercase block mb-4">Contact</span>
                        <h1 className="text-4xl font-bold tracking-tighter mb-4">お問い合わせ</h1>
                        <p className="text-white/50 leading-relaxed">
                            未来便に関するご質問、ご要望、不具合のご報告などは
                            下記メールアドレスまでお気軽にお問い合わせください。
                        </p>
                    </div>

                    {/* Contact Card */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                <Mail className="h-8 w-8 text-amber-500" />
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold mb-2">メールでのお問い合わせ</h2>
                                <p className="text-white/50 text-sm mb-4">
                                    通常2〜3営業日以内にご返信いたします
                                </p>
                            </div>

                            <a
                                href={`mailto:${contactEmail}`}
                                className="group flex items-center gap-2 px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-white/90 transition-colors"
                            >
                                <Mail className="h-4 w-4" />
                                {contactEmail}
                                <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </a>

                            <p className="text-xs text-white/30 max-w-sm">
                                お問い合わせの際は、アカウントに登録しているメールアドレスからご連絡いただけますと、
                                スムーズに対応できます。
                            </p>
                        </div>
                    </div>

                    {/* FAQ Link */}
                    <div className="text-center pt-4">
                        <p className="text-white/40 text-sm mb-3">
                            よくある質問は FAQ でご確認いただけます
                        </p>
                        <Link href="/faq">
                            <Button variant="outline" className="rounded-full border-white/10 text-white/70 hover:text-white hover:bg-white/5">
                                FAQを見る
                            </Button>
                        </Link>
                    </div>

                    {/* Footer Links */}
                    <div className="pt-8 flex justify-center gap-6 text-xs text-white/30">
                        <Link href="/terms">
                            <span className="hover:text-white cursor-pointer transition-colors">利用規約</span>
                        </Link>
                        <Link href="/privacy">
                            <span className="hover:text-white cursor-pointer transition-colors">プライバシーポリシー</span>
                        </Link>
                        <Link href="/">
                            <span className="hover:text-white cursor-pointer transition-colors">ホーム</span>
                        </Link>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
