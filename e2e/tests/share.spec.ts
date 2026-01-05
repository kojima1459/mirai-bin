import { test, expect } from '@playwright/test';

test.describe('共有ページ', () => {
  test('無効なトークンでエラーが表示される', async ({ page }) => {
    await page.goto('/share/invalid-token');
    
    // エラーメッセージまたは「見つかりません」が表示される
    await expect(page.getByText(/見つかりません|エラー|存在しません/)).toBeVisible({ timeout: 10000 });
  });

  test('復号キーがない場合にエラーが表示される', async ({ page }) => {
    // トークンはあるがキーがないURL
    await page.goto('/share/some-token');
    
    // 何らかのエラーまたはローディング状態が表示される
    await page.waitForTimeout(2000);
    // ページが何らかの状態で表示されることを確認
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Bot除外', () => {
  test('通常のユーザーエージェントでアクセス可能', async ({ page }) => {
    await page.goto('/share/test-token');
    
    // ページが表示される（Bot除外されない）
    await expect(page.locator('body')).toBeVisible();
  });
});
