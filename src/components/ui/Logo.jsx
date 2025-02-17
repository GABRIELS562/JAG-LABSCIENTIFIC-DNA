import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import logoImage from '../../assets/logo.png';

const Logo = ({ sx = {} }) => {
  const theme = useTheme();
  
  return (
    <Box
      component="img"
      src={logoImage}
      alt="LABDNA Scientific"
      sx={{
        width: '90%',
        maxWidth: 200,
        height: 'auto',
        filter: theme.palette.mode === 'dark' ? 'brightness(1)' : 'none',
        ...sx
      }}
    />
  );
};

export default Logo; 