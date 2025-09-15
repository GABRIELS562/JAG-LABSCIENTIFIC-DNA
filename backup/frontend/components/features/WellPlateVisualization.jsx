import React from 'react';
import { Box, Grid, Typography, useTheme, useMediaQuery } from '@mui/material';

const WellPlateVisualization = ({ data, onWellClick, onWellDragOver, onWellDrop, selectedWells }) => {
  const theme = useTheme();
  const isMobile = false; // Temporarily disabled
  const isSmallMobile = false; // Temporarily disabled
  
  const cols = Array.from({ length: 12 }, (_, i) => i + 1);
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  
  // Responsive well sizing
  const wellSize = isSmallMobile ? 25 : isMobile ? 30 : 40;
  const fontSize = isSmallMobile ? '0.6rem' : isMobile ? '0.7rem' : '0.8rem';
  const spacing = isSmallMobile ? 0.25 : isMobile ? 0.3 : 0.5;

  const getWellColor = (wellId) => {
    if (selectedWells?.includes(wellId)) return '#0D488F';
    switch (data?.[wellId]?.type) {
      case 'Allelic Ladder': return '#90caf9';
      case 'Positive Control': return '#81c784';
      case 'Negative Control': return '#ef5350';
      case 'Sample':
      case 'sample': return '#ffb74d';
      default: return '#ffffff';
    }
  };

  const wellStyles = {
    width: `${wellSize}px`,
    height: `${wellSize}px`,
    border: '1px solid #000',
    borderRadius: '50%',
    margin: `${spacing * 4}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: fontSize,
    transition: 'all 0.2s',
    minWidth: '24px', // Ensure minimum touch target
    minHeight: '24px',
    '&:hover': {
      transform: isMobile ? 'none' : 'scale(1.1)', // Disable hover effects on mobile
      boxShadow: 1
    },
    '&:active': {
      transform: 'scale(0.95)', // Touch feedback
    }
  };

  return (
    <Box sx={{ 
      border: '2px solid #000',
      borderRadius: 2,
      p: { xs: 1, sm: 2, md: 4 }, // Responsive padding
      bgcolor: '#ffffff',
      width: '100%',
      maxWidth: '1200px',
      mx: 'auto',
      overflowX: 'auto', // Allow horizontal scrolling on very small screens
      minWidth: isSmallMobile ? '350px' : 'auto'
    }}>
      {/* Title */}
      <Typography variant="h6" align="center" sx={{ mb: 3 }}>
        96 Well Plate Map
      </Typography>

      <Grid container spacing={spacing}>
        {/* Column Numbers */}
        <Grid item xs={0.8}></Grid>
        {cols.map(col => (
          <Grid item xs={0.9} key={col}>
            <Typography align="center" sx={{ 
              fontWeight: 'bold',
              fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.9rem' },
              mb: { xs: 0.5, md: 1 }
            }}>
              {col}
            </Typography>
          </Grid>
        ))}

        {/* Rows and Wells */}
        {rows.map(row => (
          <React.Fragment key={row}>
            {/* Row Letter */}
            <Grid item xs={0.8}>
              <Typography sx={{ 
                fontWeight: 'bold',
                fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.9rem' },
                textAlign: 'center',
                lineHeight: `${wellSize}px`
              }}>
                {row}
              </Typography>
            </Grid>
            {/* Wells */}
            {cols.map(col => {
              const wellId = `${row}${col.toString().padStart(2, '0')}`;
              return (
                <Grid item xs={0.9} key={wellId}>
                  <Box
                    onClick={() => onWellClick?.(wellId)}
                    onDragOver={onWellDragOver}
                    onDrop={(e) => onWellDrop?.(e, wellId)}
                    sx={{ ...wellStyles, bgcolor: getWellColor(wellId) }}
                  >
                    {data?.[wellId]?.label || ''}
                  </Box>
                </Grid>
              );
            })}
          </React.Fragment>
        ))}
      </Grid>
    </Box>
  );
};

export default WellPlateVisualization; 