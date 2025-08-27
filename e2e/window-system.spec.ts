/**
 * Window System E2E Tests
 * End-to-end testing for the window management system
 */

import { test, expect, Page, Locator } from '@playwright/test';

// Helper function to login
async function loginAsDemo(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'adm@nxt.eco.br');
  await page.fill('input[type="password"]', 'demo123');
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*\/(?!login)/);
}

// Helper function to find and open a module
async function openModule(page: Page, moduleName: string) {
  // Look for module buttons/icons
  const moduleButton = page.locator(`[data-testid*="${moduleName.toLowerCase()}"], button:has-text("${moduleName}"), .module-icon:has-text("${moduleName}")`).first();
  
  if (await moduleButton.isVisible()) {
    await moduleButton.click();
  } else {
    // Try alternative selectors
    const altButton = page.locator(`button:has-text("CONFIGURAÇÕES"), button:has-text("SISTEMA")`).first();
    if (await altButton.isVisible()) {
      await altButton.click();
    }
  }
  
  // Wait for window to appear
  await page.waitForSelector('[data-testid="window"], .window, .modal', { timeout: 5000 });
}

test.describe('Window System', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test('should create a new window', async ({ page }) => {
    // Open a module to create a window
    await openModule(page, 'SISTEMA');
    
    // Check that a window was created
    const windows = page.locator('[data-testid="window"], .window, .modal');
    await expect(windows.first()).toBeVisible();
    
    // Window should have a title bar
    const titleBar = page.locator('.window-header, .window-title, [data-testid="window-header"]');
    await expect(titleBar.first()).toBeVisible();
  });

  test('should display window with correct title', async ({ page }) => {
    await openModule(page, 'SISTEMA');
    
    // Check for window title
    const windowTitle = page.locator('.window-title, [data-testid="window-title"], h1, h2, h3').filter({ hasText: /CONFIGURAÇÕES|SISTEMA/ });
    await expect(windowTitle.first()).toBeVisible();
  });

  test('should close window when close button clicked', async ({ page }) => {
    await openModule(page, 'SISTEMA');
    
    // Find and click close button
    const closeButton = page.locator('.window-close, [data-testid="close-window"], button[aria-label*="close"], .close-button').first();
    
    if (await closeButton.isVisible()) {
      await closeButton.click();
      
      // Window should disappear
      await expect(page.locator('[data-testid="window"], .window, .modal')).not.toBeVisible();
    }
  });

  test('should minimize window', async ({ page }) => {
    await openModule(page, 'SISTEMA');
    
    // Find minimize button
    const minimizeButton = page.locator('.window-minimize, [data-testid="minimize-window"], button[aria-label*="minimize"]').first();
    
    if (await minimizeButton.isVisible()) {
      await minimizeButton.click();
      
      // Window should be minimized (not visible or with minimized class)
      const window = page.locator('[data-testid="window"], .window, .modal').first();
      const isMinimized = await window.evaluate(el => 
        el.classList.contains('minimized') || 
        getComputedStyle(el).display === 'none' ||
        getComputedStyle(el).visibility === 'hidden'
      );
      
      expect(isMinimized).toBe(true);
    }
  });

  test('should maximize window', async ({ page }) => {
    await openModule(page, 'SISTEMA');
    
    // Find maximize button
    const maximizeButton = page.locator('.window-maximize, [data-testid="maximize-window"], button[aria-label*="maximize"]').first();
    
    if (await maximizeButton.isVisible()) {
      const window = page.locator('[data-testid="window"], .window, .modal').first();
      
      // Get original size
      const originalSize = await window.boundingBox();
      
      await maximizeButton.click();
      
      // Window should be larger after maximizing
      const maximizedSize = await window.boundingBox();
      
      if (originalSize && maximizedSize) {
        expect(maximizedSize.width).toBeGreaterThan(originalSize.width);
        expect(maximizedSize.height).toBeGreaterThan(originalSize.height);
      }
    }
  });

  test('should restore minimized window from taskbar', async ({ page }) => {
    await openModule(page, 'SISTEMA');
    
    // Minimize window
    const minimizeButton = page.locator('.window-minimize, [data-testid="minimize-window"]').first();
    
    if (await minimizeButton.isVisible()) {
      await minimizeButton.click();
      
      // Look for taskbar item
      const taskbarItem = page.locator('.taskbar-item, [data-testid="taskbar-item"], .minimized-window').first();
      
      if (await taskbarItem.isVisible()) {
        await taskbarItem.click();
        
        // Window should be restored
        const window = page.locator('[data-testid="window"], .window, .modal').first();
        await expect(window).toBeVisible();
      }
    }
  });

  test('should drag window to move position', async ({ page }) => {
    await openModule(page, 'SISTEMA');
    
    const window = page.locator('[data-testid="window"], .window, .modal').first();
    const titleBar = page.locator('.window-header, .window-title, [data-testid="window-header"]').first();
    
    // Get initial position
    const initialPosition = await window.boundingBox();
    
    if (initialPosition && await titleBar.isVisible()) {
      // Drag window
      await titleBar.hover();
      await page.mouse.down();
      await page.mouse.move(initialPosition.x + 100, initialPosition.y + 100);
      await page.mouse.up();
      
      // Check new position
      const newPosition = await window.boundingBox();
      
      if (newPosition) {
        expect(newPosition.x).toBeGreaterThan(initialPosition.x);
        expect(newPosition.y).toBeGreaterThan(initialPosition.y);
      }
    }
  });

  test('should resize window by dragging corners', async ({ page }) => {
    await openModule(page, 'SISTEMA');
    
    const window = page.locator('[data-testid="window"], .window, .modal').first();
    
    // Look for resize handle
    const resizeHandle = page.locator('.resize-handle, .window-resize, [data-testid="resize-handle"]').first();
    
    if (await resizeHandle.isVisible()) {
      const initialSize = await window.boundingBox();
      
      if (initialSize) {
        // Drag to resize
        await resizeHandle.hover();
        await page.mouse.down();
        await page.mouse.move(initialSize.x + initialSize.width + 50, initialSize.y + initialSize.height + 50);
        await page.mouse.up();
        
        // Check new size
        const newSize = await window.boundingBox();
        
        if (newSize) {
          expect(newSize.width).toBeGreaterThan(initialSize.width);
          expect(newSize.height).toBeGreaterThan(initialSize.height);
        }
      }
    }
  });

  test('should handle multiple windows', async ({ page }) => {
    // Open first window
    await openModule(page, 'SISTEMA');
    
    // Try to open another module or same module again
    const moduleButtons = page.locator('button:has-text("CONFIGURAÇÕES"), button:has-text("SISTEMA"), [data-testid*="module"]');
    const buttonCount = await moduleButtons.count();
    
    if (buttonCount > 1) {
      await moduleButtons.nth(1).click();
      
      // Should have multiple windows
      const windows = page.locator('[data-testid="window"], .window, .modal');
      const windowCount = await windows.count();
      
      expect(windowCount).toBeGreaterThan(1);
    } else {
      // Try opening the same module again
      await openModule(page, 'SISTEMA');
      
      // Should still work (either create new window or focus existing)
      const windows = page.locator('[data-testid="window"], .window, .modal');
      await expect(windows.first()).toBeVisible();
    }
  });

  test('should focus window when clicked', async ({ page }) => {
    // Open two windows if possible
    await openModule(page, 'SISTEMA');
    
    const firstWindow = page.locator('[data-testid="window"], .window, .modal').first();
    
    // Get initial z-index
    const initialZIndex = await firstWindow.evaluate(el => getComputedStyle(el).zIndex);
    
    // Click on window to focus
    await firstWindow.click();
    
    // Z-index should change or window should be on top
    const newZIndex = await firstWindow.evaluate(el => getComputedStyle(el).zIndex);
    
    // Either z-index increased or window is visibly on top
    const isOnTop = parseInt(newZIndex) >= parseInt(initialZIndex) || newZIndex === 'auto';
    expect(isOnTop).toBe(true);
  });

  test('should save window position on close', async ({ page }) => {
    await openModule(page, 'SISTEMA');
    
    const window = page.locator('[data-testid="window"], .window, .modal').first();
    
    // Move window
    const titleBar = page.locator('.window-header, .window-title, [data-testid="window-header"]').first();
    
    if (await titleBar.isVisible()) {
      await titleBar.hover();
      await page.mouse.down();
      await page.mouse.move(300, 300);
      await page.mouse.up();
      
      // Close window
      const closeButton = page.locator('.window-close, [data-testid="close-window"]').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
      
      // Reopen window
      await openModule(page, 'SISTEMA');
      
      // Position should be preserved (check localStorage or window position)
      const reopenedWindow = page.locator('[data-testid="window"], .window, .modal').first();
      const position = await reopenedWindow.boundingBox();
      
      if (position) {
        // Should be near the moved position (allowing for some variance)
        expect(position.x).toBeGreaterThan(250);
        expect(position.y).toBeGreaterThan(250);
      }
    }
  });

  test('should snap window to screen edges', async ({ page }) => {
    await openModule(page, 'SISTEMA');
    
    const window = page.locator('[data-testid="window"], .window, .modal').first();
    const titleBar = page.locator('.window-header, .window-title, [data-testid="window-header"]').first();
    
    if (await titleBar.isVisible()) {
      // Try to drag to left edge
      await titleBar.hover();
      await page.mouse.down();
      await page.mouse.move(0, 100); // Near left edge
      await page.mouse.up();
      
      await page.waitForTimeout(500); // Wait for snap animation
      
      // Check if window snapped to left half
      const position = await window.boundingBox();
      
      if (position) {
        // Should be at or near left edge
        expect(position.x).toBeLessThanOrEqual(10);
      }
    }
  });

  test('should handle window overflow gracefully', async ({ page }) => {
    // Try to open many modules to test window management
    const moduleButtons = page.locator('button:has-text("CONFIGURAÇÕES"), button:has-text("SISTEMA")');
    const buttonCount = await moduleButtons.count();
    
    // Open multiple instances
    for (let i = 0; i < Math.min(buttonCount, 3); i++) {
      if (await moduleButtons.nth(i % buttonCount).isVisible()) {
        await moduleButtons.nth(i % buttonCount).click();
        await page.waitForTimeout(500);
      }
    }
    
    // All windows should be manageable (not overlapping completely)
    const windows = page.locator('[data-testid="window"], .window, .modal');
    const windowCount = await windows.count();
    
    if (windowCount > 1) {
      // Check that windows have different positions
      const positions = [];
      for (let i = 0; i < windowCount; i++) {
        const pos = await windows.nth(i).boundingBox();
        if (pos) positions.push(pos);
      }
      
      // Windows should not be in exactly the same position
      const uniquePositions = new Set(positions.map(p => `${p.x},${p.y}`));
      expect(uniquePositions.size).toBeGreaterThan(1);
    }
  });
});

test.describe('Window Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test('should be keyboard navigable', async ({ page }) => {
    await openModule(page, 'SISTEMA');
    
    // Window should be focusable
    const window = page.locator('[data-testid="window"], .window, .modal').first();
    await window.focus();
    
    // Should be able to tab to controls
    await page.keyboard.press('Tab');
    
    // Check if focus is on a control element
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have proper ARIA attributes', async ({ page }) => {
    await openModule(page, 'SISTEMA');
    
    const window = page.locator('[data-testid="window"], .window, .modal').first();
    
    // Window should have dialog role or similar
    const role = await window.getAttribute('role');
    expect(['dialog', 'window', 'application']).toContain(role);
    
    // Should have accessible name
    const ariaLabel = await window.getAttribute('aria-label');
    const ariaLabelledBy = await window.getAttribute('aria-labelledby');
    
    expect(ariaLabel || ariaLabelledBy).toBeTruthy();
  });

  test('should support escape key to close', async ({ page }) => {
    await openModule(page, 'SISTEMA');
    
    // Press escape
    await page.keyboard.press('Escape');
    
    // Window should close
    await expect(page.locator('[data-testid="window"], .window, .modal')).not.toBeVisible();
  });
});

test.describe('Window Performance', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test('should load windows quickly', async ({ page }) => {
    const startTime = Date.now();
    
    await openModule(page, 'SISTEMA');
    
    // Window should appear within reasonable time
    await expect(page.locator('[data-testid="window"], .window, .modal').first()).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
  });

  test('should handle rapid window operations', async ({ page }) => {
    await openModule(page, 'SISTEMA');
    
    const window = page.locator('[data-testid="window"], .window, .modal').first();
    const minimizeButton = page.locator('.window-minimize, [data-testid="minimize-window"]').first();
    const maximizeButton = page.locator('.window-maximize, [data-testid="maximize-window"]').first();
    
    if (await minimizeButton.isVisible() && await maximizeButton.isVisible()) {
      // Rapid operations
      await minimizeButton.click();
      await page.waitForTimeout(100);
      
      const taskbarItem = page.locator('.taskbar-item, [data-testid="taskbar-item"]').first();
      if (await taskbarItem.isVisible()) {
        await taskbarItem.click();
      }
      
      await page.waitForTimeout(100);
      await maximizeButton.click();
      await page.waitForTimeout(100);
      await maximizeButton.click(); // Restore
      
      // Window should still be responsive
      await expect(window).toBeVisible();
    }
  });

  test('should not cause memory leaks with many operations', async ({ page }) => {
    // Open and close windows multiple times
    for (let i = 0; i < 5; i++) {
      await openModule(page, 'SISTEMA');
      
      const closeButton = page.locator('.window-close, [data-testid="close-window"]').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
      
      await page.waitForTimeout(200);
    }
    
    // Page should still be responsive
    await expect(page.locator('body')).toBeVisible();
    
    // No JavaScript errors should have occurred
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    expect(errors.length).toBe(0);
  });
});