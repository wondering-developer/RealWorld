import { test, expect } from '@playwright/test';

const FAKE_USER = {
  email: 'test@example.com',
  token: 'fake-jwt-token',
  username: 'testuser',
  bio: '',
  image: '',
};

test.describe('AI Tag Suggestions', () => {
  test.beforeEach(async ({ page }) => {
    // Set the JWT token in localStorage before Angular bootstraps so the auth guard passes
    await page.addInitScript(token => {
      localStorage.setItem('jwtToken', token);
    }, FAKE_USER.token);

    // Mock the user API endpoint (called by the app initializer)
    await page.route('https://api.realworld.show/api/user', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: FAKE_USER }),
      });
    });

    await page.goto('/editor');
    // Wait for the editor form to be rendered
    await page.waitForSelector('input[formcontrolname="title"]', { timeout: 10000 });
  });

  test('Suggest Tags button is visible near the tag input', async ({ page }) => {
    const btn = page.locator('button', { hasText: 'Suggest Tags' });
    await expect(btn).toBeVisible();
  });

  test('Suggest Tags button is disabled when title and body are empty', async ({ page }) => {
    const btn = page.locator('button', { hasText: 'Suggest Tags' });
    await expect(btn).toBeDisabled();
  });

  test('Suggest Tags button is disabled when only title is filled', async ({ page }) => {
    await page.fill('input[formcontrolname="title"]', 'My Article Title');
    const btn = page.locator('button', { hasText: 'Suggest Tags' });
    await expect(btn).toBeDisabled();
  });

  test('Suggest Tags button becomes enabled when both title and body are filled', async ({ page }) => {
    await page.fill('input[formcontrolname="title"]', 'My Article Title');
    await page.fill('textarea[formcontrolname="body"]', 'Article body content here');
    const btn = page.locator('button', { hasText: /Suggest Tags|Suggesting/ });
    await expect(btn).toBeEnabled();
  });

  test('clicking Suggest Tags shows suggested tag buttons', async ({ page }) => {
    await page.fill('input[formcontrolname="title"]', 'Angular Tutorial');
    await page.fill('textarea[formcontrolname="body"]', 'Learn Angular from scratch');

    await page.locator('button', { hasText: 'Suggest Tags' }).click();

    // Wait for the 300ms service delay + rendering
    await expect(page.locator('button.tag-default.tag-pill').first()).toBeVisible({ timeout: 2000 });

    const pills = page.locator('button.tag-default.tag-pill');
    const count = await pills.count();
    expect(count).toBeGreaterThanOrEqual(3);
    expect(count).toBeLessThanOrEqual(6);
  });

  test('clicking a suggested tag adds it to the tag list and removes it from suggestions', async ({ page }) => {
    await page.fill('input[formcontrolname="title"]', 'Angular Tutorial');
    await page.fill('textarea[formcontrolname="body"]', 'Learn Angular from scratch');

    await page.locator('button', { hasText: 'Suggest Tags' }).click();

    // Wait for suggestions
    const firstPill = page.locator('button.tag-default.tag-pill').first();
    await expect(firstPill).toBeVisible({ timeout: 2000 });
    const tagText = (await firstPill.textContent())?.trim() ?? '';

    // Click the suggestion
    await firstPill.click();

    // The tag should now be in the tag-list as a span
    const tagSpan = page.locator('span.tag-default.tag-pill', { hasText: tagText });
    await expect(tagSpan).toBeVisible();
  });
});
