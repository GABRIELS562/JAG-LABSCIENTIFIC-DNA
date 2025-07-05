import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  PersonAdd as PersonAddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  Lock as LockIcon,
  Unlock as UnlockIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Security as ShieldIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  BugReport as BugReportIcon
} from '@mui/icons-material';
import { useThemeContext } from '../../contexts/ThemeContext';

const AdminPanel = () => {
  const { isDarkMode } = useThemeContext();
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [systemStats, setSystemStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  
  // User Management States
  const [userDialog, setUserDialog] = useState({ open: false, mode: 'create', user: null });
  const [selectedUser, setSelectedUser] = useState(null);
  
  // System Settings States
  const [labSettings, setLabSettings] = useState({
    labName: 'LabDNA Scientific',
    licenseNumber: 'SA-DNA-001',
    accreditation: 'ISO/IEC 17025:2017',
    osirisCompliance: true,
    autoBackup: true,
    dataRetention: 7,
    auditLogging: true
  });

  const userRoles = [
    { value: 'lab_director', label: 'Lab Director', description: 'Full system access' },
    { value: 'senior_analyst', label: 'Senior Analyst', description: 'Analysis and reporting' },
    { value: 'analyst', label: 'Analyst', description: 'Sample processing and analysis' },
    { value: 'technician', label: 'Technician', description: 'Sample preparation' },
    { value: 'viewer', label: 'Viewer', description: 'Read-only access' }
  ];

  useEffect(() => {
    fetchUsers();
    fetchSystemStats();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/genetic-analysis/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('geneticAuthToken')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      showSnackbar('Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStats = async () => {
    try {
      // Mock system statistics - would be real API calls
      setSystemStats({
        totalUsers: 12,
        activeUsers: 8,
        totalCases: 156,
        activeCases: 23,
        storageUsed: '45.2 GB',
        storageLimit: '100 GB',
        uptime: '99.8%',
        lastBackup: new Date(Date.now() - 2 * 60 * 60 * 1000),
        systemLoad: 67,
        osirisVersion: '2.16',
        databaseSize: '2.3 GB'
      });
    } catch (error) {
    }
  };

  const handleCreateUser = async (userData) => {
    try {
      const response = await fetch('/api/genetic-analysis/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('geneticAuthToken')}`
        },
        body: JSON.stringify(userData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchUsers();
        setUserDialog({ open: false, mode: 'create', user: null });
        showSnackbar('User created successfully', 'success');
      } else {
        showSnackbar(data.error || 'Failed to create user', 'error');
      }
    } catch (error) {
      showSnackbar('Network error: ' + error.message, 'error');
    }
  };

  const handleUpdateUser = async (userId, userData) => {
    try {
      const response = await fetch(`/api/genetic-analysis/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('geneticAuthToken')}`
        },
        body: JSON.stringify(userData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchUsers();
        setUserDialog({ open: false, mode: 'edit', user: null });
        showSnackbar('User updated successfully', 'success');
      } else {
        showSnackbar(data.error || 'Failed to update user', 'error');
      }
    } catch (error) {
      showSnackbar('Network error: ' + error.message, 'error');
    }
  };

  const handleToggleUserStatus = async (userId, isActive) => {
    try {
      const response = await fetch(`/api/genetic-analysis/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('geneticAuthToken')}`
        },
        body: JSON.stringify({ is_active: !isActive })
      });
      
      if (response.ok) {
        await fetchUsers();
        showSnackbar(`User ${isActive ? 'deactivated' : 'activated'} successfully`, 'success');
      }
    } catch (error) {
      showSnackbar('Failed to update user status', 'error');
    }
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'lab_director': return '#8EC74F';
      case 'senior_analyst': return '#0D488F';
      case 'analyst': return '#ff9800';
      case 'technician': return '#9c27b0';
      case 'viewer': return '#666';
      default: return '#666';
    }
  };

  const getSystemHealthColor = (percentage) => {
    if (percentage >= 90) return '#8EC74F';
    if (percentage >= 70) return '#ff9800';
    return '#ef5350';
  };

  const renderUserManagement = () => (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ color: isDarkMode ? 'white' : '#0D488F' }}>
          User Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setUserDialog({ open: true, mode: 'create', user: null })}
          sx={{
            backgroundColor: '#8EC74F',
            '&:hover': { backgroundColor: '#6BA23A' }
          }}
        >
          Add User
        </Button>
      </Box>

      {/* Users Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: isDarkMode ? 'rgba(13,72,143,0.1)' : 'rgba(13,72,143,0.05)' }}>
              <TableCell>User</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Login</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: getRoleColor(user.role), width: 32, height: 32 }}>
                      {user.username?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {user.first_name} {user.last_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.username}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.role.replace('_', ' ')}
                    size="small"
                    sx={{
                      backgroundColor: getRoleColor(user.role),
                      color: 'white',
                      textTransform: 'capitalize'
                    }}
                  />
                </TableCell>
                <TableCell>{user.department}</TableCell>
                <TableCell>
                  <Chip
                    label={user.is_active ? 'Active' : 'Inactive'}
                    size="small"
                    color={user.is_active ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Edit User">
                      <IconButton
                        size="small"
                        onClick={() => setUserDialog({ open: true, mode: 'edit', user })}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={user.is_active ? 'Deactivate' : 'Activate'}>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                      >
                        {user.is_active ? <LockIcon /> : <UnlockIcon />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderSystemMonitoring = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 3, color: isDarkMode ? 'white' : '#0D488F' }}>
        System Monitoring
      </Typography>

      {/* System Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <SpeedIcon sx={{ fontSize: 40, color: '#0D488F', mb: 1 }} />
              <Typography variant="h4" sx={{ color: '#0D488F', fontWeight: 'bold' }}>
                {systemStats.uptime}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                System Uptime
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <StorageIcon sx={{ fontSize: 40, color: '#8EC74F', mb: 1 }} />
              <Typography variant="h4" sx={{ color: '#8EC74F', fontWeight: 'bold' }}>
                {systemStats.storageUsed}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Storage Used
              </Typography>
              <Typography variant="caption" color="text.secondary">
                of {systemStats.storageLimit}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <SecurityIcon sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
              <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                {systemStats.activeUsers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Users
              </Typography>
              <Typography variant="caption" color="text.secondary">
                of {systemStats.totalUsers} total
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AnalyticsIcon sx={{ fontSize: 40, color: '#0D488F', mb: 1 }} />
              <Typography variant="h4" sx={{ color: '#0D488F', fontWeight: 'bold' }}>
                {systemStats.activeCases}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Cases
              </Typography>
              <Typography variant="caption" color="text.secondary">
                of {systemStats.totalCases} total
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* System Health */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>System Health</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  System Load: {systemStats.systemLoad}%
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <Box sx={{ width: '100%', mr: 1 }}>
                    <Box
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: isDarkMode ? '#333' : '#e0e0e0',
                        position: 'relative'
                      }}
                    >
                      <Box
                        sx={{
                          height: '100%',
                          width: `${systemStats.systemLoad}%`,
                          backgroundColor: getSystemHealthColor(100 - systemStats.systemLoad),
                          borderRadius: 4
                        }}
                      />
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Last Backup: {systemStats.lastBackup?.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Database Size: {systemStats.databaseSize}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Osiris Version: {systemStats.osirisVersion}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* System Alerts */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>System Alerts</Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon sx={{ color: '#8EC74F' }} />
              </ListItemIcon>
              <ListItemText
                primary="Osiris Integration Healthy"
                secondary="All STR analysis services operational"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <WarningIcon sx={{ color: '#ff9800' }} />
              </ListItemIcon>
              <ListItemText
                primary="Storage Warning"
                secondary="Approaching 50% capacity - consider archiving old cases"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon sx={{ color: '#8EC74F' }} />
              </ListItemIcon>
              <ListItemText
                primary="Backup Successful"
                secondary="Last automated backup completed successfully"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  );

  const renderLabSettings = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 3, color: isDarkMode ? 'white' : '#0D488F' }}>
        Laboratory Settings
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Laboratory Information
              </Typography>
              <TextField
                fullWidth
                label="Laboratory Name"
                value={labSettings.labName}
                onChange={(e) => setLabSettings({ ...labSettings, labName: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="License Number"
                value={labSettings.licenseNumber}
                onChange={(e) => setLabSettings({ ...labSettings, licenseNumber: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Accreditation"
                value={labSettings.accreditation}
                onChange={(e) => setLabSettings({ ...labSettings, accreditation: e.target.value })}
                sx={{ mb: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                System Configuration
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={labSettings.osirisCompliance}
                    onChange={(e) => setLabSettings({ ...labSettings, osirisCompliance: e.target.checked })}
                  />
                }
                label="Osiris Compliance Mode"
                sx={{ mb: 2, display: 'block' }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={labSettings.autoBackup}
                    onChange={(e) => setLabSettings({ ...labSettings, autoBackup: e.target.checked })}
                  />
                }
                label="Automatic Backup"
                sx={{ mb: 2, display: 'block' }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={labSettings.auditLogging}
                    onChange={(e) => setLabSettings({ ...labSettings, auditLogging: e.target.checked })}
                  />
                }
                label="Audit Logging"
                sx={{ mb: 2, display: 'block' }}
              />
              <TextField
                fullWidth
                type="number"
                label="Data Retention (years)"
                value={labSettings.dataRetention}
                onChange={(e) => setLabSettings({ ...labSettings, dataRetention: parseInt(e.target.value) })}
                sx={{ mb: 2 }}
              />
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                sx={{
                  backgroundColor: '#8EC74F',
                  '&:hover': { backgroundColor: '#6BA23A' }
                }}
              >
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography 
            variant="h4" 
            sx={{ 
              color: isDarkMode ? 'white' : '#0D488F',
              fontWeight: 'bold',
              mb: 1
            }}
          >
            🛡️ System Administration
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'text.secondary'
            }}
          >
            Manage users, monitor system health, and configure laboratory settings
          </Typography>
        </Box>
        
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            fetchUsers();
            fetchSystemStats();
          }}
          disabled={loading}
          sx={{
            borderColor: '#0D488F',
            color: '#0D488F',
            '&:hover': { 
              borderColor: '#022539',
              backgroundColor: 'rgba(13,72,143,0.1)'
            }
          }}
        >
          Refresh
        </Button>
      </Box>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="User Management" icon={<SecurityIcon />} />
          <Tab label="System Monitoring" icon={<AnalyticsIcon />} />
          <Tab label="Lab Settings" icon={<SettingsIcon />} />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 && renderUserManagement()}
          {activeTab === 1 && renderSystemMonitoring()}
          {activeTab === 2 && renderLabSettings()}
        </Box>
      </Paper>

      {/* User Dialog */}
      <UserManagementDialog
        open={userDialog.open}
        mode={userDialog.mode}
        user={userDialog.user}
        roles={userRoles}
        onClose={() => setUserDialog({ open: false, mode: 'create', user: null })}
        onSave={userDialog.mode === 'create' ? handleCreateUser : (userData) => handleUpdateUser(userDialog.user.id, userData)}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// User Management Dialog Component
const UserManagementDialog = ({ open, mode, user, roles, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    role: 'analyst',
    department: '',
    password: '',
    isActive: true
  });

  useEffect(() => {
    if (user && mode === 'edit') {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        role: user.role || 'analyst',
        department: user.department || '',
        password: '',
        isActive: user.is_active !== false
      });
    } else {
      setFormData({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        role: 'analyst',
        department: '',
        password: '',
        isActive: true
      });
    }
  }, [user, mode, open]);

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === 'create' ? 'Create New User' : 'Edit User'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                label="Role"
              >
                {roles.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    {role.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label={mode === 'create' ? 'Password' : 'New Password (leave blank to keep current)'}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="Active User"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          sx={{
            backgroundColor: '#8EC74F',
            '&:hover': { backgroundColor: '#6BA23A' }
          }}
        >
          {mode === 'create' ? 'Create User' : 'Update User'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminPanel;