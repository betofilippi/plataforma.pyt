/**
 * Debug test for login flow - captures console and network
 */

import { test, expect } from '@playwright/test';

test.describe('Login Debug', () => {
  test('capture complete login flow with console and network', async ({ page }) => {
    // Collect console logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = `[${msg.type()}] ${msg.text()}`;
      consoleLogs.push(text);
      console.log(text); // Also log to test output
    });

    // Collect network requests
    const networkRequests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/api')) {
        const req = {
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          postData: request.postData()
        };
        networkRequests.push({ type: 'request', ...req });
        console.log('🔵 Request:', req.method, req.url);
        if (req.postData) {
          console.log('   Body:', req.postData);
        }
      }
    });

    // Collect network responses
    page.on('response', response => {
      if (response.url().includes('/api')) {
        response.text().then(body => {
          const resp = {
            url: response.url(),
            status: response.status(),
            statusText: response.statusText(),
            headers: response.headers(),
            body: body
          };
          networkRequests.push({ type: 'response', ...resp });
          console.log(`🟢 Response: ${resp.status} ${resp.url}`);
          if (body) {
            console.log('   Body:', body.substring(0, 200));
          }
        }).catch(() => {});
      }
    });

    // Collect page errors
    page.on('pageerror', error => {
      console.error('🔴 Page Error:', error.message);
      consoleLogs.push(`[error] ${error.message}`);
    });

    // Navigate to login page
    console.log('\n=== Navigating to login page ===');
    await page.goto('http://localhost:3333/login');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if login form is present
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    
    console.log('\n=== Filling login form ===');
    
    // Fill in credentials
    await emailInput.fill('admin@plataforma.app');
    await passwordInput.fill('admin123');
    
    // Wait a moment before clicking
    await page.waitForTimeout(1000);
    
    console.log('\n=== Clicking submit button ===');
    
    // Click submit and wait for navigation or error
    await submitButton.click();
    
    // Wait for either navigation or error message
    await Promise.race([
      page.waitForURL(/.*\/platform/, { timeout: 10000 }).catch(() => {}),
      page.waitForSelector('.error, [role="alert"]', { timeout: 10000 }).catch(() => {}),
      page.waitForTimeout(5000)
    ]);
    
    // Check final state
    const currentUrl = page.url();
    console.log('\n=== Final State ===');
    console.log('Current URL:', currentUrl);
    
    // Check for error messages
    const errorElement = await page.locator('.error, [role="alert"], .text-red-500').first();
    if (await errorElement.isVisible()) {
      const errorText = await errorElement.textContent();
      console.log('Error message found:', errorText);
    }
    
    // Print all console logs
    console.log('\n=== All Console Logs ===');
    consoleLogs.forEach(log => console.log(log));
    
    // Print all network activity
    console.log('\n=== Network Activity ===');
    networkRequests.forEach(item => {
      if (item.type === 'request') {
        console.log(`📤 ${item.method} ${item.url}`);
        if (item.postData) {
          try {
            const data = JSON.parse(item.postData);
            console.log('   Payload:', data);
          } catch {
            console.log('   Payload:', item.postData);
          }
        }
      } else {
        console.log(`📥 ${item.status} ${item.url}`);
        if (item.body) {
          try {
            const data = JSON.parse(item.body);
            console.log('   Response:', data);
          } catch {
            console.log('   Response:', item.body.substring(0, 200));
          }
        }
      }
    });
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/login-debug.png', fullPage: true });
    
    // Assert something to make test complete
    expect(consoleLogs.length).toBeGreaterThan(0);
  });

  test('test direct API call', async ({ page }) => {
    // Test direct API call to verify backend is working
    const response = await page.evaluate(async () => {
      const res = await fetch('http://localhost:3333/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@plataforma.app',
          password: 'admin123',
          remember_me: false
        })
      });
      
      const data = await res.json();
      return {
        status: res.status,
        statusText: res.statusText,
        data: data
      };
    });
    
    console.log('Direct API Response:', response);
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('access_token');
  });
});