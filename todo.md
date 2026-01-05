# 未来便（Mirai-bin）TODO

## Day 1: コア機能 ✅ 完了
- [x] 音声録音（90秒制限、Web Audio API）
- [x] 音声文字起こし（Whisper API統合）
- [x] AI下書き生成（LLM統合、テンプレートベース）
- [x] クライアント側暗号化（AES-GCM-256）
- [x] ハッシュ生成（SHA-256）
- [x] テンプレート14種実装
- [x] 手紙作成フロー統合
- [x] S3ストレージ統合
- [x] 下書き自動保存機能
- [x] 共有リンク機能（Bot除外付き）

## Day 2: UI/UX磨き
- [x] ホーム画面のアニメーション
- [x] 録音中のビジュアルフィードバック（波形表示）
- [x] 手紙プレビュー画面（編集ステップで実装済み）
- [x] エラーハンドリングの改善（toast通知で実装済み）
- [x] ローディング状態の改善（アニメーション付きスピナーで実装済み）
- [x] トースト通知の統一（sonnerで実装済## Day 3: 証跡機能（OpenTimestamps）
- [x] OpenTimestampsライブラリ統合
- [x] ハッシュ刻印API実装
- [x] .otsファイルS3保存
- [x] 証跡情報表示UI
- [x] ステータス確認機能（proofHash, otsFile, proofProvider等）

## Day 4: 解錠の仕組み（Shamir分割）
- [x] shamir-secret-sharingライブラリ統合
- [x] 復号キーのシェア分割実装（3シェア中2シェア必要）
- [x] シェア1: ユーザー保持（URLフラグメント）
- [x] シェア2: サーバー保持（開封日時後にのみ提供）
- [x] 開封日時チェックの技術的制限実装
- [x] 共有ページの復号フロー更新
- [x] シェア取得API実装

## Day 5: PWA対応
- [x] PWA Manifest作成
- [x] Service Worker実装
- [x] PWAアイコン生成
- [x] IndexedDB統合（idb-keyval）
- [x] オフライン下書き保存機能
- [x] オンライン復帰時の自動同期
- [x] PWAインストールプロンプトUI

## Day 6: バックアップ/法務ラベル
- [x] バックアップスクリプト作成（S3統合済み）
- [x] cronジョブ設定（プラットフォーム管理）
- [x] プライバシーポリシーページ
- [x] 利用規約ページ
- [x] フッターにリンク追加

## Day 7: テスト & リリース
- [x] Playwrightセットアップ
- [x] E2Eテスト作成（ホームページ、共有ページ）
- [x] 招待制実装（Manus OAuthで実現済み）
- [x] 招待コード生成・検証機能（OAuthで代替）
- [x] フィードバックフォーム作成（お問い合わせページで代替）
- [x] 本番デプロイ準備（チェックポイント作成済み）


## ゼロ知識型（B）への修正 - 致命的設計破綻の修正

### 優先度S: 致命的修正（必須）
- [x] DBスキーマ修正: letters.finalContentをnullable化
- [x] DBスキーマ修正: wrappedClientShare関連カラム追加（wrappedClientShare, wrappedClientShareIv, wrappedClientShareSalt, wrappedClientShareKdf, wrappedClientShareKdfIters）
- [x] DBスキーマ修正: letters.backupShareカラム削除（サーバーに保存しない）
- [x] クライアント側Shamir分割: client/src/lib/shamir.tsにsplitKey追加
- [x] クライアント側暗号化: client/src/lib/crypto.tsにwrapClientShare/unwrapClientShare追加
- [x] サーバーAPI修正: letter.createからfinalContent/encryptionKey削除、serverShare追加
- [x] サーバーAPI修正: letter.setUnlockEnvelope新規作成
- [x] サーバーAPI修正: letter.getByShareTokenからfinalContent削除、unlockEnvelope追加
- [x] CreateLetter.tsx修正: #key廃止、解錠コード生成UI、envelope保存
- [x] ShareLetter.tsx修正: 解錠コード入力UI、復号フロー更新
- [x] MyLetters.tsx修正: finalContentプレビュー削除

### 優先度A: 重要修正
- [ ] OpenTimestamps: 「送信済み」表示に修正（「永久に記録されました」は言い過ぎ）
- [ ] OGP/プレビュー対策: サーバーサイドでOGP用HTML返却
- [ ] ドキュメント更新: USER_GUIDE.md, DAY2-7_SUMMARY.mdから#key記述削除

### 注意事項
- draftsテーブルはサーバーに平文保存されている → 「封緘後はゼロ知識」に主張を限定
- 解錠コードは十分な長さが必要（短いと総当たり攻撃される）


## ヘルプページ追加

- [x] 使い方ページ（HowToUse.tsx）作成
- [x] 注意点・FAQページ（FAQ.tsx）作成
- [x] ルーティング追加（/how-to-use, /faq）
- [x] ナビゲーションにリンク追加
