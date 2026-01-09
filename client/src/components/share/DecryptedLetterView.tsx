import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface DecryptedLetterViewProps {
    content: string;
    audioUrl?: string;
    recipientName?: string;
    templateUsed?: string;
    createdAt?: string;
}

/**
 * Display view for successfully decrypted letter content
 */
export function DecryptedLetterView({
    content,
    audioUrl,
    recipientName,
    templateUsed,
    createdAt,
}: DecryptedLetterViewProps) {
    return (
        <div className="min-h-screen bg-background py-8 px-4">
            <div className="max-w-2xl mx-auto space-y-6">
                <Card className="border-primary/20 shadow-lg">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <User className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">
                            {recipientName}へ
                        </CardTitle>
                        <CardDescription>
                            {createdAt && format(new Date(createdAt), "yyyy年M月d日", { locale: ja })}に作成
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="prose prose-sm md:prose-base max-w-none dark:prose-invert whitespace-pre-wrap leading-relaxed">
                            {content}
                        </div>

                        {audioUrl && (
                            <div className="bg-muted p-4 rounded-lg mt-6">
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <span>声のメッセージ</span>
                                </h4>
                                <audio controls src={audioUrl} className="w-full" />
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="text-center">
                    <Link href="/">
                        <Button variant="outline">トップページへ</Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
