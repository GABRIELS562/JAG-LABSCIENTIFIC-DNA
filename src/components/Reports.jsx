import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Typography,
  Grid,
  Divider,
  IconButton,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Chip
} from '@mui/material';
import { Search, Print, Download } from '@mui/icons-material';

const Reports = () => {
  const [searchQuery, setSearchQuery] = useState('');
  // Updated dummy data to match new structure
  const reportData = {
    testInfo: {
      refKitNumber: 'KIT2024001',
      submissionDate: '2024-01-15',
    },
    childDetails: {
      labNo: '2024_001',
      name: 'John',
      surname: 'Doe',
      idDob: 'ID123456',
      collectionDate: '2024-01-15',
    },
    motherDetails: {
      labNo: '2024_002',
      name: 'Jane',
      surname: 'Doe',
      idDob: 'ID789012',
      collectionDate: '2024-01-15',
      email: 'jane.doe@example.com'
    },
    fatherDetails: {
      labNo: '2024_003',
      name: 'Mike',
      surname: 'Smith',
      idDob: 'ID345678',
      collectionDate: '2024-01-15',
      email: 'mike.smith@example.com',
      notTested: false
    },
    additionalInfo: {
      motherPresent: 'YES',
      emailContact: 'contact@example.com',
      phoneContact: '1234567890',
      addressArea: '123 Street, City',
      comments: 'Standard paternity test'
    }
  };

  const ReportSection = ({ title, data, isParentSection = false }) => (
    <TableContainer component={Paper} elevation={0} sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, pt: 2 }}>
        <Typography variant="h6" sx={{ color: '#1e4976', mb: 2 }}>
          {title}
        </Typography>
        {isParentSection && data.notTested && (
          <Chip 
            label="NOT TESTED" 
            color="error" 
            variant="outlined" 
            sx={{ mb: 2 }}
          />
        )}
      </Box>
      <Table>
        <TableBody>
          {Object.entries(data).map(([key, value]) => {
            // Skip displaying the notTested field
            if (key === 'notTested') return null;
            
            return (
              <TableRow key={key}>
                <TableCell 
                  component="th" 
                  scope="row"
                  sx={{ 
                    width: '30%',
                    backgroundColor: 'rgba(30, 73, 118, 0.05)',
                    fontWeight: 'medium'
                  }}
                >
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </TableCell>
                <TableCell>{value?.toString() || 'N/A'}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Search Section */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: 2, 
          mb: 3, 
          display: 'flex', 
          alignItems: 'center',
          gap: 2
        }}
      >
        <TextField
          fullWidth
          placeholder="Search by Kit No, Lab No, Name, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
        <IconButton title="Print Report">
          <Print />
        </IconButton>
        <IconButton title="Download Report">
          <Download />
        </IconButton>
      </Paper>

      {/* Report Display */}
      <Paper elevation={2} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h5" sx={{ color: '#1e4976', fontWeight: 'bold' }}>
            Paternity Test Report
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Report Date: {new Date().toLocaleDateString()}
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <ReportSection title="Test Information" data={reportData.testInfo} />
          </Grid>

          <Grid item xs={12}>
            <ReportSection title="Child Details" data={reportData.childDetails} />
          </Grid>

          <Grid item xs={12}>
            <ReportSection title="Mother Details" data={reportData.motherDetails} isParentSection />
          </Grid>

          <Grid item xs={12}>
            <ReportSection title="Alleged Father Details" data={reportData.fatherDetails} isParentSection />
          </Grid>

          <Grid item xs={12}>
            <ReportSection title="Additional Information" data={reportData.additionalInfo} />
          </Grid>

          {/* Results Section */}
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'rgba(30, 73, 118, 0.05)' }}>
              <Typography variant="h6" sx={{ color: '#1e4976', mb: 2 }}>
                Test Results
              </Typography>
              <Typography variant="body1">
                Results pending...
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default Reports;