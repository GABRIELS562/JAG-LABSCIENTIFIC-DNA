import React from 'react';
import { Box, Button, CircularProgress } from '@mui/material';

const FormNavigation = ({ onNext, onBack, isLastStep, isSubmitting }) => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
      <Button
        variant="outlined"
        onClick={onBack}
        disabled={isSubmitting}
      >
        Back
      </Button>
      <Button
        variant="contained"
        onClick={onNext}
        disabled={isSubmitting}
      >
        {isLastStep ? (
          isSubmitting ? <CircularProgress size={24} /> : 'Submit'
        ) : (
          'Next'
        )}
      </Button>
    </Box>
  );
};

export default FormNavigation; 