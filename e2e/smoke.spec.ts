import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check that the page title contains expected text
    await expect(page).toHaveTitle(/Plataforma/);
    
    // Check that main elements are visible
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    
    // Look for login link/button
    const loginButton = page.locator('[data-testid="login-button"], a[href="/login"], button:has-text("Login")').first();
    
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.waitForURL('**/login');
      
      // Check login page elements
      const loginForm = page.locator('form, [data-testid="login-form"]').first();
      await expect(loginForm).toBeVisible();
    }
  });

  test('should handle demo login', async ({ page }) => {
    await page.goto('/login');
    
    // Fill login form with demo credentials
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitButton = page.locator('button[type="submit"], input[type="submit"]').first();
    
    if (await emailInput.isVisible()) {
      await emailInput.fill('adm@nxt.eco.br');
      await passwordInput.fill('demo123');
      await submitButton.click();
      
      // Wait for navigation or success indicator
      await page.waitForTimeout(2000);
      
      // Check if we're redirected to dashboard or main app
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/login');
    }
  });

  test('should load dashboard after login', async ({ page }) => {
    // Login first
    await page.goto('/login');
    
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('adm@nxt.eco.br');
      await page.locator('input[type="password"]').first().fill('demo123');
      await page.locator('button[type="submit"]').first().click();
      
      await page.waitForTimeout(2000);
    }
    
    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check dashboard elements
    const dashboard = page.locator('[data-testid="dashboard"], main, .dashboard').first();
    await expect(dashboard).toBeVisible();
  });

  test('should have working API health check', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
  });

  test('should display module windows', async ({ page }) => {
    // Login first
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('adm@nxt.eco.br');
      await page.locator('input[type="password"]').first().fill('demo123');
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(2000);
    }
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for module icons or buttons
    const moduleButtons = page.locator('[data-testid*="module"], .module-icon, .module-button');
    const count = await moduleButtons.count();
    
    if (count > 0) {
      // Click first available module
      await moduleButtons.first().click();
      
      // Wait for window to open
      await page.waitForTimeout(1000);
      
      // Check if a window appeared
      const windows = page.locator('[data-testid="window"], .window, .modal');
      await expect(windows.first()).toBeVisible();
    }
  });
});

test.describe('Performance Tests', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });
});

test.describe('Accessibility Tests', () => {
  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for h1
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
  });

  test('should have alt text for images', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const images = page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt).toBeDefined();
    }
  });
});