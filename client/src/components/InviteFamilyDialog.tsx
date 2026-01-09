import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, CheckCircle2, AlertCircle, Copy, UserPlus, Users, Bug } from "lucide-react";
import { toast } from "sonner";
import { useLocation, useSearch } from "wouter";

interface InviteFamilyDialogProps {
    trigger?: React.ReactNode;
    familyId?: number; // If we already know the family ID
    onSuccess?: () => void;
}

export function InviteFamilyDialog({ trigger, familyId: propFamilyId, onSuccess }: InviteFamilyDialogProps) {
    const [, navigate] = useLocation();
    const searchString = useSearch();
    const [open, setOpen] = useState(false);
    const { user } = useAuth();
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState<"input" | "success">("input");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [inviteUrl, setInviteUrl] = useState<string | null>(null);

    // DEV-only debug mode check
    // IMPORTANT: This will be tree-shaken out in production builds
    const isDebugMode = import.meta.env.DEV && new URLSearchParams(searchString).get("debug") === "1";

    // Context for cache invalidation
    const utils = trpc.useUtils();

    // Query to get family ID if not provided
    const { data: familyMemberships } = trpc.family.getMyFamily.useQuery(undefined, {
        enabled: open && !propFamilyId
    });

    const activeFamily = familyMemberships?.[0];
    const targetFamilyId = propFamilyId ?? activeFamily?.id;
    const isOwner = activeFamily?.ownerUserId === user?.id;

    const inviteMutation = trpc.family.inviteByEmail.useMutation({
        onSuccess: (data) => {
            const url = `${window.location.origin}${data.inviteUrl}`;
            setInviteUrl(url);
            setStep("success");
            toast.success("招待メールを送信しました");
            if (onSuccess) onSuccess();
            // Invalidate caches
            utils.family.listInvites.invalidate();
            utils.family.listMembers.invalidate();
        },
        onError: (err) => {
            // Map errors
            if (err.message.includes("already")) {
                setErrorMsg("このメールアドレスは既に招待済みです。");
            } else if (err.message.includes("not found")) {
                setErrorMsg("家族グループが見つかりません。先に作成してください。");
            } else if (err.message.includes("Unauthorized") || err.message.includes("権限")) {
                setErrorMsg("招待権限がありません。オーナーのみが招待できます。");
            } else if (err.message.includes("quota")) {
                setErrorMsg("招待枠の上限に達しました。");
            } else if (err.message.includes("valid email")) {
                setErrorMsg("有効なメールアドレスを入力してください。");
            } else {
                setErrorMsg(err.message || "送信に失敗しました。もう一度お試しください。");
            }
        }
    });

    const handleSubmit = async () => {
        if (!email.trim() || !email.includes("@")) {
            setErrorMsg("有効なメールアドレスを入力してください");
            return;
        }

        if (!targetFamilyId) {
            return;
        }

        setIsSubmitting(true);
        setErrorMsg(null);
        try {
            await inviteMutation.mutateAsync({
                familyId: targetFamilyId,
                email: email.trim()
            });
        } catch (e) {
            // Handled in onError
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopyUrl = async () => {
        if (inviteUrl) {
            await navigator.clipboard.writeText(inviteUrl);
            toast.success("招待URLをコピーしました");
        }
    };

    const handleClose = () => {
        setOpen(false);
        // Reset state after transition
        setTimeout(() => {
            setStep("input");
            setEmail("");
            setErrorMsg(null);
            setInviteUrl(null);
        }, 300);
    };

    // === DEV-only Debug Handlers ===
    // These functions are only accessible in DEV mode with ?debug=1
    const handleFakeSuccess = () => {
        setInviteUrl(`${window.location.origin}/family/invite/fake-token-12345`);
        setStep("success");
        toast.success("[DEBUG] Fake success triggered");
        // Trigger invalidate to test cache behavior
        utils.family.listInvites.invalidate();
        utils.family.listMembers.invalidate();
        if (onSuccess) onSuccess();
    };

    const handleFakeAlreadyInvited = () => {
        setErrorMsg("このメールアドレスは既に招待済みです。");
        toast.info("[DEBUG] Fake 'already invited' error");
    };

    const handleFakePermissionDenied = () => {
        setErrorMsg("招待権限がありません。オーナーのみが招待できます。");
        toast.info("[DEBUG] Fake 'permission denied' error");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <UserPlus className="h-4 w-4" />
                        家族を招待
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                {!targetFamilyId && !isDebugMode ? (
                    // No family state
                    <div className="text-center py-6 space-y-4">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground" />
                        <DialogTitle>家族グループがありません</DialogTitle>
                        <DialogDescription>
                            招待するには、まず家族グループを作成する必要があります。
                        </DialogDescription>
                        <Button onClick={() => navigate("/family")} className="w-full">
                            家族グループを作成画面へ
                        </Button>
                    </div>
                ) : step === "input" ? (
                    // Input Step
                    <>
                        <DialogHeader>
                            <DialogTitle>家族を招待</DialogTitle>
                            <DialogDescription>
                                招待したい家族のメールアドレスを入力してください。
                            </DialogDescription>
                        </DialogHeader>

                        {errorMsg && (
                            <Alert variant="destructive" className="py-2">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{errorMsg}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label htmlFor="email">メールアドレス</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="example@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                                />
                            </div>

                            {!isOwner && activeFamily && !isDebugMode && (
                                <Alert className="bg-amber-50 text-amber-800 border-amber-200">
                                    <AlertDescription className="text-xs">
                                        ※ 現在はオーナー権限を持つメンバー（{activeFamily.name}の作成者）のみが招待できます。
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>

                        <DialogFooter className="sm:justify-between gap-2">
                            <Button variant="ghost" onClick={() => setOpen(false)}>
                                キャンセル
                            </Button>
                            <Button onClick={handleSubmit} disabled={isSubmitting || (!isOwner && !isDebugMode) || !email}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        送信中
                                    </>
                                ) : (
                                    <>
                                        <Mail className="mr-2 h-4 w-4" />
                                        招待を送る
                                    </>
                                )}
                            </Button>
                        </DialogFooter>

                        {/* === DEV-ONLY DEBUG SECTION === */}
                        {/* IMPORTANT: This block is ONLY rendered when:
                            1. import.meta.env.DEV is true (development build)
                            2. URL contains ?debug=1
                            In production builds, this entire block is tree-shaken out.
                        */}
                        {isDebugMode && (
                            <div className="mt-4 pt-4 border-t border-dashed border-amber-300 bg-amber-50/50 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold mb-2">
                                    <Bug className="h-3 w-3" />
                                    DEV DEBUG (本番では表示されません)
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs h-7 border-green-300 text-green-700 hover:bg-green-50"
                                        onClick={handleFakeSuccess}
                                    >
                                        Fake Success
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs h-7 border-amber-300 text-amber-700 hover:bg-amber-50"
                                        onClick={handleFakeAlreadyInvited}
                                    >
                                        Fake Already Invited
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs h-7 border-red-300 text-red-700 hover:bg-red-50"
                                        onClick={handleFakePermissionDenied}
                                    >
                                        Fake Permission Denied
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    // Success Step
                    <>
                        <DialogHeader>
                            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
                                <CheckCircle2 className="h-6 w-6 text-green-600" />
                            </div>
                            <DialogTitle className="text-center">招待を送信しました！</DialogTitle>
                            <DialogDescription className="text-center">
                                メールが届かない場合のために、リンクをコピーしてLINEなどで送ることもできます。
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-2">
                            <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm break-all">
                                <code className="flex-1 line-clamp-2">{inviteUrl}</code>
                                <Button size="icon" variant="ghost" onClick={handleCopyUrl} className="h-8 w-8 shrink-0">
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <DialogFooter className="flex-col sm:flex-col gap-2">
                            <Button onClick={() => navigate("/create")} className="w-full">
                                続けて手紙を書く
                            </Button>
                            <Button variant="outline" onClick={handleClose} className="w-full">
                                閉じる
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
