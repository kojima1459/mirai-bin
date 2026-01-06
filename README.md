# 未来便（Mirai-bin）

<div align="center">
  <img src="client/public/icons/icon-512x512.png" alt="未来便ロゴ" width="200"/>
  
  **親が子に宛てた手紙を、未来の特定タイミングで解錠できるアプリ**
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)
  [![Tests](https://img.shields.io/badge/tests-30%20passing-green)](package.json)
</div>

---

## 📖 概要

**未来便**は、親から子への想いを未来に届けるWebアプリケーションです。90秒の音声録音から、AIが温かい手紙の下書きを作成し、暗号化して安全に保管します。指定した開封日時まで、誰も手紙の内容を読むことができません。

たとえ親が亡くなっても、子どもの人生の節目（小学校卒業、成人の日、結婚する日など）に、確実に想いを届けることができます。

---

## ✨ 主な機能

### 🎤 音声録音（90秒）
マイクボタンを押して、子どもへの想いを90秒間録音。録音中は波形が表示され、視覚的なフィードバックが得られます。

### 🤖 AI下書き生成
録音した音声は、Whisper APIによって自動的にテキストに変換。その後、Manus LLMが選択したテンプレートに基づいて、温かい手紙の下書きを生成します。

### 🔒 クライアント側暗号化（AES-GCM-256）
手紙の内容は、ブラウザ上でAES-GCM-256方式で暗号化。暗号化された状態でサーバーに保存されるため、サーバー管理者でも内容を読むことはできません。

### 🔑 Shamir分割による解錠制限
復号キーは**Shamir's Secret Sharing**によって3つのシェアに分割。そのうち2つのシェアがないと復号できません。

- **シェア1（clientShare）**: URLフラグメントに含まれる（受信者が保持）
- **シェア2（serverShare）**: サーバーが保持（**開封日時後にのみ提供**）
- **シェア3（backupShare）**: バックアップ用（オプション）

これにより、**開封日時前は技術的に復号不可能**です。

### ⏰ 開封日時の設定
手紙を開封できる日時を指定。例えば「2030年4月1日 09:00（子どもの高校入学の日）」のように設定できます。

### 🛡️ OpenTimestamps証跡
手紙のハッシュ（SHA-256）がBitcoinブロックチェーンに刻印。手紙が改ざんされていないことを証明できます。

### 📱 PWA対応
スマートフォンのホーム画面にインストールして、アプリのように使えます。オフライン時でも下書きを作成でき、オンライン復帰時に自動同期されます。

### 📝 下書き自動保存
手紙作成中に自動的に下書きが保存されます（3秒間隔）。途中で中断しても、後で続きから編集できます。

### 📧 共有リンク
手紙を保存すると、共有リンクが生成されます。このリンクをLINEやメールで子どもに送ることができます。

### 🔄 共有リンクの管理
共有リンクを無効化したり、新しいリンクに再発行することができます。誤ってリンクを共有してしまった場合でも安心です。

### ⏰ スケジュール変更
手紙作成後でも、開封日時やリマインダー通知（90/30/7/1日前）を変更できます。既に送信されたリマインダーは保持されます。

### 👥 アカウント引き継ぎガイド
配偶者や家族に渡せる引き継ぎ手順ページを用意。解錠コードの保管方法や、アカウント喪失時の対処法を詳しく解説しています。

### 📧 メール変更機能
設定画面からアカウントメールアドレスを変更できます。メールアドレスが変わっても、安心してアカウントを維持できます。

### 📝 関係性の拡張
手紙の宛先に「自分」（将来の自分へのタイムカプセル）や「親」（親から子への手紙）を選べるようになりました。

---

## 🛠️ 技術スタック

### フロントエンド
- **React 19** - UIライブラリ
- **TypeScript** - 型安全性
- **Tailwind CSS 4** - スタイリング
- **Wouter** - ルーティング
- **tRPC** - 型安全なAPI通信
- **Framer Motion** - アニメーション
- **shadcn/ui** - UIコンポーネント

### バックエンド
- **Express 4** - Webサーバー
- **tRPC 11** - 型安全なRPC
- **Drizzle ORM** - データベースORM
- **MySQL/TiDB** - データベース
- **Manus OAuth** - 認証

### セキュリティ
- **Web Crypto API** - AES-GCM-256暗号化
- **shamir-secret-sharing** - Shamir分割
- **OpenTimestamps** - ブロックチェーン証跡

### インフラ
- **AWS S3** - ファイルストレージ
- **Manus Platform** - ホスティング
- **PWA** - Progressive Web App

---

## 📂 プロジェクト構成

```
mirai-bin/
├── client/                 # フロントエンド
│   ├── public/            # 静的ファイル
│   │   ├── icons/         # PWAアイコン
│   │   ├── manifest.json  # PWA Manifest
│   │   ├── sw.js          # Service Worker
│   │   └── offline.html   # オフラインページ
│   └── src/
│       ├── components/    # UIコンポーネント
│       ├── hooks/         # カスタムフック
│       ├── lib/           # ユーティリティ
│       ├── pages/         # ページコンポーネント
│       └── App.tsx        # ルーティング
├── server/                # バックエンド
│   ├── _core/             # フレームワークコア
│   ├── db.ts              # データベースクエリ
│   ├── routers.ts         # tRPCルーター
│   ├── opentimestamps.ts  # OpenTimestampsサービス
│   └── shamir.ts          # Shamir分割サービス
├── drizzle/               # データベーススキーマ
│   └── schema.ts          # テーブル定義
├── e2e/                   # E2Eテスト
│   ├── playwright.config.ts
│   └── tests/
└── shared/                # 共有型定義
```

---

## 🚀 セットアップ

### 前提条件
- Node.js 22.x
- pnpm 10.x
- MySQL/TiDB データベース

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/kojima1459/kieru-tegami.git
cd kieru-tegami

# 依存関係をインストール
pnpm install

# データベースマイグレーション
pnpm db:push
```

### 環境変数

以下の環境変数を設定してください：

```env
# データベース
DATABASE_URL=mysql://user:password@host:port/database

# 認証
JWT_SECRET=your-jwt-secret
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im

# Manus Built-in APIs
BUILT_IN_FORGE_API_URL=https://forge.manus.im
BUILT_IN_FORGE_API_KEY=your-api-key
VITE_FRONTEND_FORGE_API_KEY=your-frontend-api-key
```

### 開発サーバー起動

```bash
pnpm dev
```

ブラウザで `http://localhost:3000` にアクセスしてください。

---

## 🧪 テスト

### Vitestテスト

```bash
pnpm test
```

### Playwright E2Eテスト

```bash
npx playwright install chromium
npx playwright test
```

---

## 📚 ドキュメント

- **[USER_GUIDE.md](USER_GUIDE.md)** - ユーザーガイド（使用書）
- **[DAY2-7_SUMMARY.md](DAY2-7_SUMMARY.md)** - Day 2〜Day 7の実装内容とテスト手順
- **[MIRAI_BIN_DAY1.md](https://github.com/kojima1459/kieru-tegami/blob/main/MIRAI_BIN_DAY1.md)** - Day 1の実装計画
- **[MIRAI_BIN_DAY2-7.md](https://github.com/kojima1459/kieru-tegami/blob/main/MIRAI_BIN_DAY2-7.md)** - Day 2〜Day 7のロードマップ

---

## 🔐 セキュリティ

### 暗号化

手紙の内容は、ブラウザ上でAES-GCM-256方式で暗号化されてからサーバーに送信されます。サーバーには暗号文のみが保存され、サーバー管理者でも内容を読むことはできません。

### Shamir分割

復号キーは、Shamir's Secret Sharingによって3つのシェアに分割されます。そのうち2つのシェアがないと復号できません。開封日時前は、サーバーがserverShareを提供しないため、clientShareだけでは復号できません。

### OpenTimestamps証跡

手紙のハッシュ（SHA-256）がBitcoinブロックチェーンに刻印されます。これにより、手紙が特定の日時に存在していたこと、改ざんされていないことを証明できます。

詳細は[プライバシーポリシー](client/src/pages/Privacy.tsx)をご覧ください。

---

## 🗺️ ロードマップ

### Day 1 ✅ 完了
- 音声録音（90秒制限）
- Whisper API統合で文字起こし
- AI下書き生成（LLM統合）
- AES-GCM-256暗号化
- SHA-256ハッシュ生成
- S3ストレージ統合

### Day 2 ✅ 完了
- UI/UXアニメーション
- 録音中の波形表示
- テンプレート14種類拡充

### Day 3 ✅ 完了
- OpenTimestamps証跡機能

### Day 4 ✅ 完了
- Shamir分割による開封日時の技術的制限

### Day 5 ✅ 完了
- PWA対応（IndexedDB、オフライン同期、インストールプロンプト）

### Day 6 ✅ 完了
- プライバシーポリシー、利用規約ページ

### Day 7 ✅ 完了
- Playwright E2Eテスト

### Day 8 ✅ 完了 (2025-01-06)
- 共有リンクの失効・再発行機能
- letterShareTokensテーブル追加（status: active/revoked/rotated）
- レガシーマイグレーション

### Day 9 ✅ 完了 (2025-01-07)
- 開封日・通知スケジュールの変更機能
- 送信済みリマインダー保持機能

### Day 10 ✅ 完了 (2025-01-07)
- アカウント引き継ぎ対策
- メール変更機能
- 引き継ぎ手順ページ (/account-recovery)
- 関係性に「自分」「親」を追加

### 今後の提案
- 確認メール送信フロー（メール変更時）
- 解錠コード再発行機能
- 復号処理のUX改善（ローディング表示）
- 音声プレビュー機能
- ダッシュボード・統計機能

---

## 🤝 コントリビューション

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。

---

## 📄 ライセンス

[MIT License](LICENSE)

---

## 👤 作者

**Masahide Kojima**

- GitHub: [@kojima1459](https://github.com/kojima1459)

---

## 🙏 謝辞

- [Manus Platform](https://manus.im) - ホスティングと認証
- [OpenTimestamps](https://opentimestamps.org/) - ブロックチェーン証跡
- [shadcn/ui](https://ui.shadcn.com/) - UIコンポーネント

---

<div align="center">
  <p><strong>未来便</strong>は、親から子への想いを、未来に確実に届けるためのサービスです。</p>
  <p>大切な手紙を、安全に、温かく保管します。</p>
</div>
