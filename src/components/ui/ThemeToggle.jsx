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
        top: 16,
        right: 16,
        zIndex: 1100,
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(13, 72, 143, 0.1)',
        color: isDarkMode ? 'white' : '#0D488F',
        '&:hover': {
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(13, 72, 143, 0.2)',
        },
      }}
    >
      {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
    </IconButton>
  );
}

export default ThemeToggle; 