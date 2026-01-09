import { test, expect } from '@playwright/test';

/**
 * E2E Test: Family Invite Dialog Flow
 *
 * This test uses the DEV debug mode (?debug=1) to bypass API calls
 * and verify the UI flow works correctly.
 *
 * Prerequisites:
 * - Dev server running on localhost:5000
 * - User must be logged in (this test assumes auth is handled or mocked)
 */
test.describe('Family Invite Dialog', () => {
    test('should complete invite flow using debug stubs', async ({ page }) => {
        // Navigate to Family tab with debug mode enabled
        await page.goto('/my-letters?tab=family&debug=1');

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Click the invite button
        const inviteButton = page.getByRole('button', { name: /家族を招待/ });
        await expect(inviteButton).toBeVisible({ timeout: 10000 });
        await inviteButton.click();

        // Dialog should open
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();

        // Verify input field is present
        const emailInput = dialog.getByLabel(/メールアドレス/);
        await expect(emailInput).toBeVisible();

        // Enter test email
        await emailInput.fill('test@example.com');

        // Click "Fake Success" debug button to simulate successful invite
        const fakeSuccessButton = dialog.getByRole('button', { name: 'Fake Success' });
        await expect(fakeSuccessButton).toBeVisible();
        await fakeSuccessButton.click();

        // Verify success screen is shown
        await expect(dialog.getByText('招待を送信しました！')).toBeVisible();

        // Verify "next action" CTA is present
        const writeLetterButton = dialog.getByRole('button', { name: /続けて手紙を書く/ });
        await expect(writeLetterButton).toBeVisible();

        // Close dialog
        const closeButton = dialog.getByRole('button', { name: /閉じる/ });
        await closeButton.click();

        // Dialog should be closed
        await expect(dialog).not.toBeVisible();
    });

    test('should show error for invalid email format', async ({ page }) => {
        await page.goto('/my-letters?tab=family&debug=1');
        await page.waitForLoadState('networkidle');

        // Open dialog
        const inviteButton = page.getByRole('button', { name: /家族を招待/ });
        await inviteButton.click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();

        // Enter invalid email
        const emailInput = dialog.getByLabel(/メールアドレス/);
        await emailInput.fill('invalid-email');

        // Try to submit
        const submitButton = dialog.getByRole('button', { name: /招待を送る/ });
        await submitButton.click();

        // Error message should appear
        await expect(dialog.getByText(/有効なメールアドレス/)).toBeVisible();
    });

    test('should show already invited error via debug stub', async ({ page }) => {
        await page.goto('/my-letters?tab=family&debug=1');
        await page.waitForLoadState('networkidle');

        const inviteButton = page.getByRole('button', { name: /家族を招待/ });
        await inviteButton.click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();

        // Click "Fake Already Invited" debug button
        const fakeAlreadyInvitedButton = dialog.getByRole('button', { name: 'Fake Already Invited' });
        await fakeAlreadyInvitedButton.click();

        // Error message should appear
        await expect(dialog.getByText(/既に招待済み/)).toBeVisible();
    });
});
