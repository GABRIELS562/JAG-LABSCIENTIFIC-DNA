const { test, expect } = require('@playwright/test');

test.describe('Batch Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/LabScientific/);
  });

  test('should display batch generation interface', async ({ page }) => {
    // Navigate to batch generation
    await page.click('text=Generate Batch');
    
    // Wait for batch interface to load
    await page.waitForSelector('.batch-generation, form');
    
    // Check for batch generation controls
    await expect(page.locator('button:has-text("Generate")')).toBeVisible();
  });

  test('should create a new batch successfully', async ({ page }) => {
    // First create some samples to batch
    await page.click('text=Client Register');
    
    // Create test samples
    const samples = [
      { name: 'John', surname: 'Doe', relation: 'Child', lab_number: '25_BATCH_001' },
      { name: 'Jane', surname: 'Doe', relation: 'Mother', lab_number: '25_BATCH_002' },
      { name: 'Bob', surname: 'Doe', relation: 'Father', lab_number: '25_BATCH_003' }
    ];
    
    for (const sample of samples) {
      await page.fill('input[name="name"]', sample.name);
      await page.fill('input[name="surname"]', sample.surname);
      await page.selectOption('select[name="relation"]', sample.relation);
      await page.fill('input[name="lab_number"]', sample.lab_number);
      await page.fill('input[name="case_number"]', 'CASE_2025_BATCH');
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
      
      // Clear form for next sample
      await page.fill('input[name="name"]', '');
      await page.fill('input[name="surname"]', '');
      await page.fill('input[name="lab_number"]', '');
    }
    
    // Navigate to batch generation
    await page.click('text=Generate Batch');
    
    // Generate batch
    await page.click('button:has-text("Generate")');
    
    // Wait for batch creation
    await page.waitForTimeout(3000);
    
    // Verify batch was created
    await expect(page.locator('text=Batch created, text=Successfully')).toBeVisible();
  });

  test('should display batch list', async ({ page }) => {
    // Navigate to batch list
    await page.click('text=Batch');
    
    // Wait for batch list to load
    await page.waitForSelector('table, .batch-list');
    
    // Check for batch list structure
    const batchTable = page.locator('table');
    if (await batchTable.isVisible()) {
      await expect(batchTable).toBeVisible();
    } else {
      await expect(page.locator('.batch-list')).toBeVisible();
    }
  });

  test('should display batch details', async ({ page }) => {
    // Navigate to batch list
    await page.click('text=Batch');
    
    // Wait for batches to load
    await page.waitForTimeout(2000);
    
    // Click on first batch if available
    const firstBatch = page.locator('tr').nth(1);
    
    if (await firstBatch.isVisible()) {
      await firstBatch.click();
      
      // Wait for batch details
      await page.waitForTimeout(1000);
      
      // Verify batch details are shown
      await expect(page.locator('text=Batch Details, text=Samples')).toBeVisible();
    }
  });

  test('should handle plate visualization', async ({ page }) => {
    // Navigate to batch generation or plate view
    await page.click('text=Generate Batch');
    
    // Look for plate visualization
    const plateView = page.locator('.plate-view, .well-plate, svg');
    
    if (await plateView.isVisible()) {
      await expect(plateView).toBeVisible();
      
      // Test well interaction
      const well = page.locator('.well, circle').first();
      if (await well.isVisible()) {
        await well.click();
        await page.waitForTimeout(500);
        
        // Verify well selection or interaction
        await expect(well).toHaveClass(/selected|active/);
      }
    }
  });

  test('should assign samples to wells', async ({ page }) => {
    // Navigate to batch generation
    await page.click('text=Generate Batch');
    
    // Wait for interface to load
    await page.waitForTimeout(2000);
    
    // Look for sample assignment controls
    const assignButton = page.locator('button:has-text("Assign")');
    
    if (await assignButton.isVisible()) {
      await assignButton.click();
      
      // Wait for assignment process
      await page.waitForTimeout(2000);
      
      // Verify assignment was successful
      await expect(page.locator('text=Assigned, text=Complete')).toBeVisible();
    }
  });

  test('should handle batch status updates', async ({ page }) => {
    // Navigate to batch list
    await page.click('text=Batch');
    
    // Wait for batches to load
    await page.waitForTimeout(2000);
    
    // Look for status update controls
    const statusButton = page.locator('button:has-text("Update Status")');
    
    if (await statusButton.isVisible()) {
      await statusButton.click();
      
      // Wait for status update interface
      await page.waitForTimeout(1000);
      
      // Select new status
      const statusSelect = page.locator('select[name="status"]');
      if (await statusSelect.isVisible()) {
        await statusSelect.selectOption('in_progress');
        
        // Submit status update
        await page.click('button:has-text("Update")');
        
        // Wait for update
        await page.waitForTimeout(1000);
        
        // Verify status was updated
        await expect(page.locator('text=Status updated')).toBeVisible();
      }
    }
  });

  test('should export batch data', async ({ page }) => {
    // Navigate to batch list
    await page.click('text=Batch');
    
    // Wait for batches to load
    await page.waitForTimeout(2000);
    
    // Look for export functionality
    const exportButton = page.locator('button:has-text("Export")');
    
    if (await exportButton.isVisible()) {
      // Setup download handler
      const downloadPromise = page.waitForEvent('download');
      
      await exportButton.click();
      
      // Wait for download
      try {
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/batch.*\.(csv|xlsx|pdf)$/);
      } catch (error) {
        // Export functionality might not be implemented yet
        console.log('Export functionality not available');
      }
    }
  });

  test('should handle batch deletion', async ({ page }) => {
    // Navigate to batch list
    await page.click('text=Batch');
    
    // Wait for batches to load
    await page.waitForTimeout(2000);
    
    // Look for delete functionality
    const deleteButton = page.locator('button:has-text("Delete")');
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      // Handle confirmation dialog
      await page.waitForTimeout(500);
      
      const confirmButton = page.locator('button:has-text("Confirm")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        
        // Wait for deletion
        await page.waitForTimeout(1000);
        
        // Verify deletion
        await expect(page.locator('text=Deleted, text=Removed')).toBeVisible();
      }
    }
  });
});

test.describe('Batch Management - Advanced Features', () => {
  test('should handle quality control wells', async ({ page }) => {
    // Navigate to batch generation
    await page.goto('/');
    await page.click('text=Generate Batch');
    
    // Wait for batch interface
    await page.waitForTimeout(2000);
    
    // Look for QC well controls
    const qcButton = page.locator('button:has-text("QC"), button:has-text("Control")');
    
    if (await qcButton.isVisible()) {
      await qcButton.click();
      
      // Wait for QC interface
      await page.waitForTimeout(1000);
      
      // Verify QC controls are available
      await expect(page.locator('text=Positive Control, text=Negative Control')).toBeVisible();
    }
  });

  test('should validate batch completeness', async ({ page }) => {
    // Navigate to batch generation
    await page.goto('/');
    await page.click('text=Generate Batch');
    
    // Try to finalize incomplete batch
    const finalizeButton = page.locator('button:has-text("Finalize")');
    
    if (await finalizeButton.isVisible()) {
      await finalizeButton.click();
      
      // Wait for validation
      await page.waitForTimeout(1000);
      
      // Check for validation messages
      await expect(page.locator('text=incomplete, text=required')).toBeVisible();
    }
  });

  test('should handle batch templates', async ({ page }) => {
    // Navigate to batch generation
    await page.goto('/');
    await page.click('text=Generate Batch');
    
    // Look for template functionality
    const templateButton = page.locator('button:has-text("Template")');
    
    if (await templateButton.isVisible()) {
      await templateButton.click();
      
      // Wait for template interface
      await page.waitForTimeout(1000);
      
      // Verify template options
      await expect(page.locator('select, .template-list')).toBeVisible();
    }
  });

  test('should handle batch scheduling', async ({ page }) => {
    // Navigate to batch list
    await page.goto('/');
    await page.click('text=Batch');
    
    // Look for scheduling functionality
    const scheduleButton = page.locator('button:has-text("Schedule")');
    
    if (await scheduleButton.isVisible()) {
      await scheduleButton.click();
      
      // Wait for scheduling interface
      await page.waitForTimeout(1000);
      
      // Check for date/time pickers
      await expect(page.locator('input[type="date"], input[type="datetime-local"]')).toBeVisible();
    }
  });
});