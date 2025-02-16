import React from 'react';
import { Box, Grid, Typography } from '@mui/material';

const WellPlateVisualization = ({ data, onWellClick, selectedWells }) => {
  const cols = Array.from({ length: 12 }, (_, i) => i + 1);
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  const getWellColor = (wellId) => {
    if (selectedWells?.includes(wellId)) return '#1e4976';
    switch (data?.[wellId]?.type) {
      case 'Allelic Ladder': return '#90caf9';
      case 'Positive Control': return '#81c784';
      case 'Negative Control': return '#ef5350';
      case 'Sample': return '#ffb74d';
      default: return '#ffffff';
    }
  };

  const wellStyles = {
    width: '40px',
    height: '40px',
    border: '1px solid #000',
    borderRadius: '50%',
    margin: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '0.8rem',
    transition: 'all 0.2s',
    '&:hover': {
      transform: 'scale(1.1)',
      boxShadow: 1
    }
  };

  return (
    <Box sx={{ 
      border: '2px solid #000',
      borderRadius: 2,
      p: 4,
      bgcolor: '#ffffff',
      width: '100%',
      maxWidth: '1200px',
      mx: 'auto'
    }}>
      {/* Title */}
      <Typography variant="h6" align="center" sx={{ mb: 3 }}>
        96 Well Plate Map
      </Typography>

      <Grid container spacing={0.5}>
        {/* Column Numbers */}
        <Grid item xs={0.8}></Grid>
        {cols.map(col => (
          <Grid item xs={0.9} key={col}>
            <Typography align="center" sx={{ 
              fontWeight: 'bold',
              fontSize: '0.9rem',
              mb: 1
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
                fontSize: '0.9rem',
                textAlign: 'center',
                lineHeight: '40px'
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