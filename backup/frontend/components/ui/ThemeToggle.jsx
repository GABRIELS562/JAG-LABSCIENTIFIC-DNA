import { IconButton } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useThemeContext } from '../../contexts/ThemeContext';

function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useThemeContext();

  return (
    <IconButton
      onClick={toggleTheme}
      color="inherit"
      sx={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 1300, // Higher z-index to ensure it's on top
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(13, 72, 143, 0.1)',
        color: isDarkMode ? 'white' : '#0D488F',
        borderRadius: '50%',
        width: 48,
        height: 48,
        backdropFilter: 'blur(8px)',
        boxShadow: isDarkMode 
          ? '0 4px 12px rgba(0, 0, 0, 0.3)'
          : '0 4px 12px rgba(13, 72, 143, 0.2)',
        transition: 'all 0.3s ease',
        '&:hover': {
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(13, 72, 143, 0.2)',
          transform: 'scale(1.05)',
          boxShadow: isDarkMode 
            ? '0 6px 16px rgba(0, 0, 0, 0.4)'
            : '0 6px 16px rgba(13, 72, 143, 0.3)',
        },
      }}
    >
      {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
    </IconButton>
  );
}

export default ThemeToggle; 