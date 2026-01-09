# TESTPLAN.md - 手動テスト台本

このドキュメントは、実機確認で必ず実施する最小シナリオセットを定義します。
リリース前の確認は、以下のシナリオで十分です。

---

## Part A: Family Invite Flow (5シナリオ)

---

## 前提条件

- ログイン済みのユーザーアカウントがあること
- 開発サーバーが起動していること (`npm run dev`)

---

## シナリオ一覧

### 1. Familyタブ選択の確認

**手順**:

1. `/my-letters?tab=family` にアクセス

**期待結果**:

- 「家族」タブが選択状態になっている
- URLパラメータが反映されている

---

### 2. 招待ダイアログの表示

**手順**:

1. `/my-letters?tab=family` にアクセス
2. 「+ 家族を招待」ボタンをクリック

**期待結果**:

- 招待ダイアログが開く
- メールアドレス入力欄が表示される

---

### 3. 不正メールのバリデーション

**手順**:

1. 招待ダイアログを開く
2. メールアドレス欄に `aaa` と入力
3. 「招待を送る」ボタンをクリック

**期待結果**:

- 「有効なメールアドレスを入力してください」エラーが表示される
- 実際にAPIコールは発生しない

---

### 4. 正常な招待フロー

**手順**:

1. 招待ダイアログを開く
2. 有効なメールアドレス（例: `test@example.com`）を入力
3. 「招待を送る」ボタンをクリック

**期待結果**:

- 送信中のスピナーが表示される
- 成功後、完了画面に切り替わる
- 「招待を送信しました！」メッセージが表示される
- 「次にやること」CTAボタン（「続けて手紙を書く」）が表示される

---

### 5. 即時反映の確認（invalidate）

**手順**:

1. シナリオ4を完了後、ダイアログを閉じる
2. Family画面を確認

**期待結果**:

- Family画面がリロードなしで更新されている
- 招待リスト（保留中の招待など）が最新状態になっている

---

## DEVスタブの使い方

開発時のみ、APIを呼ばずにUI状態を確認できます。

**使い方**:

1. URLに `?debug=1` を追加（例: `/my-letters?tab=family&debug=1`）
2. 招待ダイアログを開く
3. ダイアログ下部に「Debug」セクションが表示される
4. 各ボタンでUI状態を切り替え可能：
   - `Fake Success` - 成功画面を表示
   - `Fake Already Invited` - 既に招待済みエラーを表示
   - `Fake Permission Denied` - 権限不足エラーを表示

**注意**: `?debug=1` は開発環境でのみ動作します。本番ビルドでは無視されます。

---

## テスト実行コマンド

```bash
# 単体テスト
npm test -- --run

# E2Eテスト（Playwright）
npm run test:e2e

# 本番ビルド確認（DEVスタブが含まれないことを確認）
npm run build
```

---

## チェックリスト

リリース前に以下を確認:

- [ ] シナリオ1〜5が全てパスする
- [ ] `npm test -- --run` が全件パスする
- [ ] `npm run build` が成功する
- [ ] 本番ビルドでDebugセクションが表示されない

---

## Part B: ShareLetter Flow (5シナリオ)

### B1. 期限前のリンクアクセス（NOT_YET_OPENABLE）

**再現手順**:

1. 開封日が未来日に設定された手紙を作成する
2. 生成された共有リンクにアクセス

**期待結果**:

- 「まだ開封できません」画面が表示される
- 開封可能日時（JST）と残り時間が表示される
- 「URLをコピーして保存」ボタンが動作する

**観測ポイント** (DEV console):

```
[ShareLetter] State: initial → NOT_YET_OPENABLE
  canUnlock: false
  unlockAt: "2026-01-15T09:00:00Z"
```

---

### B2. 期限後のリンクアクセス（READY_TO_UNLOCK）

**再現手順**:

1. 開封日が過去または今日の手紙を作成する
2. 共有リンクにアクセス

**期待結果**:

- 「手紙が届いています」画面が表示される
- 12桁の解錠コード入力欄が表示される
- 開封ボタンが活性化する

**観測ポイント**:

```
[ShareLetter] State: initial → READY_TO_UNLOCK
  canUnlock: true
  unlockedAt: null
```

---

### B3. 解錠コード間違い（CODE_INVALID）

**再現手順**:

1. B2の状態から不正なコード（例: `AAAAAAAAAAAA`）を入力
2. 「開封する」ボタンをクリック

**期待結果**:

- 「解錠コードが違うようです」エラー画面が表示される
- 「再入力」ボタンで入力画面に戻れる
- 正しいコードで再試行できる

**観測ポイント**:

```
[ShareLetter] Decryption failed: InvalidCodeError
[ShareLetter] State: READY_TO_UNLOCK → CODE_INVALID
```

---

### B4. 既に開封済み（ALREADY_OPENED）

**再現手順**:

1. 一度正常に開封した手紙のリンクに再アクセス

**期待結果**:

- 「この手紙は既に開封されています」画面が表示される
- 内容は表示されない（セキュリティ）

**観測ポイント**:

```
[ShareLetter] State: initial → ALREADY_OPENED
  unlockedAt: "2026-01-09T..."
```

---

### B5. サーバーエラーケース（TOKEN\_\*）

**再現手順** (開発者ツール or サーバー操作):

1. 存在しないトークンでアクセス → `data.error = "not_found"`
2. 取り消された手紙 → `data.error = "canceled"`
3. 無効化されたリンク → `data.error = "revoked"`
4. ローテーションされたリンク → `data.error = "rotated"`

**期待結果**:
| data.error | 表示される画面タイトル |
|------------|------------------------|
| not_found | リンクが見つかりません |
| canceled | この手紙は取り消されました |
| revoked | このリンクは無効になっています |
| rotated | リンクが更新されています |

**観測ポイント**:

```
[ShareLetter] Server error detected: "revoked"
[ShareLetter] State: initial → TOKEN_REVOKED
```

---

## ShareLetter エラー分類テーブル

| Code               | Server Error | Title                          | Severity | Next Action  |
| ------------------ | ------------ | ------------------------------ | -------- | ------------ |
| TOKEN_NOT_FOUND    | `not_found`  | リンクが見つかりません         | warning  | 送信者に確認 |
| TOKEN_CANCELED     | `canceled`   | この手紙は取り消されました     | info     | 送信者に確認 |
| TOKEN_REVOKED      | `revoked`    | このリンクは無効になっています | warning  | 送信者に確認 |
| TOKEN_ROTATED      | `rotated`    | リンクが更新されています       | info     | 送信者に確認 |
| NOT_YET_OPENABLE   | -            | まだ開封できません             | info     | URLをコピー  |
| ALREADY_OPENED     | -            | この手紙は既に開封されています | info     | 送信者に確認 |
| CODE_INVALID       | -            | 解錠コードが違うようです       | warning  | 再入力       |
| NETWORK_OR_UNKNOWN | -            | 読み込みに失敗しました         | error    | 再読み込み   |

---

## 観測ログの有効化

開発環境では、以下のコンソールログが自動で出力されます：

```
[ShareLetter] State: {prev} → {new}
  canUnlock: boolean
  unlockedAt: string | null
  serverError: string | null
```

**本番では出力されません。**（`import.meta.env.DEV` ガード済み）
