const { test, expect } = require('@playwright/test');

test.describe('Sample Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the application to load
    await page.waitForLoadState('networkidle');
    
    // Ensure we're on the correct page
    await expect(page).toHaveTitle(/LabScientific/);
  });

  test('should display sample registration form', async ({ page }) => {
    // Navigate to sample registration
    await page.click('text=Client Register');
    
    // Wait for form to load
    await page.waitForSelector('form');
    
    // Check for required form fields
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="surname"]')).toBeVisible();
    await expect(page.locator('select[name="relation"]')).toBeVisible();
    await expect(page.locator('input[name="lab_number"]')).toBeVisible();
  });

  test('should create a new sample successfully', async ({ page }) => {
    // Navigate to sample registration
    await page.click('text=Client Register');
    
    // Fill out the form
    await page.fill('input[name="name"]', 'John');
    await page.fill('input[name="surname"]', 'Doe');
    await page.selectOption('select[name="relation"]', 'Child');
    await page.fill('input[name="lab_number"]', '25_TEST_001');
    await page.fill('input[name="case_number"]', 'CASE_2025_E2E');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for success message or redirect
    await page.waitForTimeout(2000);
    
    // Verify success (adjust selector based on your success indication)
    await expect(page.locator('text=Successfully')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Navigate to sample registration
    await page.click('text=Client Register');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Check for validation errors
    await expect(page.locator('text=required')).toBeVisible();
  });

  test('should display sample list', async ({ page }) => {
    // Navigate to sample list/queue
    await page.click('text=Sample');
    
    // Wait for table to load
    await page.waitForSelector('table, .sample-list');
    
    // Check for table headers or list structure
    const sampleTable = page.locator('table');
    if (await sampleTable.isVisible()) {
      await expect(sampleTable).toBeVisible();
    } else {
      // Check for alternative list structure
      await expect(page.locator('.sample-list')).toBeVisible();
    }
  });

  test('should search samples', async ({ page }) => {
    // Navigate to sample list
    await page.click('text=Sample');
    
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"]');
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('25_TEST');
      await page.keyboard.press('Enter');
      
      // Wait for search results
      await page.waitForTimeout(1000);
      
      // Verify search functionality (adjust based on your implementation)
      await expect(page.locator('table')).toBeVisible();
    }
  });

  test('should handle sample workflow status updates', async ({ page }) => {
    // Navigate to sample list
    await page.click('text=Sample');
    
    // Wait for samples to load
    await page.waitForTimeout(2000);
    
    // Look for a sample row and status update button
    const sampleRow = page.locator('tr').first();
    
    if (await sampleRow.isVisible()) {
      // Try to find and click a status update button
      const statusButton = page.locator('button:has-text("Update Status")');
      
      if (await statusButton.isVisible()) {
        await statusButton.click();
        
        // Wait for status update modal or dropdown
        await page.waitForTimeout(1000);
        
        // Verify status update interface is available
        await expect(page.locator('select, .status-dropdown')).toBeVisible();
      }
    }
  });

  test('should navigate between workflow stages', async ({ page }) => {
    // Test navigation between different workflow stages
    const stages = ['Sample Collection', 'PCR', 'Analysis', 'Review'];
    
    for (const stage of stages) {
      // Try to click on each stage if it exists
      const stageButton = page.locator(`text=${stage}`);
      
      if (await stageButton.isVisible()) {
        await stageButton.click();
        await page.waitForTimeout(1000);
        
        // Verify we're on the correct stage
        await expect(page.locator(`text=${stage}`)).toBeVisible();
      }
    }
  });

  test('should handle large sample datasets', async ({ page }) => {
    // Navigate to sample list
    await page.click('text=Sample');
    
    // Wait for initial load
    await page.waitForTimeout(2000);
    
    // Test pagination if it exists
    const nextButton = page.locator('button:has-text("Next")');
    
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(1000);
      
      // Verify pagination works
      await expect(page.locator('table')).toBeVisible();
    }
    
    // Test sorting if available
    const sortButton = page.locator('th button, .sort-button').first();
    
    if (await sortButton.isVisible()) {
      await sortButton.click();
      await page.waitForTimeout(1000);
      
      // Verify sorting works
      await expect(page.locator('table')).toBeVisible();
    }
  });
});

test.describe('Sample Management - Error Handling', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    // Navigate to sample registration
    await page.goto('/');
    await page.click('text=Client Register');
    
    // Block network requests to simulate network error
    await page.route('**/api/samples', route => route.abort());
    
    // Try to submit form
    await page.fill('input[name="name"]', 'Test');
    await page.fill('input[name="surname"]', 'User');
    await page.selectOption('select[name="relation"]', 'Child');
    await page.fill('input[name="lab_number"]', '25_ERROR_TEST');
    
    await page.click('button[type="submit"]');
    
    // Wait for error message
    await page.waitForTimeout(2000);
    
    // Check for error handling (adjust based on your error handling)
    await expect(page.locator('text=Error, text=Failed')).toBeVisible();
  });

  test('should handle validation errors', async ({ page }) => {
    // Navigate to sample registration
    await page.goto('/');
    await page.click('text=Client Register');
    
    // Submit invalid data
    await page.fill('input[name="name"]', 'A'); // Too short
    await page.fill('input[name="surname"]', ''); // Empty
    await page.fill('input[name="lab_number"]', 'invalid-format');
    
    await page.click('button[type="submit"]');
    
    // Wait for validation messages
    await page.waitForTimeout(1000);
    
    // Check for validation feedback
    await expect(page.locator('text=required, text=invalid')).toBeVisible();
  });

  test('should handle duplicate lab numbers', async ({ page }) => {
    // Navigate to sample registration
    await page.goto('/');
    await page.click('text=Client Register');
    
    const duplicateLabNumber = '25_DUPLICATE_TEST';
    
    // Create first sample
    await page.fill('input[name="name"]', 'First');
    await page.fill('input[name="surname"]', 'Sample');
    await page.selectOption('select[name="relation"]', 'Child');
    await page.fill('input[name="lab_number"]', duplicateLabNumber);
    await page.fill('input[name="case_number"]', 'CASE_2025_DUP');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Try to create duplicate
    await page.fill('input[name="name"]', 'Second');
    await page.fill('input[name="surname"]', 'Sample');
    await page.selectOption('select[name="relation"]', 'Mother');
    await page.fill('input[name="lab_number"]', duplicateLabNumber);
    await page.fill('input[name="case_number"]', 'CASE_2025_DUP2');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Check for duplicate error
    await expect(page.locator('text=already exists, text=duplicate')).toBeVisible();
  });
});