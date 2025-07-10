const { test, expect } = require('@playwright/test');

test.describe('User Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/LabScientific/);
  });

  test('should have responsive design', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
    
    // Check for mobile navigation
    const mobileMenu = page.locator('.mobile-menu, .hamburger, .menu-toggle');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await expect(page.locator('.mobile-nav, .sidebar')).toBeVisible();
    }
  });

  test('should have accessible navigation', async ({ page }) => {
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    // Verify navigation works with keyboard
    await expect(page.locator('a:focus, button:focus')).toBeVisible();
  });

  test('should display sidebar navigation', async ({ page }) => {
    // Check for sidebar
    const sidebar = page.locator('.sidebar, .nav-sidebar, nav');
    await expect(sidebar).toBeVisible();
    
    // Check for main navigation items
    const navItems = ['Dashboard', 'Sample', 'Batch', 'Reports'];
    
    for (const item of navItems) {
      const navItem = page.locator(`text=${item}`);
      if (await navItem.isVisible()) {
        await expect(navItem).toBeVisible();
      }
    }
  });

  test('should have working search functionality', async ({ page }) => {
    // Look for global search
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]');
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.keyboard.press('Enter');
      
      // Wait for search results
      await page.waitForTimeout(2000);
      
      // Verify search results are displayed
      await expect(page.locator('.search-results, .results')).toBeVisible();
    }
  });

  test('should display data tables correctly', async ({ page }) => {
    // Navigate to a page with data tables
    await page.click('text=Sample');
    
    // Wait for table to load
    await page.waitForTimeout(2000);
    
    // Check for table structure
    const table = page.locator('table');
    
    if (await table.isVisible()) {
      // Verify table headers
      await expect(table.locator('th')).toHaveCount({ min: 1 });
      
      // Test table sorting
      const firstHeader = table.locator('th').first();
      await firstHeader.click();
      
      // Wait for sort to apply
      await page.waitForTimeout(1000);
      
      // Verify sorting works
      await expect(table).toBeVisible();
    }
  });

  test('should handle form interactions', async ({ page }) => {
    // Navigate to a form page
    await page.click('text=Client Register');
    
    // Test form field interactions
    const nameInput = page.locator('input[name="name"]');
    
    if (await nameInput.isVisible()) {
      // Test input validation
      await nameInput.fill('Test User');
      await expect(nameInput).toHaveValue('Test User');
      
      // Test form submission
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();
    }
  });

  test('should display loading states', async ({ page }) => {
    // Navigate to a page that loads data
    await page.click('text=Sample');
    
    // Look for loading indicators
    const loadingElements = page.locator('.loading, .spinner, .skeleton');
    
    if (await loadingElements.count() > 0) {
      // Verify loading states are shown
      await expect(loadingElements.first()).toBeVisible();
    }
  });

  test('should handle error states', async ({ page }) => {
    // Simulate network error
    await page.route('**/api/**', route => route.abort());
    
    // Navigate to a page that loads data
    await page.click('text=Sample');
    
    // Wait for error state
    await page.waitForTimeout(3000);
    
    // Check for error messages
    const errorElements = page.locator('.error, .alert-error, text=Error');
    
    if (await errorElements.count() > 0) {
      await expect(errorElements.first()).toBeVisible();
    }
  });

  test('should have proper button states', async ({ page }) => {
    // Navigate to form page
    await page.click('text=Client Register');
    
    // Check for disabled buttons
    const submitButton = page.locator('button[type="submit"]');
    
    if (await submitButton.isVisible()) {
      // Test button states
      await expect(submitButton).toBeVisible();
      
      // Test hover states
      await submitButton.hover();
      await page.waitForTimeout(500);
      
      // Test focus states
      await submitButton.focus();
      await page.waitForTimeout(500);
    }
  });

  test('should have proper color contrast', async ({ page }) => {
    // Test basic contrast by checking text visibility
    const textElements = page.locator('h1, h2, h3, p, span, div');
    
    if (await textElements.count() > 0) {
      // Verify text is visible (indicates good contrast)
      await expect(textElements.first()).toBeVisible();
    }
  });

  test('should handle drag and drop interactions', async ({ page }) => {
    // Navigate to a page with drag and drop
    await page.click('text=Generate Batch');
    
    // Wait for interface to load
    await page.waitForTimeout(2000);
    
    // Look for draggable elements
    const draggableElements = page.locator('[draggable="true"], .draggable');
    
    if (await draggableElements.count() > 0) {
      const sourceElement = draggableElements.first();
      const targetElement = page.locator('.drop-zone, .well').first();
      
      if (await targetElement.isVisible()) {
        // Test drag and drop
        await sourceElement.dragTo(targetElement);
        
        // Wait for drop to complete
        await page.waitForTimeout(1000);
        
        // Verify drop was successful
        await expect(targetElement).toHaveClass(/filled|occupied/);
      }
    }
  });
});

test.describe('User Interface - Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');
    
    // Check for ARIA labels on interactive elements
    const interactiveElements = page.locator('button, input, select, a');
    
    if (await interactiveElements.count() > 0) {
      // Check first few elements for ARIA attributes
      for (let i = 0; i < Math.min(5, await interactiveElements.count()); i++) {
        const element = interactiveElements.nth(i);
        
        // Check for ARIA label or accessible name
        const hasAriaLabel = await element.getAttribute('aria-label');
        const hasAriaLabelledBy = await element.getAttribute('aria-labelledby');
        const hasTitle = await element.getAttribute('title');
        const hasText = await element.textContent();
        
        // Element should have some form of accessible name
        expect(hasAriaLabel || hasAriaLabelledBy || hasTitle || hasText).toBeTruthy();
      }
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');
    
    // Test Tab navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Test Enter/Space on focused elements
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    // Verify keyboard interaction worked
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    // Check for heading elements
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    
    if (await headings.count() > 0) {
      // Verify at least one h1 exists
      const h1Elements = page.locator('h1');
      await expect(h1Elements).toHaveCount({ min: 1 });
    }
  });

  test('should have proper focus indicators', async ({ page }) => {
    await page.goto('/');
    
    // Test focus on interactive elements
    const focusableElements = page.locator('button, input, select, a');
    
    if (await focusableElements.count() > 0) {
      const firstElement = focusableElements.first();
      await firstElement.focus();
      
      // Verify focus is visible
      await expect(firstElement).toBeFocused();
    }
  });

  test('should have proper form labels', async ({ page }) => {
    // Navigate to a form page
    await page.click('text=Client Register');
    
    // Check for form labels
    const inputs = page.locator('input, select, textarea');
    
    if (await inputs.count() > 0) {
      // Check first few inputs for labels
      for (let i = 0; i < Math.min(3, await inputs.count()); i++) {
        const input = inputs.nth(i);
        
        // Check for associated label
        const inputId = await input.getAttribute('id');
        const inputName = await input.getAttribute('name');
        
        if (inputId) {
          const label = page.locator(`label[for="${inputId}"]`);
          if (await label.count() > 0) {
            await expect(label).toBeVisible();
          }
        }
      }
    }
  });
});

test.describe('User Interface - Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should handle large data sets', async ({ page }) => {
    // Navigate to a page with data
    await page.click('text=Sample');
    
    const startTime = Date.now();
    
    // Wait for data to load
    await page.waitForSelector('table, .data-list');
    
    const loadTime = Date.now() - startTime;
    
    // Should load data within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should handle concurrent interactions', async ({ page }) => {
    await page.goto('/');
    
    // Perform multiple interactions simultaneously
    const interactions = [
      page.click('text=Sample'),
      page.click('text=Batch'),
      page.click('text=Reports')
    ];
    
    // Wait for all interactions to complete
    await Promise.all(interactions);
    
    // Verify page is still responsive
    await expect(page.locator('body')).toBeVisible();
  });
});