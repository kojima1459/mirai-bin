import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";

const faqs = [
    {
        q: "料金はかかりますか？",
        a: "現在はベータ版として、すべての機能を無料でご利用いただけます。将来的に容量追加などの有料プランを提供する可能性があります。"
    },
    {
        q: "運営会社に手紙を読まれませんか？",
        a: "読まれません。本文と音声データは、あなたの端末内で暗号化されてから送信されます。解錠キーは分割され、一部はサーバーに保存されません。技術的に運営者も復元不可能な仕組み（ゼロ知識アーキテクチャ）を採用しています。"
    },
    {
        q: "解錠コードを紛失した場合は？",
        a: "未開封であれば、1回に限り手紙詳細画面から「再発行」が可能です。それも不可能な場合は、作成時に保存した「バックアップコード」をご利用ください。"
    },
    {
        q: "いつから手紙を開けられますか？",
        a: "あなたが指定した「開封日」の午前0時（日本時間）から解錠可能になります。それ以前にアクセスしても、ロック画面が表示されるだけです。"
    },
    {
        q: "共有リンクが他人に知られたら？",
        a: "詳細画面から「リンクを無効化」することで、即座にアクセスを遮断できます。また、手紙を開くにはリンクだけでなく「解錠コード」も必要ですので、リンクだけで中身が見られることはありません。"
    }
];

export function Faq() {
    return (
        <section className="py-32 bg-[#050505] text-white px-6 border-t border-white/5">
            <div className="max-w-3xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="text-xs font-semibold tracking-[0.2em] text-white/40 uppercase mb-4 block">Q&A</span>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">よくある質問</h2>
                </motion.div>

                <Accordion type="single" collapsible className="w-full space-y-4">
                    {faqs.map((item, idx) => (
                        <AccordionItem key={idx} value={`item-${idx}`} className="border-white/10 px-4">
                            <AccordionTrigger className="text-left text-lg hover:no-underline py-6 data-[state=open]:text-white text-white/80 hover:text-white transition-colors">
                                {item.q}
                            </AccordionTrigger>
                            <AccordionContent className="text-white/50 leading-loose pb-6 text-base">
                                {item.a}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </section>
    );
}
