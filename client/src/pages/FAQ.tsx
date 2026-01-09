import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  AlertTriangle, 
  Mail, 
  Home,
  Shield,
  Key,
  Clock,
  HelpCircle,
  Lock,
  Server,
  FileText,
  Trash2,
  RefreshCw
} from "lucide-react";

export default function FAQ() {
  const warnings = [
    {
      icon: <Key className="h-6 w-6" />,
      title: "解錠コードは絶対に紛失しないでください",
      description: "解錠コードを紛失すると、手紙を開封できなくなります。運営者でも復元できません。必ず安全な場所にメモして保管してください。",
      severity: "critical"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "バックアップシェアも保管してください",
      description: "万が一の場合に備えて、バックアップシェアも保管しておくことをお勧めします。解錠コードとバックアップシェアがあれば、サーバーに問題が発生しても復号できます。",
      severity: "warning"
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "開封日時は変更可能ですが、開封済みの手紙は変更できません",
      description: "開封日時は「マイレター」から変更できます。ただし、既に開封された手紙は変更できません。",
      severity: "info"
    },
    {
      icon: <RefreshCw className="h-6 w-6" />,
      title: "解錠コードの再発行は1回のみです",
      description: "解錠コードを紛失した場合、1回だけ再発行できます。再発行後は新しい封筒PDFをダウンロードしてください。旧コードは無効になります。",
      severity: "warning"
    },
    {
      icon: <Trash2 className="h-6 w-6" />,
      title: "削除した手紙は復元できません",
      description: "手紙を削除すると、サーバーから完全に削除されます。暗号化されているため、運営者でも復元できません。",
      severity: "info"
    },
    {
      icon: <FileText className="h-6 w-6" />,
      title: "下書きはサーバーに保存されます",
      description: "編集中の下書きはサーバーに平文で保存されます。「ゼロ知識」が適用されるのは、封緘（暗号化）後の手紙のみです。",
      severity: "info"
    }
  ];

  const faqs = [
    {
      category: "基本的な使い方",
      questions: [
        {
          q: "未来便とは何ですか？",
          a: "未来便は、大切な人への想いを「未来の特別な日」に届けるサービスです。音声で想いを録音し、AIが心のこもった手紙に仕上げ、暗号化して安全に保管します。設定した開封日時になると、受取人が手紙を開封できるようになります。"
        },
        {
          q: "手紙を書くのに費用はかかりますか？",
          a: "現在、未来便は無料でご利用いただけます。将来的に有料プランを導入する可能性がありますが、既存の手紙には影響しません。"
        },
        {
          q: "何通まで手紙を書けますか？",
          a: "現在、手紙の数に制限はありません。ただし、サービスの安定運用のため、将来的に制限を設ける可能性があります。"
        },
        {
          q: "音声録音は必須ですか？",
          a: "はい、現在は音声録音から手紙を作成する方式のみ対応しています。90秒以内で想いを話していただき、AIが手紙に仕上げます。生成された手紙は自由に編集できます。"
        }
      ]
    },
    {
      category: "セキュリティ・プライバシー",
      questions: [
        {
          q: "「ゼロ知識」とは何ですか？",
          a: "ゼロ知識暗号化とは、サービス運営者でさえも内容を読むことができない暗号化方式です。未来便では、手紙の暗号化をすべてあなたの端末（ブラウザ）で行い、サーバーには暗号文のみを保存します。復号に必要な鍵はサーバーに送信されないため、運営者を含め誰も内容を読むことができません。"
        },
        {
          q: "ゼロ知識が適用される範囲は？",
          a: "ゼロ知識暗号化が適用されるのは、「封緬（暗号化）後の手紙本文」のみです。下書き、音声文字起こし結果、AI生成結果はサーバーに平文で保存されます。これは編集機能を提供するために必要な仕様です。封緬後は、下書きは自動的に削除され、手紙本文はゼロ知識暗号化で保護されます。"
        },
        {
          q: "運営者は本当に手紙を読めないのですか？",
          a: "はい、技術的に読むことができません。手紙の暗号化はあなたの端末で行われ、復号キーはShamir分割により分散されています。サーバーには暗号文と「サーバーシェア」のみが保存され、「解錠コード」がなければ復号できません。解錠コードはサーバーに送信されないため、運営者でも復号は不可能です。"
        },
        {
          q: "下書きも暗号化されていますか？",
          a: "いいえ、下書きは暗号化されていません。編集の利便性のため、下書き・音声文字起こし結果・AI生成結果はサーバーに平文で保存されます。「ゼロ知識」が適用されるのは、封緬（暗号化）後の手紙本文のみです。封緬後は下書きが自動削除されるため、機密性の高い内容は封緬後に確認することをお勧めします。"
        },
        {
          q: "Shamir分割とは何ですか？",
          a: "Shamir分割は、秘密（この場合は復号キー）を複数のシェアに分割し、一定数以上のシェアがないと復元できないようにする暗号技術です。未来便では、復号キーを3つのシェア（クライアントシェア、サーバーシェア、バックアップシェア）に分割し、任意の2つがあれば復号できるようにしています。"
        },
        {
          q: "データはどこに保存されていますか？",
          a: "暗号化された手紙はAWS S3に、メタデータはTiDB（MySQL互換データベース）に保存されています。すべてのデータは暗号化されて保存され、適切なアクセス制御が施されています。"
        }
      ]
    },
    {
      category: "解錠コード・開封",
      questions: [
        {
          q: "解錠コードとは何ですか？",
          a: "解錠コードは、手紙を開封するために必要な12文字のコードです。手紙を封緬する際に生成され、このコードがないと手紙を開封できません。解錠コードは「XXXX-XXXX-XXXX」の形式で表示されます。"
        },
        {
          q: "解錠コードを紛失したらどうなりますか？",
          a: "解錠コードを紛失した場合、1回だけ再発行できます。「マイレター」から手紙の詳細を開き、「解錠コードを再発行」ボタンを押してください。再発行後は新しい封筒PDFをダウンロードし、旧コードは無効になります。なお、再発行は1回のみです。"
        },
        {
          q: "開封日時前に手紙を開封できますか？",
          a: "いいえ、技術的に不可能です。開封日時前は、サーバーが「サーバーシェア」を提供しないため、解錠コードがあっても復号できません。これにより、開封日時の改ざんが不可能になっています。"
        },
        {
          q: "開封日時を変更できますか？",
          a: "はい、開封前の手紙であれば変更できます。「マイレター」から手紙の詳細を開き、「スケジュール設定」セクションで開封日時とリマインダーを変更できます。ただし、既に開封された手紙は変更できません。"
        },
        {
          q: "手紙は何回開封できますか？",
          a: "開封日時後であれば、何度でも開封できます。ただし、解錠コードは毎回入力する必要があります。"
        }
      ]
    },
    {
      category: "共有リンク管理",
      questions: [
        {
          q: "共有リンクを無効化できますか？",
          a: "はい、「マイレター」から手紙の詳細を開き、「共有リンクを無効化」ボタンを押すと、現在の共有リンクが無効になります。無効化後は、受取人がそのリンクから手紙を開けなくなります。"
        },
        {
          q: "共有リンクを再発行できますか？",
          a: "はい、「共有リンクを再発行」ボタンを押すと、新しい共有リンクが生成されます。旧リンクは自動的に無効になり、新しいリンクを受取人に伝える必要があります。"
        },
        {
          q: "共有リンクと解錠コードの違いは？",
          a: "共有リンクは手紙のページにアクセスするためのURLです。解錠コードは手紙を復号（開封）するためのパスワードです。両方が揃って初めて手紙を読めます。セキュリティのため、別々の経路で受取人に伝えることをお勧めします。"
        }
      ]
    },
    {
      category: "トラブルシューティング",
      questions: [
        {
          q: "音声が録音できません",
          a: "ブラウザがマイクへのアクセスを許可しているか確認してください。また、HTTPS接続でないとマイクが使用できない場合があります。別のブラウザ（Chrome推奨）で試してみてください。"
        },
        {
          q: "AIの生成が失敗します",
          a: "一時的なサーバーの問題の可能性があります。しばらく待ってから再度お試しください。問題が続く場合は、お問い合わせフォームからご連絡ください。"
        },
        {
          q: "共有リンクが開けません",
          a: "リンクが正しくコピーされているか確認してください。また、手紙がキャンセルされている場合は開けません。送信者に確認してください。"
        },
        {
          q: "解錠コードを入力しても開封できません",
          a: "解錠コードが正しいか確認してください。大文字・小文字は区別されませんが、ハイフンの有無は関係ありません。また、開封日時前の場合は開封できません。"
        }
      ]
    },
    {
      category: "その他",
      questions: [
        {
          q: "手紙をキャンセルできますか？",
          a: "はい、「マイレター」から手紙をキャンセルできます。キャンセルすると、共有リンクが無効になり、受取人は手紙を開封できなくなります。ただし、暗号化されたデータはサーバーに残ります。"
        },
        {
          q: "解錠コードを再発行できますか？",
          a: "はい、1回だけ再発行できます。「マイレター」から手紙の詳細を開き、「解錠コードを再発行」ボタンを押してください。再発行後は新しい封筒PDFをダウンロードし、旧コードは無効になります。セキュリティ上の理由から、再発行は1回のみとなっています。"
        },
        {
          q: "開封日時やリマインダーを変更できますか？",
          a: "はい、開封前の手紙であれば変更できます。「マイレター」から手紙の詳細を開き、「スケジュール設定」セクションで変更できます。リマインダーは90/30/7/1日前から選択できます。既に開封された手紙は変更できません。"
        },
        {
          q: "アカウントを削除できますか？",
          a: "現在、アカウント削除機能は実装されていません。削除をご希望の場合は、お問い合わせフォームからご連絡ください。"
        },
        {
          q: "サービスが終了したらどうなりますか？",
          a: "サービス終了時には、事前に通知し、データのエクスポート期間を設けます。ただし、暗号化された手紙は解錠コードがないと復号できないため、解錠コードとバックアップシェアは必ず保管しておいてください。"
        },
        {
          q: "問い合わせはどこからできますか？",
          a: "フッターの「お問い合わせ」リンクから、お問い合わせフォームにアクセスできます。"
        }
      ]
    }
  ];

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-50 border-red-200 text-red-800";
      case "warning":
        return "bg-amber-50 border-amber-200 text-amber-800";
      default:
        return "bg-blue-50 border-blue-200 text-blue-800";
    }
  };

  const getSeverityIconStyles = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-600";
      case "warning":
        return "bg-amber-100 text-amber-600";
      default:
        return "bg-blue-100 text-blue-600";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            <span className="font-bold text-primary">未来便</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/how-to-use" className="text-sm text-muted-foreground hover:text-foreground">
              使い方
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm">
                <Home className="mr-2 h-4 w-4" />
                ホームへ
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="container py-12">
        {/* タイトル */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">注意点・よくある質問</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            未来便をご利用いただく前に、必ずお読みください。
          </p>
        </div>

        {/* 重要な注意点 */}
        <section className="max-w-4xl mx-auto mb-16">
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
            <h2 className="text-2xl font-bold">重要な注意点</h2>
          </div>
          
          <div className="space-y-4">
            {warnings.map((warning, index) => (
              <Card key={index} className={`border ${getSeverityStyles(warning.severity)}`}>
                <CardContent className="py-4">
                  <div className="flex gap-4">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${getSeverityIconStyles(warning.severity)}`}>
                      {warning.icon}
                    </div>
                    <div>
                      <h3 className="font-bold mb-1">{warning.title}</h3>
                      <p className="text-sm opacity-90">{warning.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <HelpCircle className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">よくある質問</h2>
          </div>

          <div className="space-y-8">
            {faqs.map((category, categoryIndex) => (
              <Card key={categoryIndex}>
                <CardHeader>
                  <CardTitle className="text-lg">{category.category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {category.questions.map((item, itemIndex) => (
                      <AccordionItem key={itemIndex} value={`${categoryIndex}-${itemIndex}`}>
                        <AccordionTrigger className="text-left">
                          {item.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {item.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* フッターリンク */}
        <div className="mt-12 text-center space-y-4">
          <Link href="/how-to-use" className="text-primary hover:underline block">
            ← 使い方を見る
          </Link>
          <Link href="/contact" className="text-muted-foreground hover:underline block">
            お問い合わせ
          </Link>
        </div>
      </main>
    </div>
  );
}
