import React from 'react';
import { Box, IconButton, useTheme } from '@mui/material';
import { DarkMode, LightMode } from '@mui/icons-material';

const ThemeToggle = ({ onToggle, isDarkMode }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1200,
      }}
    >
      <IconButton
        onClick={onToggle}
        sx={{
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(8px)',
          '&:hover': {
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
          },
        }}
      >
        {isDarkMode ? (
          <LightMode sx={{ color: '#fff' }} />
        ) : (
          <DarkMode sx={{ color: '#1e4976' }} />
        )}
      </IconButton>
    </Box>
  );
};

export default ThemeToggle;