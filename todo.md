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


## セキュリティレビュー指摘対応（優先度S→A）

### S1: 解錠コードのオフライン耐性強化
- [x] 解錠コードは自動生成のみに強制（ユーザー入力禁止）
- [x] 暗号学的乱数で[A-Za-z0-9]から12文字生成（62^12エントロピー）
- [x] UIで「リンクとコードを同じスクショに入れるな」警告を強制表示

### S2: ゼロ知識範囲の明言
- [x] FAQ/README更新：「封緬後はゼロ知識」を明言
- [x] drafts/音声文字起こし/AI生成結果は平文保存であることを明記

### A1: opened判定の修正
- [x] getByShareTokenでは開封扱いにしない
- [x] letter.markOpened APIを追加（復号成功後にクライアントから呼ぶ）
- [x] WHERE isUnlocked = falseで原子的更新（二重開封レース対策）

### A2: PBKDF2パラメータ確認
- [x] iters: 200k以上を確認（KDF_ITERATIONS = 200000）
- [x] salt: 16B以上、手紙ごとにランダムを確認（crypto.getRandomValues(new Uint8Array(16))）
- [x] AES-GCM iv: 12B、毎回ランダムを確認（crypto.getRandomValues(new Uint8Array(12))）

### 共有画面UI改善
- [x] 「共有リンクをコピー」と「解錠コードをコピー」を分離（別セクション）
- [x] 警告表示：「リンクとコードは別の経路で送る」「スクショに両方入れない」


## 運用事故対策（仕上げチェックリスト）

### S3: 解錠コード配布経路漏洩対策（優先度S）
- [x] 解錠コード初期表示を伏字（••••-••••-••••）に変更
- [x] 表示ボタン押下後のトーストに「今すぐ別経路で送る」を追加
- [x] クリップボード自動クリア（30秒後）を実装
- [x] コピーボタンの配置を調整（誤タップ防止）

### A: markOpened原子性確認テスト（優先度A）
- [x] WHERE isUnlocked = false で原子的更新を確認
- [x] 更新件数が0の場合「既に開封済み」を返すテスト
- [x] markOpened呼び出しが復号成功後1回のみであることを確認

### A: PBKDF2 UX改善（優先度A）
- [ ] ShareLetter.tsxに「復号処理中…」ローディング表示を追加
- [ ] 処理時間の目安を表示

### B: 再表示制限（優先度B）
- [ ] CreateLetter.tsxで「解錠コード再表示」を1回のみに制限
- [ ] 再表示時に警告を表示

### B: PDF分割出力（優先度B）
- [x] 3ページ分割PDF出力（リンク+QR／解錠コード／バックアップ）
- [x] 各ページに「このページだけ渡してください」を明記

### B: アクセス通知（優先度B）
- [x] 初回開封時にオーナーに通知（Manus Notification Service経由）
- [x] 通知内容: 宛先、開封日時のみ（本文はゼロ知識のため含まない）


## ローンチ前最終機能

### 1位: 通知先メール設定（優先度A）
- [x] DBスキーマ: users.notificationEmail追加（nullable）
- [x] サーバーAPI: user.updateNotificationEmail追加
- [x] 設定画面UI: Settings.tsx作成（通知先メール入力）
- [x] 通知ロジック更新: notificationEmail優先、未設定ならアカウントメール

### 2位: 解錠コード再表示制限（優先度B）
- [x] 再表示ボタン押下時に「PDFで保存済み？」チェック誘導
- [x] 再表示は1回のみ（2回目以降は警告＋PDF誘導）
- [ ] 将来: 再発行（新コード・新封筒）の導線を用意


## テンプレート選択UIリニューアル

### アコーディオン方式への再設計 ✅ 完了
- [x] カード型からアコーディオン方式に変更
- [x] 1階層で完結（2段アコーディオン禁止）
- [x] 各行に1行説明を固定表示
- [x] 行全体タップで開閉（矢印だけでなく）
- [x] 開いた中は録音ガイド中心（90秒で話す順番、一言例、CTA）

### おすすめ固定表示 ✅ 完了
- [x] おすすめ3つを最上段に固定
- [x] その下に全テンプレート（検索/フィルタ付き）

### 16本のテンプレート追加 ✅ 完了
- [x] 感情テンプレ（8本）: うまくいかない夜へ、失敗して落ち込む君へ、怒りが抑えられない君へ、友達がしんどい君へ、自分が嫌いになった君へ、頑張れない君へ、逃げたい君へ、大事な決断の前の君へ
- [x] 親の本音テンプレ（6本）: 謝りたいことがある、言葉にできなかった"愛してる"、君の"すごいところ"の記録、家族の秘密の地図、君に伝えたいお金の話、心と体を守る約束
- [x] 儀式テンプレ（2本）: 節目じゃない普通の日の君へ、いつか親になる君へ

### カテゴリ分類 ✅ 完了
- [x] カテゴリ見出しを色/バッジで表現（感情=ローズ、親の本音=アンバー、儀式=バイオレット、人生の節目=スカイ）
- [x] 層1: 宛先（10歳/20歳/結婚 etc）= ラベル
- [x] 層2: 中身の型（励ます/謝る/誇る/秘密を託す etc）= テンプレ本体


## テンプレートカテゴリ修正 ✅ 完了

- [x] 「10歳の誕生日に」を感情サポートから人生の節目に移動
- [x] 「子どもが生まれた日に」を感情サポートから人生の節目に移動

- [x] 小学校卒業～就職まで10個のテンプレートを感情サポートから人生の節目に移動
  - [x] 小学校卒業の日に
  - [x] 中学入学の日に
  - [x] 中学卒業の日に
  - [x] 高校入学の日に
  - [x] 高校卒業の日に
  - [x] 大学入学の日に
  - [x] 成人の日に
  - [x] 就職の日に
  - [x] 最初に恋をした日に
  - [x] 結婚する日に


## モバイルレスポンシブ最適化 ✅ 完了

- [x] アコーディオンのタップ領域を拡大（56px以上）
- [x] モバイルでのフォントサイズ調整（タイトル16px、ボタンテキスト拡大）
- [x] カテゴリフィルターのモバイル表示改善（横スクロール可能）
- [x] 検索ボックスのモバイル最適化（高さ48px）
- [x] CTAボタンのモバイル最適化（高さ48px）
- [x] 録音ガイドのステップ間隔拡大
- [x] scrollbar-hideユーティリティ追加


## CreateLetter.tsx改善 ✅ 完了

- [x] アコーディオン形式テンプレート選択UIの実装（TemplateAccordionコンポーネント更新）
- [x] 関係性に新項目追加（友達、妻、夫、彼氏、彼女、同期）
- [x] アコーディオン開閉アニメーションの調整（cubic-bezier(0.4,0,0.2,1)でスムーズなトランジション）
- [x] 手紙作成画面のモバイルレスポンシブ対応（ボタン48px、フォント16px、録音ボタン144px）


## 録音完了後のUI問題 ✅ 完了

- [x] 録音完了後に「次へ進む」ボタンを追加
- [x] 録音完了確認画面（チェックマークアイコン、録音時間表示）を追加
- [x] 「撮り直す」ボタンを追加

## X日前リマインダー通知機能 ✅ 完了

### DBスキーマ
- [x] letter_remindersテーブル追加（id, letterId, ownerUserId, type, daysBefore, scheduledAt, sentAt, status, lastError）
- [x] インデックス追加（scheduledAt, sentAt）

### サーバーAPI
- [x] reminder.update（daysBefore配列、enabled）
- [x] reminder.getByLetterId（リマインダー取得）
- [x] runReminderBatch（検索→送信→sentAt更新）
- [x] 二重送信防止（sentAt IS NULLで原子的更新）

### メール送信
- [x] sendUnlockReminder関数実装
- [x] 件名：「【未来便】開封日が近づいています（あとX日）」
- [x] 本文：宛先ラベル、開封日、管理画面リンク、解錠コード再確認の案内

### Cronエンドポイント
- [x] POST /cron/reminders実装
- [x] 毎日09:00 JSTで実行（プラットフォーム側で設定必要）

### フロントエンドUI
- [x] 手紙作成時の通知ON/OFF設定
- [x] daysBefore選択（90/30/7/1日前、複数選択可）
- [x] ゼロ知識設計の説明表示（解錠コードはメールに含まれない）

### テスト
- [x] reminder生成テスト（unlockAtからscheduledAt計算）
- [x] 二重送信防止テスト
- [x] markReminderAsSent/markReminderAsFailedテスト


## 1. 共有リンクの失効・再発行（Revocation / Rotation） ✅ 完了

### DBスキーマ
- [x] letterShareTokensテーブル追加（token, letterId, status, createdAt, revokedAt, replacedByToken）
- [x] status enum: active | revoked | rotated
- [x] 既存letters.shareTokenからの移行

### サーバーAPI
- [x] letter.revokeShareLink（共有リンク無効化）
- [x] letter.rotateShareLink（共有リンク再発行）
- [x] getByShareToken更新（token状態チェック: active/revoked/rotated）
- [x] 410レスポンス（無効化/置換済み）

### フロントエンドUI
- [x] 「共有リンクを無効化」ボタン（確認ダイアログ必須）
- [x] 「共有リンクを再発行」ボタン（確認ダイアログ必須）
- [x] revoke後「共有停止中」表示
- [x] rotate後の新リンクコピーUI

### テスト
- [x] active tokenで取得できる
- [x] revoke後は410
- [x] rotate後：旧tokenは410、新tokenはOK
- [x] activeは常に1件


## 2. 開封日・通知スケジュールの変更 ✅ 完了

### サーバーAPI
- [x] letter.updateSchedule（unlockAt, remindersEnabled, reminderDaysBefore[]）
- [x] unlockAt変更時のリマインダー再計算
- [x] 送信済みリマインダーは保持
- [x] openedAt存在時は変更禁止（既に開封済みの手紙はスケジュール変更不可）

### フロントエンドUI
- [x] 手紙詳細画面に「スケジュール設定」セクション
- [x] 開封日時picker（datetime-local）
- [x] リマインダーON/OFF
- [x] daysBefore選択（90/30/7/1日前）
- [x] 開封済みの場合は編集不可表示

### テスト
- [x] pending remindersのscheduledAtが再計算される
- [x] sent済みremindersは保持される
- [x] updateSchedule APIの認証テスト


## 3. アカウント喪失/引き継ぎ対策

### メール変更
- [ ] user.updateEmail API
- [ ] 確認メール送信
- [ ] 設定画面UI

### 引き継ぎ手順ページ
- [ ] /account-recovery ページ作成
- [ ] 配偶者に渡せる説明
- [ ] PDF保管の重要性を強調


## 3. アカウント喪失/引き継ぎ対策 ✅ 完了

### 関係性の拡張
- [x] CreateLetter.tsxの関係性に「自分」を追加（将来の自分へのタイムカプセル）
- [x] CreateLetter.tsxの関係性に「親」を追加（親から子への逆方向の手紙）

### メール変更機能
- [x] user.updateEmail API実装
- [x] Settings.tsxにメール変更UI追加
- [x] メール変更のテスト追加
- [ ] 確認メール送信フロー（将来の改善: 現在は簡易的に即座変更）

### 引き継ぎ手順ページ
- [x] /account-recovery ページ作成（AccountRecovery.tsx）
- [x] 配偶者や家族に渡せる引き継ぎ手順の説明
- [x] PDF保管の重要性を強調
- [x] 解錠コードの保管場所リスト（銀行貸金庫、遺言書、信頼できる第三者、パスワード管理ツールなど）
- [x] 設定画面からのリンク追加


## 4. 「自由形式」テンプレート追加 ✅ 完了

### サーバー側
- [x] server/db.ts: 「自由形式」テンプレートを追加
- [x] プロンプト: 最小限整形ルール（口語表現保持、長さ制限なし）
- [x] sortOrder=1で最上部に配置
- [x] おすすめマーク（isRecommended=true）

### テスト
- [x] 全テストがパス（68件）
- [ ] テンプレート一覧に表示されることを確認（※DBのtemplatesテーブルをクリア後に再シードが必要）
- [ ] 自由形式で手紙を作成して動作確認


## 5. 「文字起こしそのまま」テンプレート追加 ✅ 完了

### サーバー側
- [x] server/db.ts: 「文字起こしそのまま」テンプレートを追加
- [x] プロンプト: AIによる整形を一切行わず、文字起こし結果をそのまま返す
- [x] sortOrder=2で「自由形式」の次に配置
- [x] おすすめマーク（isRecommended=true）

### テスト
- [x] 全テストがパス（68件）


## 6. ViteのHMR WebSocket接続エラー修正 ✅ 完了

### 問題
- プロキシ環境でViteのHMR WebSocketが接続できない
- ブラウザコンソールに「failed to connect to websocket」エラー

### 修正内容
- [x] vite.config.tsのHMR設定を修正（protocol: "wss", clientPort: 443）
- [x] サーバー再起動して動作確認


## 7. 新テンプレートの自動追加機能 ✅ 完了

### 問題
- 「自由形式」「文字起こしそのまま」テンプレートがDBに反映されていない
- seedTemplates関数は「テンプレートが0件の場合のみ」実行されるため、既存テンプレートがある場合はスキップされる

### 修正内容
- [x] seedTemplates関数を修正して、存在しないテンプレートを自動追加するようにする
- [x] サーバー再起動して動作確認
- [x] テンプレート一覧に「自由形式」「文字起こしそのまま」が表示されることを確認


## 8. 「おすすめ」セクションに「文字起こしそのまま」を表示 ✅ 完了

### 問題
- 「文字起こしそのまま」テンプレートが「おすすめ」セクションに表示されていない
- TemplateAccordion.tsxでおすすめ表示数が3つに制限されていた

### 修正内容
- [x] TemplateAccordion.tsxのおすすめ表示数を3から5に変更
- [x] 「文字起こしそのまま」も表示されるように修正
- [x] サーバー再起動して動作確認


## 9. 「自由形式」「文字起こしそのまま」に専用アイコンを追加 ✅ 完了

### 目的
- 視覚的に区別しやすくする
- ユーザーがテンプレートを選びやすくする

### 追加したアイコン
- [x] 「自由形式」: `edit-3`（ペンアイコン）- 自由に書くイメージ
- [x] 「文字起こしそのまま」: `mic-2`（マイクアイコン）- 録音そのままのイメージ

### 修正内容
- [x] server/db.tsのテンプレート定義にアイコンを追加
- [x] TemplateAccordion.tsxにiconMapを追加（Edit3, Mic2）
- [x] サーバー再起動して動作確認


## 10. 解錠コード再発行機能（セキュリティ強固版、再発行は1回のみ）

### 目的
- 解錠コードを紛失した場合に、新しいコードと封筒を再生成できるようにする
- セキュリティを保ちながら、ユーザーの利便性を向上させる
- **解錠コードはDBに保存しない**（封筒のみ再生成）
- **再発行は1回のみ**（unlockCodeRegeneratedAtフィールドで制御）

### DBスキーマ
- [x] drizzle/schema.ts: lettersテーブルに`unlockCodeRegeneratedAt`フィールドを追加
- [x] pnpm db:pushでマイグレーションを実行

### サーバーAPI
- [x] server/db.ts: `regenerateUnlockCode`関数を更新
  - 新しい封筒（wrappedClientShare）のみ生成
  - unlockCodeRegeneratedAtを設定
  - 旧封筒は上書きされるため、旧コードは自動的に無効化
- [x] server/routers.ts: `letter.regenerateUnlockCode` APIを追加
  - 認証チェック（手紙の所有者のみ）
  - 開封済みの手紙は再発行不可
  - 既に再発行済みの場合はエラーを返す

### フロントエンドUI
- [x] LetterDetail.tsx: 「解錠コードを再発行」ボタンを追加
  - 確認ダイアログで影響を説明（旧コードは無効化、新しい封筒が必要、再発行は1回のみ）
  - 再発行後、新しい解錠コードを表示
  - 開封済みの手紙は再発行ボタンを非表示
  - 既に再発行済みの場合は再発行ボタンを非表示（「再発行済み」表示）

### テスト
- [x] regenerateUnlockCode APIのテストを追加（70件パス）
- [x] 認証チェックのテスト
- [x] 存在しない手紙のテスト
