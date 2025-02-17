import React from 'react';
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
  useTheme
} from '@mui/material';
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
  Assessment
} from '@mui/icons-material';
import Logo from '../ui/Logo';

const Sidebar = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const location = useLocation();

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
      icon: <Science />, 
      label: 'Generate Batch',
      hasSubMenu: false,
      onClick: () => navigate('/generate-batch')
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

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 280,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 280,
          boxSizing: 'border-box',
          backgroundColor: theme.palette.mode === 'dark' ? '#121212' : '#1e4976',
          color: 'white',
          borderRight: 'none',
          transition: 'background-color 0.3s ease',
        },
      }}
    >
      <Box
        onClick={() => navigate('/')}
        sx={{
          p: 2,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' 
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
            backgroundColor: theme.palette.mode === 'dark' 
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
              onClick={item.onClick}
              selected={location.pathname === item.onClick.toString().match(/['"]([^'"]*)['"]/)[1]}
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
                  backgroundColor: theme.palette.mode === 'dark' 
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
    </Drawer>
  );
};

export default Sidebar;