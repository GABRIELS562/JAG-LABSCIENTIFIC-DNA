import { Box } from '@mui/material';
import { useThemeContext } from '../../contexts/ThemeContext';

const Logo = ({ sx = {} }) => {
  const { isDarkMode } = useThemeContext();
  
  // Use different logo based on theme mode
  const logoSrc = isDarkMode 
    ? '/labdna-logo-dark.png'  // White text on dark background
    : '/labdna-logo-light.png'; // Black text on light background
  
  return (
    <Box
      component="img"
      src={logoSrc}
      alt="LABDNA Scientific"
      sx={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transition: 'opacity 0.3s ease',
        ...sx
      }}
    />
  );
};

export default Logo; 