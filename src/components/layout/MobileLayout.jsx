import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  BottomNavigation,
  BottomNavigationAction,
  useMediaQuery,
  useTheme,
  Fab,
  Badge,
  SwipeableDrawer,
  Divider,
  Avatar,
  Chip
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Science as ScienceIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  AccountCircle as AccountIcon,
  Notifications as NotificationsIcon,
  CloudOff as OfflineIcon,
  Wifi as OnlineIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import NotificationSystem from '../features/NotificationSystem';
import { useConnectionStatus } from '../../hooks/useWebSocket';

const MobileLayout = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  const location = useLocation();
  const navigate = useNavigate();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bottomNavValue, setBottomNavValue] = useState('/');
  const connectionStatus = useConnectionStatus();

  // Navigation items
  const navigationItems = [
    { 
      text: 'Dashboard', 
      icon: <HomeIcon />, 
      path: '/',
      color: '#1976d2'
    },
    { 
      text: 'Sample Search', 
      icon: <SearchIcon />, 
      path: '/sample-search',
      color: '#2e7d32'
    },
    { 
      text: 'Register Sample', 
      icon: <AddIcon />, 
      path: '/client-register',
      color: '#ed6c02'
    },
    { 
      text: 'Laboratory', 
      icon: <ScienceIcon />, 
      path: '/genetic-analysis',
      color: '#9c27b0'
    },
    { 
      text: 'Reports', 
      icon: <AssessmentIcon />, 
      path: '/reports',
      color: '#d32f2f'
    },
    { 
      text: 'Settings', 
      icon: <SettingsIcon />, 
      path: '/settings',
      color: '#424242'
    }
  ];

  // Bottom navigation items (mobile only)
  const bottomNavItems = [
    { label: 'Home', icon: <HomeIcon />, value: '/' },
    { label: 'Search', icon: <SearchIcon />, value: '/sample-search' },
    { label: 'Lab', icon: <ScienceIcon />, value: '/genetic-analysis' },
    { label: 'Reports', icon: <AssessmentIcon />, value: '/reports' }
  ];

  useEffect(() => {
    setBottomNavValue(location.pathname);
  }, [location.pathname]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleBottomNavChange = (event, newValue) => {
    setBottomNavValue(newValue);
    navigate(newValue);
  };

  // Drawer content
  const drawer = (
    <Box sx={{ width: 280 }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
          color: 'white'
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
              <ScienceIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" noWrap>
                LabDNA LIMS
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Laboratory Management
              </Typography>
            </Box>
          </Box>
          {isMobile && (
            <IconButton
              color="inherit"
              onClick={handleDrawerToggle}
              edge="end"
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>
        
        {/* Connection Status */}
        <Box mt={2}>
          <Chip
            icon={connectionStatus.isConnected ? <OnlineIcon /> : <OfflineIcon />}
            label={connectionStatus.isConnected ? 'Online' : 'Offline'}
            size="small"
            color={connectionStatus.isConnected ? 'success' : 'error'}
            variant="outlined"
            sx={{ 
              color: 'white',
              borderColor: 'rgba(255,255,255,0.5)',
              '& .MuiChip-icon': { color: 'white' }
            }}
          />
        </Box>
      </Box>

      <Divider />

      {/* Navigation Items */}
      <List>
        {navigationItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              selected={location.pathname === item.path}
              sx={{
                '&.Mui-selected': {
                  bgcolor: `${item.color}15`,
                  borderRight: `3px solid ${item.color}`,
                  '& .MuiListItemIcon-root': {
                    color: item.color
                  },
                  '& .MuiListItemText-primary': {
                    color: item.color,
                    fontWeight: 600
                  }
                }
              }}
            >
              <ListItemIcon sx={{ color: item.color }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                primaryTypographyProps={{
                  fontSize: '0.95rem'
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      {/* User Section */}
      <Box sx={{ p: 2 }}>
        <Box display="flex" alignItems="center">
          <Avatar sx={{ bgcolor: theme.palette.primary.main, mr: 2 }}>
            <AccountIcon />
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600}>
              Lab Technician
            </Typography>
            <Typography variant="caption" color="text.secondary">
              labtech@labdna.com
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${mobileOpen && !isMobile ? 280 : 0}px)` },
          ml: { md: mobileOpen && !isMobile ? `280px` : 0 },
          zIndex: theme.zIndex.drawer + 1
        }}
      >
        <Toolbar>
          {(isMobile || isTablet) && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            LabScientific LIMS
          </Typography>

          {/* Connection Status Indicator */}
          <IconButton color="inherit" size="small" sx={{ mr: 1 }}>
            {connectionStatus.isConnected ? (
              <OnlineIcon fontSize="small" />
            ) : (
              <OfflineIcon fontSize="small" />
            )}
          </IconButton>

          {/* Notifications */}
          <NotificationSystem />
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      {isMobile ? (
        <SwipeableDrawer
          variant="temporary"
          open={mobileOpen}
          onOpen={handleDrawerToggle}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true // Better open performance on mobile
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: 280
            }
          }}
        >
          {drawer}
        </SwipeableDrawer>
      ) : (
        <Drawer
          variant="persistent"
          open={mobileOpen}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: 280
            }
          }}
        >
          {drawer}
        </Drawer>
      )}

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: 8, // AppBar height
          pb: isMobile ? 7 : 0, // Bottom navigation height on mobile
          px: { xs: 1, sm: 2, md: 3 },
          ml: { md: mobileOpen && !isMobile ? `280px` : 0 },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          overflow: 'auto',
          bgcolor: theme.palette.background.default
        }}
      >
        {children}
      </Box>

      {/* Bottom Navigation (Mobile only) */}
      {isMobile && (
        <Paper
          sx={{ 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            right: 0,
            zIndex: theme.zIndex.appBar
          }}
          elevation={3}
        >
          <BottomNavigation
            value={bottomNavValue}
            onChange={handleBottomNavChange}
            showLabels
          >
            {bottomNavItems.map((item) => (
              <BottomNavigationAction
                key={item.value}
                label={item.label}
                value={item.value}
                icon={item.icon}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}

      {/* Floating Action Button for Quick Actions */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label="add sample"
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            zIndex: theme.zIndex.speedDial
          }}
          onClick={() => navigate('/client-register')}
        >
          <AddIcon />
        </Fab>
      )}
    </Box>
  );
};

export default MobileLayout;