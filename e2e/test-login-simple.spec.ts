/**
 * Simple debug test for login flow
 */

import { test, expect } from '@playwright/test';

test.describe('Simple Login Debug', () => {
  test('check login page and API', async ({ page }) => {
    console.log('\n=== Starting Simple Login Test ===');
    
    // Navigate directly to login
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3333/login', { waitUntil: 'networkidle' });
    
    // Take a screenshot
    await page.screenshot({ path: 'test-results/login-page.png', fullPage: true });
    
    // Check current URL
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Check page content
    const pageContent = await page.content();
    console.log('Page has content:', pageContent.length > 0 ? 'Yes' : 'No');
    
    // Try to find login form elements with broader selectors
    const emailInputs = await page.locator('input').all();
    console.log('Number of input elements found:', emailInputs.length);
    
    // Check for any forms
    const forms = await page.locator('form').all();
    console.log('Number of form elements found:', forms.length);
    
    // Check for any buttons
    const buttons = await page.locator('button').all();
    console.log('Number of button elements found:', buttons.length);
    
    // Check page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Try direct API call
    console.log('\n=== Testing Direct API Call ===');
    try {
      const apiResponse = await page.evaluate(async () => {
        const res = await fetch('http://localhost:8001/api/v1/auth/login', {
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
          data: data
        };
      });
      
      console.log('Direct API Response:', apiResponse);
    } catch (error) {
      console.error('Direct API call failed:', error);
    }
    
    // Try proxied API call
    console.log('\n=== Testing Proxied API Call ===');
    try {
      const proxiedResponse = await page.evaluate(async () => {
        const res = await fetch('/api/v1/auth/login', {
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
          url: res.url,
          data: data
        };
      });
      
      console.log('Proxied API Response:', proxiedResponse);
    } catch (error) {
      console.error('Proxied API call failed:', error);
    }
    
    // Check if we're on login page
    const isOnLogin = currentUrl.includes('login');
    console.log('Is on login page:', isOnLogin);
    
    // Print any errors from console
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Page error:', msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
  });
});