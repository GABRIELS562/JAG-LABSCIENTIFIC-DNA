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
  ElectricBolt
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
      onClick: () => navigate('/')
    },
    { 
      icon: <PersonAdd />, 
      label: 'Register Client',
      hasSubMenu: false,
      onClick: () => navigate('/register-client')
    },
    { 
      icon: <Group />, 
      label: 'Samples',
      hasSubMenu: false,
      onClick: () => navigate('/client-register')
    },
    { 
      icon: <EditNote />, 
      label: 'PCR Plate',
      hasSubMenu: false,
      onClick: () => navigate('/pcr-plate')
    },
    { 
      icon: <Visibility />, 
      label: 'LDS PCR Batch',
      hasSubMenu: false,
      onClick: () => navigate('/pcr-batches')
    },
    { 
      icon: <Science />, 
      label: 'Electrophoresis Plate',
      hasSubMenu: false,
      onClick: () => navigate('/generate-batch')
    },
    { 
      icon: <ElectricBolt />, 
      label: 'LDS Electrophoresis Batch',
      hasSubMenu: false,
      onClick: () => navigate('/electrophoresis-batches')
    },
    { 
      icon: <Science />, 
      label: 'Genetic Analysis',
      hasSubMenu: false,
      onClick: () => navigate('/genetic-analysis')
    },
    { 
      icon: <Science />, 
      label: 'Lab Results',
      hasSubMenu: false,
      onClick: () => navigate('/lab-results')
    },
    { 
      icon: <Description />,
      label: 'Reports',
      hasSubMenu: false,
      onClick: () => navigate('/reports')
    },
    { 
      icon: <Assessment />, 
      label: 'Quality Control',
      hasSubMenu: true,
      onClick: () => navigate('/quality-control')
    },
    { 
      icon: <Search />, 
      label: 'Sample Search',
      hasSubMenu: false,
      onClick: () => navigate('/sample-search')
    },
    { 
      icon: <Queue />, 
      label: 'Sample Queues',
      hasSubMenu: false,
      onClick: () => navigate('/sample-queues')
    },
    { 
      icon: <TableChart />, 
      label: 'Statistics',
      hasSubMenu: false,
      onClick: () => navigate('/statistics')
    },
    { 
      icon: <ExitToApp />, 
      label: 'Log Out',
      hasSubMenu: false,
      onClick: () => navigate('/logout')
    }
  ];

  const handleDrawerToggle = () => {
    if (setMobileOpen) {
      setMobileOpen(!mobileOpen);
    }
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
              selected={false}
              sx={{
                minHeight: 48,
                px: 2.5,
                '&.Mui-selected': {
                  bgcolor: 'rgba(255, 255, 255, 0.12)',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.15)',
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
                  color: 'rgba(255, 255, 255, 0.7)',
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
                    fontWeight: 500,
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