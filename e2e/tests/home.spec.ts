import { test, expect } from '@playwright/test';

test.describe('ホームページ', () => {
  test('ホームページが正しく表示される', async ({ page }) => {
    await page.goto('/');
    
    // タイトルが表示される
    await expect(page.locator('h1')).toContainText('未来');
    
    // テンプレートセクションが表示される
    await expect(page.getByText('テンプレート')).toBeVisible();
    
    // フッターが表示される
    await expect(page.getByText('プライバシーポリシー')).toBeVisible();
    await expect(page.getByText('利用規約')).toBeVisible();
  });

  test('プライバシーポリシーページに遷移できる', async ({ page }) => {
    await page.goto('/');
    await page.getByText('プライバシーポリシー').click();
    
    await expect(page).toHaveURL('/privacy');
    await expect(page.locator('h1')).toContainText('プライバシーポリシー');
  });

  test('利用規約ページに遷移できる', async ({ page }) => {
    await page.goto('/');
    await page.getByText('利用規約').click();
    
    await expect(page).toHaveURL('/terms');
    await expect(page.locator('h1')).toContainText('利用規約');
  });
});

test.describe('テンプレート', () => {
  test('テンプレートカテゴリタブが機能する', async ({ page }) => {
    await page.goto('/');
    
    // デフォルトで「幼少期〜小学校」タブが選択されている
    await expect(page.getByRole('tab', { name: '幼少期〜小学校' })).toBeVisible();
    
    // 「中学校」タブをクリック
    await page.getByRole('tab', { name: '中学校' }).click();
    
    // 中学校関連のテンプレートが表示される
    await expect(page.getByText('中学校入学の日に')).toBeVisible();
  });
});
