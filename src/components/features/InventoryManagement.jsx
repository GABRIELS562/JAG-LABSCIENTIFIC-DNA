import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  LinearProgress,
  useTheme,
  useMediaQuery,
  Badge,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Add,
  Edit,
  Visibility,
  Warning,
  Error as ErrorIcon,
  CheckCircle,
  Inventory,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  LocalShipping,
  Assessment,
  AttachMoney,
  Schedule,
  Science,
  Storage,
  Category,
  Business
} from '@mui/icons-material';
import api from '../../services/api';

const InventoryManagement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Inventory Items State
  const [inventoryItems, setInventoryItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [itemDialog, setItemDialog] = useState({ open: false, action: null, data: {} });
  
  // Low Stock & Expiry State
  const [lowStockItems, setLowStockItems] = useState([]);
  const [expiringItems, setExpiringItems] = useState([]);
  
  // Cost Analysis State
  const [testCosts, setTestCosts] = useState([]);
  const [costAnalysisDialog, setCostAnalysisDialog] = useState({ open: false, testType: null });

  useEffect(() => {
    loadData();
  }, [tabValue]);

  useEffect(() => {
    loadCategories();
    loadSuppliers();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (tabValue) {
        case 0: // Items Overview
          await loadInventoryItems();
          break;
        case 1: // Stock Monitoring
          await loadStockMonitoring();
          break;
        case 2: // Cost Analysis
          await loadCostAnalysis();
          break;
        case 3: // Suppliers
          // Already loaded in useEffect
          break;
      }
    } catch (error) {
      showSnackbar('Failed to load data: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryItems = async () => {
    try {
      const response = await api.fetchJson('/inventory/items');
      if (response.success) {
        setInventoryItems(response.data);
      } else {
        // Mock data for demonstration
        const mockItems = [
          {
            id: 1,
            item_code: 'PCR-001',
            name: 'Taq DNA Polymerase',
            category_name: 'PCR Reagents',
            supplier_name: 'BioTech Supplies',
            total_stock: 50,
            reorder_level: 20,
            stock_status: 'ok',
            unit_cost: 125.00,
            nearest_expiry: '2025-12-01',
            approved_lots: 2,
            expiring_soon: 0,
            expired_lots: 0
          },
          {
            id: 2,
            item_code: 'EXT-002',
            name: 'DNA Extraction Buffer',
            category_name: 'DNA Extraction',
            supplier_name: 'Lab Solutions Inc',
            total_stock: 15,
            reorder_level: 25,
            stock_status: 'low',
            unit_cost: 85.50,
            nearest_expiry: '2025-09-15',
            approved_lots: 1,
            expiring_soon: 1,
            expired_lots: 0
          },
          {
            id: 3,
            item_code: 'STD-003',
            name: 'DNA Standards Kit',
            category_name: 'Standards and Controls',
            supplier_name: 'Quality Controls Ltd',
            total_stock: 8,
            reorder_level: 10,
            stock_status: 'warning',
            unit_cost: 250.00,
            nearest_expiry: '2025-10-30',
            approved_lots: 1,
            expiring_soon: 0,
            expired_lots: 0
          }
        ];
        setInventoryItems(mockItems);
      }
    } catch (error) {
      console.error('Failed to load inventory items:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.fetchJson('/inventory/categories');
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const response = await api.fetchJson('/inventory/suppliers');
      if (response.success) {
        setSuppliers(response.data);
      } else {
        // Mock data for demonstration
        const mockSuppliers = [
          {
            id: 1,
            name: 'BioTech Supplies',
            contact_person: 'John Smith',
            email: 'john@biotech.com',
            phone: '+1-555-0123',
            status: 'active',
            rating: 4.5,
            item_count: 15,
            active_lots: 8
          },
          {
            id: 2,
            name: 'Lab Solutions Inc',
            contact_person: 'Sarah Johnson',
            email: 'sarah@labsolutions.com',
            phone: '+1-555-0456',
            status: 'active',
            rating: 4.2,
            item_count: 12,
            active_lots: 6
          },
          {
            id: 3,
            name: 'Quality Controls Ltd',
            contact_person: 'Mike Davis',
            email: 'mike@qualitycontrols.com',
            phone: '+1-555-0789',
            status: 'active',
            rating: 4.8,
            item_count: 8,
            active_lots: 4
          }
        ];
        setSuppliers(mockSuppliers);
      }
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }
  };

  const loadStockMonitoring = async () => {
    try {
      // Load low stock items
      const lowStockResponse = await api.fetchJson('/inventory/reports/low-stock');
      if (lowStockResponse.success) {
        setLowStockItems(lowStockResponse.data);
      } else {
        // Mock low stock data
        setLowStockItems([
          {
            id: 2,
            item_code: 'EXT-002',
            name: 'DNA Extraction Buffer',
            current_stock: 15,
            reorder_level: 25,
            supplier_name: 'Lab Solutions Inc',
            suggested_order_value: 4275.00
          },
          {
            id: 4,
            item_code: 'TIP-001',
            name: 'Pipette Tips 200µL',
            current_stock: 250,
            reorder_level: 500,
            supplier_name: 'Lab Supplies Co',
            suggested_order_value: 150.00
          }
        ]);
      }

      // Load expiring items
      const expiryResponse = await api.fetchJson('/inventory/reports/expiry?days_ahead=60');
      if (expiryResponse.success) {
        setExpiringItems(expiryResponse.data);
      } else {
        // Mock expiry data
        setExpiringItems([
          {
            item_name: 'DNA Extraction Buffer',
            lot_number: 'LOT-2024-158',
            quantity_available: 25,
            expiry_date: '2025-09-15',
            urgency: 'expires_this_month',
            days_to_expiry: 26
          },
          {
            item_name: 'PCR Master Mix',
            lot_number: 'LOT-2024-203',
            quantity_available: 12,
            expiry_date: '2025-10-05',
            urgency: 'expires_later',
            days_to_expiry: 46
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to load stock monitoring data:', error);
    }
  };

  const loadCostAnalysis = async () => {
    // Mock cost analysis data
    const mockCostData = [
      {
        test_name: 'Paternity Test',
        base_price: 299.00,
        total_reagent_cost: 45.30,
        profit_margin: 253.70,
        profit_margin_percent: 84.8,
        reagent_count: 8,
        min_tests_possible: 125
      },
      {
        test_name: 'Sibling Test',
        base_price: 399.00,
        total_reagent_cost: 52.80,
        profit_margin: 346.20,
        profit_margin_percent: 86.8,
        reagent_count: 10,
        min_tests_possible: 95
      }
    ];
    setTestCosts(mockCostData);
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const getStockStatusChip = (status) => {
    const statusConfig = {
      ok: { color: 'success', label: 'Good Stock', icon: <CheckCircle /> },
      warning: { color: 'warning', label: 'Low Stock', icon: <Warning /> },
      low: { color: 'error', label: 'Critical', icon: <ErrorIcon /> }
    };

    const config = statusConfig[status] || statusConfig.ok;
    return (
      <Chip
        icon={config.icon}
        label={config.label}
        color={config.color}
        size="small"
        variant="outlined"
      />
    );
  };

  const getUrgencyChip = (urgency) => {
    const urgencyConfig = {
      expired: { color: 'error', label: 'Expired' },
      expires_this_week: { color: 'error', label: 'This Week' },
      expires_this_month: { color: 'warning', label: 'This Month' },
      expires_later: { color: 'info', label: 'Later' }
    };

    const config = urgencyConfig[urgency] || urgencyConfig.expires_later;
    return (
      <Chip
        label={config.label}
        color={config.color}
        size="small"
        variant="filled"
      />
    );
  };

  const renderInventoryOverview = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Inventory Items</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<Add />}
            sx={{ mr: 1 }}
            onClick={() => setItemDialog({ open: true, action: 'receive', data: {} })}
          >
            Receive Stock
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setItemDialog({ open: true, action: 'create', data: {} })}
          >
            New Item
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: theme.palette.primary.main, mr: 2 }}>
                  <Inventory />
                </Avatar>
                <Box>
                  <Typography variant="h4">{inventoryItems.length}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Items
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: theme.palette.error.main, mr: 2 }}>
                  <TrendingDown />
                </Avatar>
                <Box>
                  <Typography variant="h4">
                    {inventoryItems.filter(item => item.stock_status === 'low').length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Low Stock
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: theme.palette.warning.main, mr: 2 }}>
                  <Schedule />
                </Avatar>
                <Box>
                  <Typography variant="h4">
                    {inventoryItems.reduce((sum, item) => sum + item.expiring_soon, 0)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Expiring Soon
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: theme.palette.success.main, mr: 2 }}>
                  <AttachMoney />
                </Avatar>
                <Box>
                  <Typography variant="h4">
                    ${inventoryItems.reduce((sum, item) => sum + (item.total_stock * item.unit_cost), 0).toFixed(0)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Value
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Item Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Stock Status</TableCell>
              <TableCell align="right">Current Stock</TableCell>
              <TableCell align="right">Reorder Level</TableCell>
              <TableCell align="right">Unit Cost</TableCell>
              <TableCell>Supplier</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inventoryItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.item_code}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.category_name}</TableCell>
                <TableCell>{getStockStatusChip(item.stock_status)}</TableCell>
                <TableCell align="right">
                  <Badge
                    badgeContent={item.expiring_soon > 0 ? item.expiring_soon : 0}
                    color="warning"
                    invisible={item.expiring_soon === 0}
                  >
                    {item.total_stock}
                  </Badge>
                </TableCell>
                <TableCell align="right">{item.reorder_level}</TableCell>
                <TableCell align="right">${item.unit_cost}</TableCell>
                <TableCell>{item.supplier_name}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => setItemDialog({ open: true, action: 'view', data: item })}>
                    <Visibility />
                  </IconButton>
                  <IconButton size="small" onClick={() => setItemDialog({ open: true, action: 'edit', data: item })}>
                    <Edit />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderStockMonitoring = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Box display="flex" alignItems="center">
                <TrendingDown color="error" sx={{ mr: 1 }} />
                Low Stock Items
              </Box>
            </Typography>
            <List>
              {lowStockItems.map((item, index) => (
                <React.Fragment key={item.id}>
                  <ListItem>
                    <ListItemIcon>
                      <Warning color="error" />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${item.item_code} - ${item.name}`}
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            Current: {item.current_stock} | Reorder at: {item.reorder_level}
                          </Typography>
                          <Typography variant="body2" color="primary">
                            Suggested order value: ${item.suggested_order_value}
                          </Typography>
                        </Box>
                      }
                    />
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<ShoppingCart />}
                    >
                      Reorder
                    </Button>
                  </ListItem>
                  {index < lowStockItems.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Box display="flex" alignItems="center">
                <Schedule color="warning" sx={{ mr: 1 }} />
                Expiring Items
              </Box>
            </Typography>
            <List>
              {expiringItems.map((item, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemIcon>
                      <Schedule color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.item_name}
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            Lot: {item.lot_number} | Qty: {item.quantity_available}
                          </Typography>
                          <Typography variant="body2">
                            Expires: {new Date(item.expiry_date).toLocaleDateString()} ({item.days_to_expiry} days)
                          </Typography>
                          <Box mt={1}>
                            {getUrgencyChip(item.urgency)}
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < expiringItems.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderCostAnalysis = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Cost Analysis per Test Type</Typography>
      
      <Grid container spacing={3}>
        {testCosts.map((test, index) => (
          <Grid item xs={12} md={6} lg={4} key={index}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>{test.test_name}</Typography>
                
                <Box mb={2}>
                  <Typography variant="body2" color="textSecondary">
                    Base Price: ${test.base_price}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Reagent Cost: ${test.total_reagent_cost}
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    Profit: ${test.profit_margin} ({test.profit_margin_percent.toFixed(1)}%)
                  </Typography>
                </Box>

                <Box mb={2}>
                  <Typography variant="body2">
                    Reagents: {test.reagent_count} items
                  </Typography>
                  <Typography variant="body2">
                    Tests possible: {test.min_tests_possible}
                  </Typography>
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={test.profit_margin_percent}
                  sx={{ mb: 1 }}
                />
                
                <Button
                  size="small"
                  variant="outlined"
                  fullWidth
                  startIcon={<Assessment />}
                  onClick={() => setCostAnalysisDialog({ open: true, testType: test })}
                >
                  Detailed Analysis
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderSuppliersTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Suppliers</Typography>
        <Button variant="contained" startIcon={<Add />}>
          New Supplier
        </Button>
      </Box>

      <Grid container spacing={3}>
        {suppliers.map((supplier) => (
          <Grid item xs={12} md={6} lg={4} key={supplier.id}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Avatar sx={{ bgcolor: theme.palette.primary.main, mr: 2 }}>
                    <Business />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{supplier.name}</Typography>
                    <Chip 
                      label={supplier.status.toUpperCase()} 
                      color={supplier.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                </Box>

                <Typography variant="body2" gutterBottom>
                  Contact: {supplier.contact_person}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  Email: {supplier.email}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  Phone: {supplier.phone}
                </Typography>

                <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                  <Box>
                    <Typography variant="body2">
                      Items: {supplier.item_count}
                    </Typography>
                    <Typography variant="body2">
                      Active Lots: {supplier.active_lots}
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="body2">
                      Rating: {supplier.rating}/5
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(supplier.rating / 5) * 100}
                      sx={{ width: 60, mt: 0.5 }}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Inventory Management
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            indicatorColor="primary"
            textColor="primary"
            variant={isMobile ? "scrollable" : "standard"}
            scrollButtons="auto"
          >
            <Tab icon={<Inventory />} label="Items Overview" />
            <Tab icon={<Warning />} label="Stock Monitoring" />
            <Tab icon={<Assessment />} label="Cost Analysis" />
            <Tab icon={<Business />} label="Suppliers" />
          </Tabs>
        </CardContent>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Box mt={2}>
        {tabValue === 0 && renderInventoryOverview()}
        {tabValue === 1 && renderStockMonitoring()}
        {tabValue === 2 && renderCostAnalysis()}
        {tabValue === 3 && renderSuppliersTab()}
      </Box>

      {/* Cost Analysis Dialog */}
      <Dialog
        open={costAnalysisDialog.open}
        onClose={() => setCostAnalysisDialog({ open: false, testType: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Detailed Cost Analysis: {costAnalysisDialog.testType?.test_name}
        </DialogTitle>
        <DialogContent>
          {costAnalysisDialog.testType && (
            <Box>
              <Typography variant="h6" gutterBottom>Cost Breakdown</Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                This detailed analysis shows the cost composition for each test.
              </Alert>
              {/* Add detailed cost breakdown table here */}
              <Typography>Detailed reagent-by-reagent cost analysis would go here.</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCostAnalysisDialog({ open: false, testType: null })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default InventoryManagement;