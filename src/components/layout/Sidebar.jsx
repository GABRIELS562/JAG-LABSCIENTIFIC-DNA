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
  useMediaQuery
} from '@mui/material';
import { useThemeContext } from '../../contexts/ThemeContext';
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
  Replay
} from '@mui/icons-material';
import Logo from '../ui/Logo';

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const navigate = useNavigate();
  const { isDarkMode } = useThemeContext();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const menuItems = [
    {
      icon: <Home />,
      label: 'Home',
      hasSubMenu: false,
      path: '/',
      onClick: () => navigate('/')
    },
    { 
      icon: <PersonAdd />, 
      label: 'Register Client',
      hasSubMenu: false,
      path: '/register-client',
      onClick: () => navigate('/register-client')
    },
    { 
      icon: <Group />, 
      label: 'Samples',
      hasSubMenu: false,
      path: '/client-register',
      onClick: () => navigate('/client-register')
    },
    { 
      icon: <EditNote />, 
      label: 'PCR Plate',
      hasSubMenu: false,
      path: '/pcr-plate',
      onClick: () => navigate('/pcr-plate')
    },
    { 
      icon: <Visibility />, 
      label: 'LDS PCR Batch',
      hasSubMenu: false,
      path: '/pcr-batches',
      onClick: () => navigate('/pcr-batches')
    },
    { 
      icon: <ElectricBolt />, 
      label: 'Electrophoresis Plate Layout',
      hasSubMenu: false,
      path: '/electrophoresis-layout',
      onClick: () => navigate('/electrophoresis-layout')
    },
    { 
      icon: <ElectricBolt />, 
      label: 'LDS Electrophoresis Batch',
      hasSubMenu: false,
      path: '/electrophoresis-batches',
      onClick: () => navigate('/electrophoresis-batches')
    },
    { 
      icon: <Replay />, 
      label: 'Reruns',
      hasSubMenu: false,
      path: '/reruns',
      onClick: () => navigate('/reruns')
    },
    { 
      icon: <Science />, 
      label: 'Genetic Analysis',
      hasSubMenu: false,
      path: '/genetic-analysis',
      onClick: () => navigate('/genetic-analysis')
    },
    { 
      icon: <Science />, 
      label: 'Lab Results',
      hasSubMenu: false,
      path: '/lab-results',
      onClick: () => navigate('/lab-results')
    },
    { 
      icon: <Description />,
      label: 'Reports',
      hasSubMenu: false,
      path: '/reports',
      onClick: () => navigate('/reports')
    },
    { 
      icon: <Assessment />, 
      label: 'Quality Control',
      hasSubMenu: true,
      path: '/quality-control',
      onClick: () => navigate('/quality-control')
    },
    { 
      icon: <Search />, 
      label: 'Sample Search',
      hasSubMenu: false,
      path: '/sample-search',
      onClick: () => navigate('/sample-search')
    },
    { 
      icon: <Queue />, 
      label: 'Sample Queues',
      hasSubMenu: false,
      path: '/sample-queues',
      onClick: () => navigate('/sample-queues')
    },
    { 
      icon: <TableChart />, 
      label: 'Statistics',
      hasSubMenu: false,
      path: '/statistics',
      onClick: () => navigate('/statistics')
    },
    { 
      icon: <ExitToApp />, 
      label: 'Log Out',
      hasSubMenu: false,
      path: '/logout',
      onClick: () => navigate('/logout')
    }
  ];

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
    </>
  );

  return (
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
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;