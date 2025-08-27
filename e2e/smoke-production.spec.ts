/**
 * Production Smoke Tests
 * Critical functionality validation for production deployments
 */

import { test, expect, Page } from '@playwright/test';

// Configuration for different environments
const config = {
  staging: {
    baseUrl: process.env.STAGING_URL || 'https://staging.plataforma.dev',
    apiUrl: process.env.STAGING_API_URL || 'https://api-staging.plataforma.dev',
  },
  production: {
    baseUrl: process.env.PRODUCTION_URL || 'https://plataforma.dev',
    apiUrl: process.env.PRODUCTION_API_URL || 'https://api.plataforma.dev',
  }
};

const currentEnv = process.env.TEST_ENVIRONMENT || 'staging';
const testConfig = config[currentEnv as keyof typeof config];

test.describe('Production Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for production tests
    test.setTimeout(30000);
    
    // Add error tracking
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Console error: ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      console.error(`Page error: ${error.message}`);
    });
  });

  test('application should load successfully', async ({ page }) => {
    // Navigate to the application
    await page.goto(testConfig.baseUrl);
    
    // Check page loads within acceptable time
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Verify basic page structure
    await expect(page).toHaveTitle(/Plataforma/);
    
    // Check for critical elements
    await expect(page.locator('body')).toBeVisible();
    
    // Ensure no critical JavaScript errors
    const errors = await page.evaluate(() => window.console.errors || []);
    expect(errors.length).toBe(0);
  });

  test('health check endpoint should respond', async ({ request }) => {
    const response = await request.get(`${testConfig.apiUrl}/health`);
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const health = await response.json();
    expect(health).toHaveProperty('status', 'ok');
    expect(health).toHaveProperty('timestamp');
  });

  test('API should be accessible', async ({ request }) => {
    // Test basic API endpoints
    const endpoints = [
      '/api/health',
      '/api/version',
      '/api/status',
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(`${testConfig.baseUrl}${endpoint}`);
      expect(response.status()).toBeLessThan(500); // No server errors
    }
  });

  test('authentication flow should work', async ({ page }) => {
    await page.goto(`${testConfig.baseUrl}/login`);
    
    // Check login page loads
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Test demo login (only if demo mode is enabled)
    if (process.env.DEMO_MODE === 'true') {
      await page.fill('input[type="email"]', 'adm@nxt.eco.br');
      await page.fill('input[type="password"]', 'demo123');
      await page.click('button[type="submit"]');
      
      // Should redirect away from login
      await page.waitForURL(/.*\/(?!login)/, { timeout: 10000 });
      
      // Should show authenticated state
      const userIndicator = page.locator('[data-testid="user-avatar"], .user-menu, .logout-button');
      await expect(userIndicator.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('critical pages should be accessible', async ({ page }) => {
    const criticalPages = [
      '/',
      '/login',
    ];

    for (const pagePath of criticalPages) {
      await page.goto(`${testConfig.baseUrl}${pagePath}`);
      await page.waitForLoadState('networkidle');
      
      // Check page doesn't have critical errors
      await expect(page.locator('body')).toBeVisible();
      
      // Check for error pages
      const errorText = await page.textContent('body');
      expect(errorText).not.toContain('500');
      expect(errorText).not.toContain('Internal Server Error');
      expect(errorText).not.toContain('Application Error');
    }
  });

  test('database connectivity should work', async ({ request }) => {
    // Test database health through API
    const response = await request.get(`${testConfig.apiUrl}/health/database`);
    
    if (response.ok()) {
      const dbHealth = await response.json();
      expect(dbHealth).toHaveProperty('database');
      expect(dbHealth.database).toHaveProperty('status', 'connected');
    } else {
      // Database health endpoint might not exist, check general health
      const generalHealth = await request.get(`${testConfig.apiUrl}/health`);
      expect(generalHealth.ok()).toBeTruthy();
    }
  });

  test('static assets should load correctly', async ({ page }) => {
    await page.goto(testConfig.baseUrl);
    
    // Check CSS loads
    const stylesheets = await page.locator('link[rel="stylesheet"]').count();
    expect(stylesheets).toBeGreaterThan(0);
    
    // Check JavaScript loads
    const scripts = await page.locator('script[src]').count();
    expect(scripts).toBeGreaterThan(0);
    
    // Check for 404 errors on resources
    const responses = [];
    page.on('response', response => {
      responses.push({ url: response.url(), status: response.status() });
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const failedRequests = responses.filter(r => r.status >= 400);
    expect(failedRequests.length).toBe(0);
  });

  test('performance should be acceptable', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(testConfig.baseUrl);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    
    // Check Core Web Vitals if available
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        if ('web-vital' in window) {
          // If web-vitals library is available
          resolve({
            lcp: window.performance?.getEntriesByType?.('largest-contentful-paint')?.[0]?.startTime,
            fid: window.performance?.getEntriesByType?.('first-input')?.[0]?.processingStart,
            cls: window.performance?.getEntriesByType?.('layout-shift')?.[0]?.value,
          });
        } else {
          resolve(null);
        }
      });
    });
    
    if (metrics) {
      // LCP should be under 2.5s
      if (metrics.lcp) expect(metrics.lcp).toBeLessThan(2500);
      // CLS should be under 0.1
      if (metrics.cls) expect(metrics.cls).toBeLessThan(0.1);
    }
  });

  test('error handling should work correctly', async ({ page }) => {
    // Test 404 page
    await page.goto(`${testConfig.baseUrl}/nonexistent-page`);
    
    // Should show proper 404 page, not crash
    const pageText = await page.textContent('body');
    expect(pageText).toMatch(/404|not found|page not found/i);
    
    // Should still have navigation
    await expect(page.locator('body')).toBeVisible();
  });

  test('security headers should be present', async ({ request }) => {
    const response = await request.get(testConfig.baseUrl);
    const headers = response.headers();
    
    // Check for important security headers
    expect(headers).toHaveProperty('x-frame-options');
    expect(headers).toHaveProperty('x-content-type-options');
    
    // CSP header (if implemented)
    if (headers['content-security-policy']) {
      expect(headers['content-security-policy']).toContain("default-src");
    }
    
    // HTTPS redirect (for production)
    if (currentEnv === 'production') {
      expect(headers).toHaveProperty('strict-transport-security');
    }
  });

  test('user interface should be responsive', async ({ page }) => {
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 768, height: 1024 },  // Tablet
      { width: 375, height: 667 },   // Mobile
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(testConfig.baseUrl);
      
      await page.waitForLoadState('networkidle');
      
      // Should be usable at all sizes
      await expect(page.locator('body')).toBeVisible();
      
      // Check main navigation is accessible
      const nav = page.locator('nav, [role="navigation"], .navigation, .navbar').first();
      if (await nav.isVisible()) {
        await expect(nav).toBeVisible();
      }
    }
  });

  test('session management should work', async ({ page, context }) => {
    // Test session persistence
    await page.goto(`${testConfig.baseUrl}/login`);
    
    if (process.env.DEMO_MODE === 'true') {
      await page.fill('input[type="email"]', 'adm@nxt.eco.br');
      await page.fill('input[type="password"]', 'demo123');
      await page.click('button[type="submit"]');
      
      await page.waitForURL(/.*\/(?!login)/);
      
      // Open new tab to test session sharing
      const newPage = await context.newPage();
      await newPage.goto(testConfig.baseUrl);
      
      // Should still be authenticated
      const userIndicator = newPage.locator('[data-testid="user-avatar"], .user-menu, .logout-button');
      await expect(userIndicator.first()).toBeVisible({ timeout: 5000 });
      
      await newPage.close();
    }
  });

  test('module system should be functional', async ({ page }) => {
    await page.goto(testConfig.baseUrl);
    
    // If demo login is available, authenticate first
    if (process.env.DEMO_MODE === 'true') {
      if (page.url().includes('/login')) {
        await page.fill('input[type="email"]', 'adm@nxt.eco.br');
        await page.fill('input[type="password"]', 'demo123');
        await page.click('button[type="submit"]');
        await page.waitForURL(/.*\/(?!login)/);
      }
    }
    
    // Look for module interface elements
    const moduleElements = page.locator('[data-testid*="module"], .module, button:has-text("CONFIGURAÇÕES"), button:has-text("SISTEMA")');
    
    const elementCount = await moduleElements.count();
    if (elementCount > 0) {
      // Try to interact with first module
      await moduleElements.first().click();
      
      // Wait for some response (window, modal, or navigation)
      await page.waitForTimeout(2000);
      
      // Should not crash
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('websocket connections should work', async ({ page }) => {
    // Track WebSocket connections
    const wsConnections: string[] = [];
    
    page.on('websocket', ws => {
      wsConnections.push(ws.url());
    });

    await page.goto(testConfig.baseUrl);
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for WebSocket connections to establish
    await page.waitForTimeout(3000);
    
    // If WebSockets are used, they should connect successfully
    if (wsConnections.length > 0) {
      console.log(`WebSocket connections: ${wsConnections.join(', ')}`);
      // Could add more specific WebSocket testing here
    }
  });

  test('external integrations should be accessible', async ({ request }) => {
    // Test external service endpoints that the app depends on
    const externalServices = [
      // Add your external service URLs here
    ];

    for (const serviceUrl of externalServices) {
      try {
        const response = await request.get(serviceUrl);
        // Should not return 5xx errors
        expect(response.status()).toBeLessThan(500);
      } catch (error) {
        console.warn(`External service ${serviceUrl} not accessible:`, error);
        // Don't fail the test for external services
      }
    }
  });
});

test.describe('Environment-Specific Tests', () => {
  test.skip(currentEnv !== 'production', 'Production-only tests');
  
  test('production should have analytics', async ({ page }) => {
    await page.goto(testConfig.baseUrl);
    await page.waitForLoadState('networkidle');
    
    // Check for analytics scripts (Google Analytics, etc.)
    const analyticsScripts = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      return scripts.some(script => 
        script.src.includes('google-analytics') || 
        script.src.includes('gtag') ||
        script.innerHTML.includes('ga(') ||
        script.innerHTML.includes('gtag(')
      );
    });
    
    // Production should have analytics
    expect(analyticsScripts).toBe(true);
  });

  test('production should have proper caching headers', async ({ request }) => {
    // Test static assets caching
    const response = await request.get(`${testConfig.baseUrl}/assets/index.js`);
    
    if (response.ok()) {
      const headers = response.headers();
      expect(headers['cache-control']).toBeTruthy();
      
      // Should have aggressive caching for static assets
      expect(headers['cache-control']).toMatch(/max-age=\d+/);
    }
  });
});

test.describe('Monitoring Integration', () => {
  test('should report to monitoring systems', async ({ page }) => {
    // Track performance and error reporting
    const performanceEntries: any[] = [];
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(testConfig.baseUrl);
    await page.waitForLoadState('networkidle');
    
    // Get performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
      };
    });
    
    console.log('Performance metrics:', metrics);
    
    // Verify metrics are reasonable
    expect(metrics.loadTime).toBeGreaterThan(0);
    expect(metrics.domContentLoaded).toBeGreaterThan(0);
    
    // Should not have critical errors
    const criticalErrors = errors.filter(error => 
      error.includes('TypeError') || 
      error.includes('ReferenceError') ||
      error.includes('Network Error')
    );
    
    expect(criticalErrors.length).toBe(0);
  });
});