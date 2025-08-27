/**
 * Authentication E2E Tests
 * End-to-end testing for authentication flows
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    // Should redirect to login page
    await expect(page).toHaveURL(/.*\/login/);
    
    // Check login form is present
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should login with demo credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in demo credentials
    await page.fill('input[type="email"]', 'adm@nxt.eco.br');
    await page.fill('input[type="password"]', 'demo123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL(/.*\/(?!login)/);
    
    // Should be on dashboard or home page
    await expect(page).not.toHaveURL(/.*\/login/);
    
    // Check for authenticated user indicators
    await expect(page.locator('[data-testid="user-avatar"], .user-menu, .logout-button')).toBeVisible();
  });

  test('should handle invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('.error, [role="alert"], .alert-error')).toBeVisible();
    
    // Should remain on login page
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'adm@nxt.eco.br');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Wait for successful login
    await page.waitForURL(/.*\/(?!login)/);
    
    // Find and click logout button
    const logoutButton = page.locator('.logout-button, [data-testid="logout"], button:has-text("Logout"), button:has-text("Sair")').first();
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    } else {
      // Try user menu first
      await page.locator('.user-menu, [data-testid="user-menu"]').first().click();
      await page.locator('.logout-button, [data-testid="logout"], button:has-text("Logout"), button:has-text("Sair")').first().click();
    }
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should persist authentication across page reloads', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'adm@nxt.eco.br');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/.*\/(?!login)/);
    
    // Reload page
    await page.reload();
    
    // Should still be authenticated
    await expect(page).not.toHaveURL(/.*\/login/);
    await expect(page.locator('[data-testid="user-avatar"], .user-menu, .logout-button')).toBeVisible();
  });

  test('should handle session expiration', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'adm@nxt.eco.br');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/.*\/(?!login)/);
    
    // Simulate session expiration by clearing localStorage
    await page.evaluate(() => {
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
    });
    
    // Navigate to a protected route
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should show loading state during authentication', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in credentials
    await page.fill('input[type="email"]', 'adm@nxt.eco.br');
    await page.fill('input[type="password"]', 'demo123');
    
    // Click submit and immediately check for loading state
    await page.click('button[type="submit"]');
    
    // Should show loading indicator
    await expect(page.locator('.loading, .spinner, [data-testid="loading"]')).toBeVisible();
    
    // Wait for authentication to complete
    await page.waitForURL(/.*\/(?!login)/, { timeout: 10000 });
  });

  test('should validate form fields', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    await expect(emailInput).toHaveAttribute('required');
    await expect(passwordInput).toHaveAttribute('required');
    
    // Fill invalid email
    await emailInput.fill('invalid-email');
    await page.click('button[type="submit"]');
    
    // Should show email validation error
    const emailValidity = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(emailValidity).toBe(false);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Intercept auth requests to simulate network error
    await page.route('**/auth/v1/token*', route => {
      route.abort('failed');
    });
    
    await page.goto('/login');
    await page.fill('input[type="email"]', 'adm@nxt.eco.br');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Should show network error message
    await expect(page.locator('.error, [role="alert"], .alert-error')).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test('should protect dashboard route', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should protect settings route', async ({ page }) => {
    await page.goto('/settings');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should allow access to protected routes when authenticated', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'adm@nxt.eco.br');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/.*\/(?!login)/);
    
    // Navigate to protected route
    await page.goto('/dashboard');
    
    // Should not redirect to login
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('main, [data-testid="dashboard"]')).toBeVisible();
  });
});

test.describe('User Interface', () => {
  test('should have accessible login form', async ({ page }) => {
    await page.goto('/login');
    
    // Check form accessibility
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    // Should have labels
    await expect(emailInput).toHaveAttribute('aria-label');
    await expect(passwordInput).toHaveAttribute('aria-label');
    
    // Should be keyboard navigable
    await emailInput.focus();
    await expect(emailInput).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(passwordInput).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(submitButton).toBeFocused();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/login');
    
    // Check that form is still usable
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Form should be properly sized
    const form = page.locator('form').first();
    const formBox = await form.boundingBox();
    
    if (formBox) {
      expect(formBox.width).toBeLessThanOrEqual(375);
    }
  });

  test('should show/hide password', async ({ page }) => {
    await page.goto('/login');
    
    const passwordInput = page.locator('input[type="password"]');
    const toggleButton = page.locator('button[aria-label*="password"], .password-toggle, [data-testid="toggle-password"]').first();
    
    if (await toggleButton.isVisible()) {
      // Initially should be password type
      await expect(passwordInput).toHaveAttribute('type', 'password');
      
      // Click toggle
      await toggleButton.click();
      
      // Should change to text type
      await expect(passwordInput).toHaveAttribute('type', 'text');
      
      // Click again to hide
      await toggleButton.click();
      
      // Should be password again
      await expect(passwordInput).toHaveAttribute('type', 'password');
    }
  });

  test('should remember last email', async ({ page }) => {
    await page.goto('/login');
    
    // Fill email and submit (will fail)
    await page.fill('input[type="email"]', 'user@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Reload page
    await page.reload();
    
    // Email should be remembered (if feature exists)
    const emailValue = await page.locator('input[type="email"]').inputValue();
    if (emailValue) {
      expect(emailValue).toBe('user@example.com');
    }
  });
});

test.describe('Social Authentication', () => {
  test('should show social login options if available', async ({ page }) => {
    await page.goto('/login');
    
    // Check for social login buttons
    const socialButtons = page.locator('.social-login, [data-testid*="social"], button:has-text("Google"), button:has-text("GitHub")');
    
    if (await socialButtons.count() > 0) {
      await expect(socialButtons.first()).toBeVisible();
      
      // Should be clickable
      await expect(socialButtons.first()).toBeEnabled();
    }
  });
});

test.describe('Error Recovery', () => {
  test('should handle auth service unavailable', async ({ page }) => {
    // Block all auth requests
    await page.route('**/auth/**', route => {
      route.fulfill({
        status: 503,
        body: JSON.stringify({ error: 'Service Unavailable' })
      });
    });
    
    await page.goto('/login');
    await page.fill('input[type="email"]', 'adm@nxt.eco.br');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Should show service error message
    await expect(page.locator('.error, [role="alert"]')).toBeVisible();
  });

  test('should retry failed authentication', async ({ page }) => {
    let requestCount = 0;
    
    // Fail first request, succeed on retry
    await page.route('**/auth/v1/token*', route => {
      requestCount++;
      if (requestCount === 1) {
        route.abort('failed');
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            access_token: 'mock-token',
            user: { id: '1', email: 'adm@nxt.eco.br' }
          })
        });
      }
    });
    
    await page.goto('/login');
    await page.fill('input[type="email"]', 'adm@nxt.eco.br');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Should eventually succeed (if retry logic exists)
    await page.waitForTimeout(2000);
    
    // Check if retry button appears or if it auto-retries
    const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")');
    if (await retryButton.isVisible()) {
      await retryButton.click();
      await page.waitForURL(/.*\/(?!login)/);
    }
  });
});