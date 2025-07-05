import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Divider
} from '@mui/material';
import {
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  Launch as LaunchIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useThemeContext } from '../../contexts/ThemeContext';

const OsirisWorkspaceManager = ({ onWorkspaceSelect }) => {
  const { isDarkMode } = useThemeContext();
  
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      
      // Mock workspace data - in real implementation, this would query the Osiris workspace directory
      const mockWorkspaces = [
        {
          id: 'ws_001',
          name: 'Paternity_Cases_2025',
          path: '/Users/user/Documents/Osiris/Workspaces/Paternity_Cases_2025',
          created: '2025-01-15T10:30:00Z',
          lastModified: '2025-01-15T14:20:00Z',
          caseCount: 5,
          status: 'active',
          description: 'Primary workspace for paternity testing cases'
        },
        {
          id: 'ws_002',
          name: 'Forensic_Analysis_2025',
          path: '/Users/user/Documents/Osiris/Workspaces/Forensic_Analysis_2025',
          created: '2025-01-10T09:15:00Z',
          lastModified: '2025-01-14T16:45:00Z',
          caseCount: 12,
          status: 'active',
          description: 'Workspace for forensic DNA analysis'
        },
        {
          id: 'ws_003',
          name: 'Quality_Control_2025',
          path: '/Users/user/Documents/Osiris/Workspaces/Quality_Control_2025',
          created: '2025-01-05T11:00:00Z',
          lastModified: '2025-01-12T13:30:00Z',
          caseCount: 3,
          status: 'maintenance',
          description: 'QC samples and control testing'
        }
      ];
      
      setWorkspaces(mockWorkspaces);
    } catch (error) {
      setError('Failed to load workspaces: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) {
      setError('Workspace name is required');
      return;
    }

    try {
      setLoading(true);
      
      // In real implementation, this would create an actual Osiris workspace
      const newWorkspace = {
        id: `ws_${Date.now()}`,
        name: newWorkspaceName,
        path: `/Users/user/Documents/Osiris/Workspaces/${newWorkspaceName}`,
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        caseCount: 0,
        status: 'active',
        description: 'New workspace created from LIMS'
      };

      setWorkspaces(prev => [...prev, newWorkspace]);
      setCreateDialog(false);
      setNewWorkspaceName('');
      
    } catch (error) {
      setError('Failed to create workspace: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWorkspace = (workspace) => {
    setSelectedWorkspace(workspace);
    if (onWorkspaceSelect) {
      onWorkspaceSelect(workspace);
    }
  };

  const handleOpenInOsiris = async (workspace) => {
    try {
      if (window.osirisAPI) {
        const result = await window.osirisAPI.openGUI({
          workspace: workspace.path,
          name: workspace.name
        });
        
        if (!result.success) {
          setError('Failed to open workspace in Osiris: ' + result.error);
        }
      }
    } catch (error) {
      setError('Error opening Osiris: ' + error.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#8EC74F';
      case 'maintenance': return '#ff9800';
      case 'archived': return '#666';
      default: return '#0D488F';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircleIcon sx={{ color: '#8EC74F' }} />;
      case 'maintenance': return <ScheduleIcon sx={{ color: '#ff9800' }} />;
      case 'archived': return <ErrorIcon sx={{ color: '#666' }} />;
      default: return <CheckCircleIcon sx={{ color: '#0D488F' }} />;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" sx={{ color: isDarkMode ? 'white' : '#0D488F', fontWeight: 'bold' }}>
            🗂️ Osiris Workspace Manager
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage and organize your Osiris analysis workspaces
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadWorkspaces}
            disabled={loading}
            sx={{ borderColor: '#0D488F', color: '#0D488F' }}
          >
            Refresh
          </Button>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialog(true)}
            sx={{ backgroundColor: '#8EC74F', '&:hover': { backgroundColor: '#6BA23A' } }}
          >
            New Workspace
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Workspace Grid */}
      <Grid container spacing={3}>
        {workspaces.map((workspace) => (
          <Grid item xs={12} md={6} lg={4} key={workspace.id}>
            <Card sx={{
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
              border: selectedWorkspace?.id === workspace.id ? '2px solid #8EC74F' : '1px solid rgba(0,0,0,0.1)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                boxShadow: 3,
                borderColor: '#8EC74F'
              }
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FolderIcon sx={{ color: '#0D488F', fontSize: 32 }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#0D488F' }}>
                        {workspace.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {workspace.id}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getStatusIcon(workspace.status)}
                    <Chip
                      label={workspace.status}
                      size="small"
                      sx={{
                        backgroundColor: getStatusColor(workspace.status),
                        color: 'white',
                        textTransform: 'capitalize'
                      }}
                    />
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                  {workspace.description}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={1} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Cases:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {workspace.caseCount}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Modified:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {new Date(workspace.lastModified).toLocaleDateString()}
                    </Typography>
                  </Grid>
                </Grid>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  Path: {workspace.path}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectWorkspace(workspace);
                    }}
                    sx={{
                      borderColor: selectedWorkspace?.id === workspace.id ? '#8EC74F' : '#0D488F',
                      color: selectedWorkspace?.id === workspace.id ? '#8EC74F' : '#0D488F'
                    }}
                  >
                    {selectedWorkspace?.id === workspace.id ? 'Selected' : 'Select'}
                  </Button>
                  
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<LaunchIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenInOsiris(workspace);
                    }}
                    sx={{ backgroundColor: '#0D488F', '&:hover': { backgroundColor: '#022539' } }}
                  >
                    Open
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Selected Workspace Details */}
      {selectedWorkspace && (
        <Paper sx={{ 
          mt: 3, 
          p: 3, 
          backgroundColor: isDarkMode ? 'rgba(142,199,79,0.1)' : 'rgba(142,199,79,0.05)',
          border: '1px solid rgba(142,199,79,0.3)'
        }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#8EC74F' }}>
            📁 Selected Workspace: {selectedWorkspace.name}
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <FolderIcon sx={{ color: '#8EC74F' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Workspace Path"
                    secondary={selectedWorkspace.path}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <FileIcon sx={{ color: '#0D488F' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Cases"
                    secondary={`${selectedWorkspace.caseCount} active cases`}
                  />
                </ListItem>
              </List>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<LaunchIcon />}
                  onClick={() => handleOpenInOsiris(selectedWorkspace)}
                  sx={{ backgroundColor: '#8EC74F', '&:hover': { backgroundColor: '#6BA23A' } }}
                >
                  Open in Osiris
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<FolderIcon />}
                  onClick={() => {
                    if (window.electronAPI) {
                      window.electronAPI.openExternal(selectedWorkspace.path);
                    }
                  }}
                  sx={{ borderColor: '#0D488F', color: '#0D488F' }}
                >
                  Open in Finder
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Create Workspace Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          📁 Create New Osiris Workspace
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            This will create a new Osiris workspace directory with the necessary configuration files.
          </Alert>
          
          <TextField
            autoFocus
            margin="dense"
            label="Workspace Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            placeholder="e.g., Paternity_Cases_2025"
            helperText="Choose a descriptive name for your workspace"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateWorkspace}
            variant="contained"
            disabled={!newWorkspaceName.trim() || loading}
            sx={{ backgroundColor: '#8EC74F' }}
          >
            Create Workspace
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OsirisWorkspaceManager;