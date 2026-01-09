import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Loader2, Eye } from "lucide-react";

interface UnlockFormProps {
    recipientName?: string;
    templateUsed?: string;
    unlockCode: string;
    isDecrypting: boolean;
    onUnlockCodeChange: (code: string) => void;
    onSubmit: () => void;
}

/**
 * Unlock form for entering the 12-digit unlock code
 * Displayed when state is READY_TO_UNLOCK
 */
export function UnlockForm({
    recipientName,
    templateUsed,
    unlockCode,
    isDecrypting,
    onUnlockCodeChange,
    onSubmit,
}: UnlockFormProps) {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <Card className="max-w-md w-full border-primary/20 shadow-lg">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                        <Lock className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl mb-2">手紙が届いています</CardTitle>
                        <CardDescription>
                            {recipientName}さんへの手紙を開封できます。<br />
                            共有された12桁の解錠コードを入力してください。
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            type="text"
                            placeholder="12桁の解錠コード"
                            className="text-center text-lg tracking-widest uppercase"
                            maxLength={12}
                            value={unlockCode}
                            onChange={(e) => onUnlockCodeChange(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                        />
                    </div>

                    <Button
                        className="w-full h-11 text-base"
                        onClick={onSubmit}
                        disabled={isDecrypting || unlockCode.length < 5}
                    >
                        {isDecrypting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                復号中...
                            </>
                        ) : (
                            <>
                                <Eye className="mr-2 h-4 w-4" />
                                開封する
                            </>
                        )}
                    </Button>

                    {templateUsed && (
                        <div className="text-center pt-2">
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                                テーマ: {templateUsed}
                            </span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
