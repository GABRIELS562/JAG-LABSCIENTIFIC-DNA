import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  Description // Added for Reports icon
} from '@mui/icons-material';

const Sidebar = () => {
  const navigate = useNavigate();
  const theme = useTheme();

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
      icon: <Description />, // Changed icon for Reports
      label: 'Reports',
      hasSubMenu: false,
      onClick: () => navigate('/reports') // Updated path
    },
    { 
      icon: <AssignmentTurnedIn />, 
      label: 'Assign Lab Number',
      hasSubMenu: false,
      onClick: () => navigate('/assign-lab-number')
    },
    { 
      icon: <Science />, 
      label: 'Sample Login',
      hasSubMenu: false,
      onClick: () => navigate('/sample-login')
    },
    { 
      icon: <Visibility />, 
      label: 'View Sample',
      hasSubMenu: false,
      onClick: () => navigate('/view-sample')
    },
    { 
      icon: <EditNote />, 
      label: 'Enter Results',
      hasSubMenu: false,
      onClick: () => navigate('/enter-results')
    },
    { 
      icon: <Storage />, 
      label: 'Manage Tables',
      hasSubMenu: true,
      onClick: () => navigate('/manage-tables')
    },
    { 
      icon: <TableChart />, 
      label: 'Explore Tables',
      hasSubMenu: false,
      onClick: () => navigate('/explore-tables')
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
          gap: 1,
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.05)' 
              : 'rgba(255, 255, 255, 0.08)',
          },
        }}
      >
        <Science sx={{ fontSize: 32 }} />
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            fontWeight: 'bold',
            fontSize: '1.1rem',
            letterSpacing: '0.5px'
          }}
        >
          LABDNA SCIENTIFIC
        </Typography>
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
              sx={{
                minHeight: 48,
                px: 2.5,
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