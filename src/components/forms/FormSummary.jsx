const FormSummary = ({ formData, onEdit }) => {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Review Information
      </Typography>
      
      {/* Test Information */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" color="primary">
          Test Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="textSecondary">
              Reference Kit Number
            </Typography>
            <Typography>{formData.refKitNumber}</Typography>
          </Grid>
          {/* Add more fields */}
        </Grid>
      </Box>

      {/* Mother Information */}
      {!formData.motherNotAvailable && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" color="primary">
            Mother Information
          </Typography>
          <Grid container spacing={2}>
            {/* Add mother fields */}
          </Grid>
        </Box>
      )}

      {/* Similar sections for Father and Additional Info */}
    </Paper>
  );
}; 