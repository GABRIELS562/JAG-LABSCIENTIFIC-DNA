const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const { ResponseHandler } = require('../utils/responseHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

// Get database connection
const dbPath = path.join(__dirname, '..', 'database', 'ashley_lims.db');
const db = new Database(dbPath);

// Inventory Items endpoints

// Get all inventory items with stock levels
router.get('/items', async (req, res) => {
  try {
    const { category, status = 'all', search, low_stock = 'false' } = req.query;
    
    let whereClause = '';
    const params = [];
    const conditions = [];

    if (category && category !== 'all') {
      conditions.push('ii.category_id = ?');
      params.push(category);
    }

    if (search) {
      conditions.push('(ii.name LIKE ? OR ii.item_code LIKE ? OR ii.description LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    const query = `
      SELECT 
        ii.*,
        ic.name as category_name,
        s.name as supplier_name,
        COALESCE(SUM(il.quantity_available), 0) as total_stock,
        COUNT(CASE WHEN il.quality_status = 'approved' THEN 1 END) as approved_lots,
        COUNT(CASE WHEN il.expiry_date <= date('now', '+30 days') AND il.expiry_date > date('now') THEN 1 END) as expiring_soon,
        COUNT(CASE WHEN il.expiry_date <= date('now') THEN 1 END) as expired_lots,
        MIN(il.expiry_date) as nearest_expiry,
        CASE 
          WHEN COALESCE(SUM(il.quantity_available), 0) <= ii.reorder_level THEN 'low'
          WHEN COALESCE(SUM(il.quantity_available), 0) <= ii.reorder_level * 1.5 THEN 'warning'
          ELSE 'ok'
        END as stock_status
      FROM inventory_items ii
      LEFT JOIN inventory_categories ic ON ii.category_id = ic.id
      LEFT JOIN suppliers s ON ii.supplier_id = s.id
      LEFT JOIN inventory_lots il ON ii.id = il.item_id AND il.quality_status != 'rejected'
      ${whereClause}
      GROUP BY ii.id
      ${low_stock === 'true' ? 'HAVING total_stock <= ii.reorder_level' : ''}
      ORDER BY ii.name
    `;

    const items = db.prepare(query).all(...params);
    ResponseHandler.success(res, items);
  } catch (error) {
    logger.error('Error fetching inventory items', { error: error.message });
    ResponseHandler.error(res, 'Failed to fetch inventory items', error);
  }
});

// Get single inventory item with detailed lot information
router.get('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get item details
    const itemQuery = `
      SELECT 
        ii.*,
        ic.name as category_name,
        s.name as supplier_name,
        s.contact_person as supplier_contact,
        s.email as supplier_email
      FROM inventory_items ii
      LEFT JOIN inventory_categories ic ON ii.category_id = ic.id
      LEFT JOIN suppliers s ON ii.supplier_id = s.id
      WHERE ii.id = ?
    `;
    
    const item = db.prepare(itemQuery).get(id);
    
    if (!item) {
      return ResponseHandler.notFound(res, 'Inventory item not found');
    }

    // Get lots for this item
    const lotsQuery = `
      SELECT 
        il.*,
        CASE 
          WHEN il.expiry_date <= date('now') THEN 'expired'
          WHEN il.expiry_date <= date('now', '+30 days') THEN 'expiring_soon'
          ELSE 'ok'
        END as expiry_status
      FROM inventory_lots il
      WHERE il.item_id = ?
      ORDER BY il.expiry_date ASC, il.received_date ASC
    `;
    
    const lots = db.prepare(lotsQuery).all(id);

    // Get recent transactions
    const transactionsQuery = `
      SELECT 
        it.*,
        il.lot_number
      FROM inventory_transactions it
      JOIN inventory_lots il ON it.lot_id = il.id
      WHERE il.item_id = ?
      ORDER BY it.transaction_date DESC
      LIMIT 10
    `;
    
    const recentTransactions = db.prepare(transactionsQuery).all(id);

    ResponseHandler.success(res, {
      item,
      lots,
      recentTransactions,
      totalStock: lots.reduce((sum, lot) => sum + lot.quantity_available, 0),
      approvedStock: lots.filter(lot => lot.quality_status === 'approved').reduce((sum, lot) => sum + lot.quantity_available, 0)
    });
  } catch (error) {
    logger.error('Error fetching inventory item', { error: error.message, id: req.params.id });
    ResponseHandler.error(res, 'Failed to fetch inventory item', error);
  }
});

// Create new inventory item
router.post('/items', async (req, res) => {
  try {
    const {
      item_code, name, description, category_id, supplier_id, unit_of_measure,
      unit_cost, currency, reorder_level, maximum_stock_level, storage_location,
      storage_conditions, safety_data_sheet_path, hazard_class, shelf_life_days,
      quality_control_required
    } = req.body;

    if (!item_code || !name || !category_id) {
      return ResponseHandler.error(res, 'Missing required fields: item_code, name, category_id', null, 400);
    }

    const query = `
      INSERT INTO inventory_items (
        item_code, name, description, category_id, supplier_id, unit_of_measure,
        unit_cost, currency, reorder_level, maximum_stock_level, storage_location,
        storage_conditions, safety_data_sheet_path, hazard_class, shelf_life_days,
        quality_control_required
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = db.prepare(query).run(
      item_code, name, description, category_id, supplier_id, unit_of_measure,
      unit_cost, currency || 'USD', reorder_level || 10, maximum_stock_level,
      storage_location, storage_conditions, safety_data_sheet_path, hazard_class,
      shelf_life_days, quality_control_required || false
    );

    const newItem = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(result.lastInsertRowid);

    logger.info('Inventory item created', { itemCode: item_code, id: result.lastInsertRowid });
    ResponseHandler.success(res, newItem, 'Inventory item created successfully', 201);
  } catch (error) {
    logger.error('Error creating inventory item', { error: error.message });
    ResponseHandler.error(res, 'Failed to create inventory item', error);
  }
});

// Inventory Lots endpoints

// Receive new inventory lot
router.post('/lots', async (req, res) => {
  try {
    const {
      item_id, lot_number, supplier_lot_number, quantity_received,
      unit_cost, received_date, expiry_date, manufactured_date,
      received_by, certificate_analysis_path, notes
    } = req.body;

    if (!item_id || !lot_number || !quantity_received || !received_by) {
      return ResponseHandler.error(res, 'Missing required fields', null, 400);
    }

    // Check if lot already exists for this item
    const existingLot = db.prepare('SELECT id FROM inventory_lots WHERE item_id = ? AND lot_number = ?').get(item_id, lot_number);
    if (existingLot) {
      return ResponseHandler.error(res, 'Lot number already exists for this item', null, 400);
    }

    const transaction = db.transaction(() => {
      // Create lot record
      const lotQuery = `
        INSERT INTO inventory_lots (
          item_id, lot_number, supplier_lot_number, quantity_received,
          quantity_available, unit_cost, received_date, expiry_date,
          manufactured_date, received_by, certificate_analysis_path, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const lotResult = db.prepare(lotQuery).run(
        item_id, lot_number, supplier_lot_number, quantity_received,
        quantity_received, unit_cost, received_date, expiry_date,
        manufactured_date, received_by, certificate_analysis_path, notes
      );

      // Create receipt transaction
      const transactionQuery = `
        INSERT INTO inventory_transactions (
          lot_id, transaction_type, quantity, performed_by, cost_per_unit, total_cost
        ) VALUES (?, 'receipt', ?, ?, ?, ?)
      `;

      db.prepare(transactionQuery).run(
        lotResult.lastInsertRowid, quantity_received, received_by,
        unit_cost, (unit_cost || 0) * quantity_received
      );

      return lotResult.lastInsertRowid;
    });

    const lotId = transaction();
    const newLot = db.prepare('SELECT * FROM inventory_lots WHERE id = ?').get(lotId);

    logger.info('Inventory lot received', { itemId: item_id, lotNumber: lot_number, lotId });
    ResponseHandler.success(res, newLot, 'Inventory lot received successfully', 201);
  } catch (error) {
    logger.error('Error receiving inventory lot', { error: error.message });
    ResponseHandler.error(res, 'Failed to receive inventory lot', error);
  }
});

// Update lot quality status
router.patch('/lots/:id/quality-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { quality_status, notes } = req.body;

    if (!quality_status || !['approved', 'quarantine', 'rejected', 'expired'].includes(quality_status)) {
      return ResponseHandler.error(res, 'Invalid quality status', null, 400);
    }

    const query = `
      UPDATE inventory_lots 
      SET quality_status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const result = db.prepare(query).run(quality_status, notes, id);

    if (result.changes === 0) {
      return ResponseHandler.notFound(res, 'Inventory lot not found');
    }

    const updatedLot = db.prepare('SELECT * FROM inventory_lots WHERE id = ?').get(id);

    logger.info('Lot quality status updated', { lotId: id, qualityStatus: quality_status });
    ResponseHandler.success(res, updatedLot, 'Quality status updated successfully');
  } catch (error) {
    logger.error('Error updating lot quality status', { error: error.message });
    ResponseHandler.error(res, 'Failed to update quality status', error);
  }
});

// Inventory Transactions endpoints

// Record inventory usage
router.post('/transactions/usage', async (req, res) => {
  try {
    const {
      lot_id, quantity, reference_id, reference_type, performed_by, reason
    } = req.body;

    if (!lot_id || !quantity || !performed_by) {
      return ResponseHandler.error(res, 'Missing required fields', null, 400);
    }

    const transaction = db.transaction(() => {
      // Check available quantity
      const lot = db.prepare('SELECT * FROM inventory_lots WHERE id = ?').get(lot_id);
      if (!lot) {
        throw new Error('Lot not found');
      }

      if (lot.quantity_available < quantity) {
        throw new Error('Insufficient stock available');
      }

      // Update lot quantity
      db.prepare('UPDATE inventory_lots SET quantity_available = quantity_available - ? WHERE id = ?')
        .run(quantity, lot_id);

      // Create transaction record
      const transactionQuery = `
        INSERT INTO inventory_transactions (
          lot_id, transaction_type, quantity, reference_id, reference_type,
          performed_by, reason, cost_per_unit, total_cost
        ) VALUES (?, 'usage', ?, ?, ?, ?, ?, ?, ?)
      `;

      const result = db.prepare(transactionQuery).run(
        lot_id, -quantity, reference_id, reference_type, performed_by, reason,
        lot.unit_cost, (lot.unit_cost || 0) * quantity
      );

      return result.lastInsertRowid;
    });

    const transactionId = transaction();
    const newTransaction = db.prepare(`
      SELECT it.*, il.lot_number, ii.name as item_name
      FROM inventory_transactions it
      JOIN inventory_lots il ON it.lot_id = il.id
      JOIN inventory_items ii ON il.item_id = ii.id
      WHERE it.id = ?
    `).get(transactionId);

    logger.info('Inventory usage recorded', { lotId: lot_id, quantity, transactionId });
    ResponseHandler.success(res, newTransaction, 'Usage recorded successfully', 201);
  } catch (error) {
    logger.error('Error recording inventory usage', { error: error.message });
    ResponseHandler.error(res, 'Failed to record inventory usage', error);
  }
});

// Get inventory reports and analytics

// Low stock report
router.get('/reports/low-stock', async (req, res) => {
  try {
    const query = `
      SELECT 
        ii.id, ii.item_code, ii.name, ii.reorder_level,
        COALESCE(SUM(il.quantity_available), 0) as current_stock,
        ic.name as category_name,
        s.name as supplier_name,
        s.email as supplier_email,
        ii.unit_cost,
        (ii.reorder_level * 2 * COALESCE(ii.unit_cost, 0)) as suggested_order_value
      FROM inventory_items ii
      LEFT JOIN inventory_lots il ON ii.id = il.item_id AND il.quality_status = 'approved'
      LEFT JOIN inventory_categories ic ON ii.category_id = ic.id
      LEFT JOIN suppliers s ON ii.supplier_id = s.id
      GROUP BY ii.id
      HAVING current_stock <= ii.reorder_level
      ORDER BY (current_stock / NULLIF(ii.reorder_level, 0)) ASC, ii.name
    `;

    const lowStockItems = db.prepare(query).all();
    ResponseHandler.success(res, lowStockItems);
  } catch (error) {
    logger.error('Error generating low stock report', { error: error.message });
    ResponseHandler.error(res, 'Failed to generate low stock report', error);
  }
});

// Expiry report
router.get('/reports/expiry', async (req, res) => {
  try {
    const { days_ahead = 30 } = req.query;
    
    const query = `
      SELECT 
        ii.id as item_id, ii.item_code, ii.name as item_name,
        il.id as lot_id, il.lot_number, il.quantity_available,
        il.expiry_date, il.quality_status,
        ic.name as category_name,
        CASE 
          WHEN il.expiry_date <= date('now') THEN 'expired'
          WHEN il.expiry_date <= date('now', '+7 days') THEN 'expires_this_week'
          WHEN il.expiry_date <= date('now', '+30 days') THEN 'expires_this_month'
          ELSE 'expires_later'
        END as urgency,
        julianday(il.expiry_date) - julianday('now') as days_to_expiry
      FROM inventory_lots il
      JOIN inventory_items ii ON il.item_id = ii.id
      JOIN inventory_categories ic ON ii.category_id = ic.id
      WHERE il.quantity_available > 0
        AND il.quality_status IN ('approved', 'quarantine')
        AND il.expiry_date <= date('now', '+' || ? || ' days')
      ORDER BY il.expiry_date ASC, ii.name
    `;

    const expiringItems = db.prepare(query).all(days_ahead);
    ResponseHandler.success(res, expiringItems);
  } catch (error) {
    logger.error('Error generating expiry report', { error: error.message });
    ResponseHandler.error(res, 'Failed to generate expiry report', error);
  }
});

// Cost per test calculation
router.get('/cost-analysis/test/:testTypeId', async (req, res) => {
  try {
    const { testTypeId } = req.params;
    
    // Get test type and its reagent usage
    const testQuery = `
      SELECT 
        tt.*,
        COUNT(tru.id) as reagent_count
      FROM test_types tt
      LEFT JOIN test_reagent_usage tru ON tt.id = tru.test_type_id
      WHERE tt.id = ?
      GROUP BY tt.id
    `;
    
    const testType = db.prepare(testQuery).get(testTypeId);
    
    if (!testType) {
      return ResponseHandler.notFound(res, 'Test type not found');
    }

    // Get detailed cost breakdown
    const costQuery = `
      SELECT 
        ii.id, ii.item_code, ii.name, ii.unit_of_measure,
        tru.quantity_per_test, tru.critical,
        AVG(il.unit_cost) as avg_unit_cost,
        (tru.quantity_per_test * AVG(il.unit_cost)) as cost_per_test,
        SUM(il.quantity_available) as available_stock,
        FLOOR(SUM(il.quantity_available) / tru.quantity_per_test) as tests_possible
      FROM test_reagent_usage tru
      JOIN inventory_items ii ON tru.item_id = ii.id
      LEFT JOIN inventory_lots il ON ii.id = il.item_id AND il.quality_status = 'approved'
      WHERE tru.test_type_id = ?
      GROUP BY ii.id, tru.quantity_per_test, tru.critical
      ORDER BY tru.critical DESC, cost_per_test DESC
    `;
    
    const reagentCosts = db.prepare(costQuery).all(testTypeId);
    
    const totalReagentCost = reagentCosts.reduce((sum, reagent) => sum + (reagent.cost_per_test || 0), 0);
    const minTestsPossible = Math.min(...reagentCosts.filter(r => r.critical).map(r => r.tests_possible || 0));

    ResponseHandler.success(res, {
      testType,
      reagentCosts,
      summary: {
        totalReagentCost,
        basePrice: testType.base_price,
        profitMargin: testType.base_price - totalReagentCost,
        profitMarginPercent: testType.base_price > 0 ? ((testType.base_price - totalReagentCost) / testType.base_price * 100) : 0,
        minTestsPossible,
        reagentCount: reagentCosts.length
      }
    });
  } catch (error) {
    logger.error('Error calculating test cost', { error: error.message });
    ResponseHandler.error(res, 'Failed to calculate test cost', error);
  }
});

// Inventory categories and suppliers

// Get inventory categories
router.get('/categories', async (req, res) => {
  try {
    const query = `
      SELECT 
        ic.*,
        COUNT(ii.id) as item_count,
        pc.name as parent_name
      FROM inventory_categories ic
      LEFT JOIN inventory_items ii ON ic.id = ii.category_id
      LEFT JOIN inventory_categories pc ON ic.parent_id = pc.id
      GROUP BY ic.id
      ORDER BY ic.name
    `;

    const categories = db.prepare(query).all();
    ResponseHandler.success(res, categories);
  } catch (error) {
    logger.error('Error fetching inventory categories', { error: error.message });
    ResponseHandler.error(res, 'Failed to fetch inventory categories', error);
  }
});

// Get suppliers
router.get('/suppliers', async (req, res) => {
  try {
    const { status = 'active' } = req.query;
    
    let whereClause = '';
    if (status !== 'all') {
      whereClause = 'WHERE s.status = ?';
    }

    const query = `
      SELECT 
        s.*,
        COUNT(ii.id) as item_count,
        COUNT(CASE WHEN il.quality_status = 'approved' THEN 1 END) as active_lots
      FROM suppliers s
      LEFT JOIN inventory_items ii ON s.id = ii.supplier_id
      LEFT JOIN inventory_lots il ON ii.id = il.item_id
      ${whereClause}
      GROUP BY s.id
      ORDER BY s.name
    `;

    const params = status !== 'all' ? [status] : [];
    const suppliers = db.prepare(query).all(...params);
    
    ResponseHandler.success(res, suppliers);
  } catch (error) {
    logger.error('Error fetching suppliers', { error: error.message });
    ResponseHandler.error(res, 'Failed to fetch suppliers', error);
  }
});

module.exports = router;