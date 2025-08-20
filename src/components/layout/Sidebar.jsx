import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  ListItemButton,
  Box,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  Home,
  PersonAdd,
  AssignmentTurnedIn,
  Science,
  Visibility,
  EditNote,
  Storage,
  TableChart,
  ExitToApp,
  Search,
  Description, // Added for Reports icon
  Assessment,
  Group,
  Queue,
  ElectricBolt,
  Replay,
  AccountCircle,
  Logout,
  Assignment,
  Inventory,
  PsychologyOutlined as AI
} from '@mui/icons-material';
import Logo from '../ui/Logo';

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const navigate = useNavigate();
  const { isDarkMode } = useThemeContext();
  const { user, logout, isStaff } = useAuth();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State for logout confirmation dialog
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  // Handle logout confirmation
  const handleLogoutClick = () => {
    setLogoutDialogOpen(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      await logout();
      setLogoutDialogOpen(false);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      setLogoutDialogOpen(false);
    }
  };

  const handleLogoutCancel = () => {
    setLogoutDialogOpen(false);
  };

  // Define all menu items with role restrictions
  const allMenuItems = [
    {
      icon: <Home />,
      label: 'Home',
      hasSubMenu: false,
      path: '/',
      onClick: () => navigate('/'),
      roles: ['staff', 'client']
    },
    { 
      icon: <PersonAdd />, 
      label: 'Register Client',
      hasSubMenu: false,
      path: '/register-client',
      onClick: () => navigate('/register-client'),
      roles: ['staff']
    },
    { 
      icon: <Group />, 
      label: 'Samples',
      hasSubMenu: false,
      path: '/client-register',
      onClick: () => navigate('/client-register'),
      roles: ['staff']
    },
    { 
      icon: <EditNote />, 
      label: 'PCR Plate',
      hasSubMenu: false,
      path: '/pcr-plate',
      onClick: () => navigate('/pcr-plate'),
      roles: ['staff']
    },
    { 
      icon: <Visibility />, 
      label: 'LDS PCR Batch',
      hasSubMenu: false,
      path: '/pcr-batches',
      onClick: () => navigate('/pcr-batches'),
      roles: ['staff']
    },
    { 
      icon: <ElectricBolt />, 
      label: 'Electrophoresis Plate Layout',
      hasSubMenu: false,
      path: '/electrophoresis-layout',
      onClick: () => navigate('/electrophoresis-layout'),
      roles: ['staff']
    },
    { 
      icon: <ElectricBolt />, 
      label: 'LDS Electrophoresis Batch',
      hasSubMenu: false,
      path: '/electrophoresis-batches',
      onClick: () => navigate('/electrophoresis-batches'),
      roles: ['staff']
    },
    { 
      icon: <Replay />, 
      label: 'Reruns',
      hasSubMenu: false,
      path: '/reruns',
      onClick: () => navigate('/reruns'),
      roles: ['staff']
    },
    { 
      icon: <Science />, 
      label: 'Genetic Analysis Setup',
      hasSubMenu: false,
      path: '/genetic-analysis',
      onClick: () => navigate('/genetic-analysis'),
      roles: ['staff']
    },
    { 
      icon: <Science />, 
      label: 'OSIRIS Analysis',
      hasSubMenu: false,
      path: '/osiris-analysis',
      onClick: () => navigate('/osiris-analysis'),
      roles: ['staff']
    },
    { 
      icon: <Assessment />, 
      label: 'Analysis Summary',
      hasSubMenu: false,
      path: '/analysis-summary',
      onClick: () => navigate('/analysis-summary'),
      roles: ['staff', 'client']
    },
    { 
      icon: <Science />, 
      label: 'Lab Results',
      hasSubMenu: false,
      path: '/lab-results',
      onClick: () => navigate('/lab-results'),
      roles: ['staff', 'client']
    },
    { 
      icon: <Description />,
      label: 'Reports',
      hasSubMenu: false,
      path: '/reports',
      onClick: () => navigate('/reports'),
      roles: ['staff', 'client']
    },
    { 
      icon: <Assessment />, 
      label: 'Quality Control',
      hasSubMenu: true,
      path: '/quality-control',
      onClick: () => navigate('/quality-control'),
      roles: ['staff']
    },
    { 
      icon: <Assignment />, 
      label: 'Quality Management System',
      hasSubMenu: false,
      path: '/qms',
      onClick: () => navigate('/qms'),
      roles: ['staff']
    },
    { 
      icon: <Inventory />, 
      label: 'Inventory Management',
      hasSubMenu: false,
      path: '/inventory',
      onClick: () => navigate('/inventory'),
      roles: ['staff']
    },
    { 
      icon: <AI />, 
      label: 'AI & Machine Learning',
      hasSubMenu: false,
      path: '/ai-ml',
      onClick: () => navigate('/ai-ml'),
      roles: ['staff']
    },
    { 
      icon: <Search />, 
      label: 'Sample Search',
      hasSubMenu: false,
      path: '/sample-search',
      onClick: () => navigate('/sample-search'),
      roles: ['staff', 'client']
    },
    { 
      icon: <Queue />, 
      label: 'Sample Queues',
      hasSubMenu: false,
      path: '/sample-queues',
      onClick: () => navigate('/sample-queues'),
      roles: ['staff', 'client']
    },
    { 
      icon: <TableChart />, 
      label: 'Statistics',
      hasSubMenu: false,
      path: '/statistics',
      onClick: () => navigate('/statistics'),
      roles: ['staff', 'client']
    }
  ];

  // For development - show all menu items without role filtering
  const menuItems = allMenuItems;

  const handleDrawerToggle = () => {
    if (setMobileOpen) {
      setMobileOpen(!mobileOpen);
    }
  };

  // Function to check if a menu item is active based on current location
  const isActiveItem = (item) => {
    const currentPath = location.pathname;
    return currentPath === item.path;
  };

  const drawerContent = (
    <>
      <Box
        onClick={() => navigate('/')}
        sx={{
          p: 2,
          py: 3,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          minHeight: { xs: 80, md: 100 },
          maxHeight: { xs: 100, md: 120 },
          '&:hover': {
            backgroundColor: isDarkMode 
              ? 'rgba(255, 255, 255, 0.05)' 
              : 'rgba(255, 255, 255, 0.08)',
          },
        }}
      >
        <Logo />
      </Box>

      {/* User Info Section - Disabled for development */}
      {/* 
      {user && (
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 1,
              p: 1.5,
              mb: 1,
            }}
          >
            <AccountCircle sx={{ mr: 1.5, fontSize: 32, opacity: 0.8 }} />
            <Box>
              <Typography variant="body2" sx={{ 
                fontWeight: 'bold', 
                color: 'white',
                fontSize: '0.85rem'
              }}>
                {user.username}
              </Typography>
              <Typography variant="caption" sx={{ 
                opacity: 0.7,
                color: 'rgba(255, 255, 255, 0.7)',
                textTransform: 'capitalize'
              }}>
                {user.role}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
      */}

      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: isDarkMode 
              ? 'rgba(255, 255, 255, 0.05)' 
              : 'rgba(255, 255, 255, 0.1)',
            borderRadius: 1,
            p: 1,
            transition: 'background-color 0.3s ease',
          }}
        >
          <Search sx={{ mr: 1, opacity: 0.7 }} />
          <input
            type="text"
            placeholder="Search..."
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              outline: 'none',
              width: '100%',
              fontSize: '0.9rem',
            }}
          />
        </Box>
      </Box>

      <List sx={{ pt: 0 }}>
        {menuItems.map((item, index) => (
          <ListItem 
            key={index} 
            disablePadding 
            sx={{ 
              display: 'block',
              mb: 0.5
            }}
          >
            <ListItemButton
              onClick={() => {
                item.onClick();
                if (isMobile && setMobileOpen) {
                  setMobileOpen(false);
                }
              }}
              selected={isActiveItem(item)}
              sx={{
                minHeight: 48,
                px: 2.5,
                '&.Mui-selected': {
                  bgcolor: isDarkMode 
                    ? 'rgba(255, 255, 255, 0.2)' 
                    : 'rgba(13, 72, 143, 0.2)',
                  borderLeft: '4px solid',
                  borderLeftColor: isDarkMode ? '#fff' : '#0D488F',
                  borderRadius: '0 8px 8px 0',
                  mx: 1,
                  '&:hover': {
                    bgcolor: isDarkMode 
                      ? 'rgba(255, 255, 255, 0.25)' 
                      : 'rgba(13, 72, 143, 0.25)',
                  },
                },
                '&:hover': {
                  backgroundColor: isDarkMode 
                    ? 'rgba(255, 255, 255, 0.05)' 
                    : 'rgba(255, 255, 255, 0.08)',
                },
                transition: 'background-color 0.2s ease',
              }}
            >
              <ListItemIcon 
                sx={{ 
                  minWidth: 40, 
                  color: isActiveItem(item) 
                    ? (isDarkMode ? '#fff' : '#0D488F')
                    : 'rgba(255, 255, 255, 0.7)',
                  mr: 1,
                  transition: 'color 0.2s ease',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.label}
                sx={{
                  '& .MuiListItemText-primary': {
                    fontSize: '0.9rem',
                    fontWeight: isActiveItem(item) ? 900 : 500,
                    color: isActiveItem(item) 
                      ? (isDarkMode ? '#fff' : '#fff')
                      : 'rgba(255, 255, 255, 0.9)',
                    transition: 'color 0.2s ease, font-weight 0.2s ease',
                  }
                }}
              />
              {item.hasSubMenu && (
                <Typography sx={{ 
                  color: 'rgba(255, 255, 255, 0.5)',
                  transition: 'color 0.2s ease',
                }}>•••</Typography>
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Logout Section - Disabled for development */}
      {/* 
      {user && (
        <>
          <Divider sx={{ 
            borderColor: 'rgba(255, 255, 255, 0.1)', 
            mx: 2,
            mt: 'auto' 
          }} />
          <Box sx={{ p: 2 }}>
            <ListItemButton
              onClick={handleLogoutClick}
              sx={{
                minHeight: 48,
                px: 2.5,
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: 'rgba(244, 67, 54, 0.1)',
                },
                transition: 'background-color 0.2s ease',
              }}
            >
              <ListItemIcon 
                sx={{ 
                  minWidth: 40, 
                  color: '#f44336',
                  mr: 1,
                }}
              >
                <Logout />
              </ListItemIcon>
              <ListItemText 
                primary="Logout"
                sx={{
                  '& .MuiListItemText-primary': {
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    color: '#f44336',
                  }
                }}
              />
            </ListItemButton>
          </Box>
        </>
      )}
      */}
    </>
  );

  // Logout Confirmation Dialog
  const logoutDialog = (
    <Dialog 
      open={logoutDialogOpen} 
      onClose={handleLogoutCancel}
      PaperProps={{
        sx: {
          bgcolor: isDarkMode ? '#1e1e1e' : 'white',
          color: isDarkMode ? 'white' : 'inherit'
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Logout color="warning" />
          Confirm Logout
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to logout from LabDNA LIMS?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleLogoutCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleLogoutConfirm}
          variant="contained"
          color="error"
          startIcon={<Logout />}
        >
          Logout
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <>
      <Box
        component="nav"
        sx={{ 
          width: { md: 220 }, 
          flexShrink: { md: 0 } 
        }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: 280,
              backgroundColor: isDarkMode ? '#022539' : '#0D488F',
              color: 'white',
              borderRight: 'none',
              transition: 'background-color 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
            },
          }}
        >
          {drawerContent}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: 220,
              backgroundColor: isDarkMode ? '#022539' : '#0D488F',
              color: 'white',
              borderRight: 'none',
              transition: 'background-color 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>
      
      {/* Logout Confirmation Dialog */}
      {logoutDialog}
    </>
  );
};

export default Sidebar;