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
} from '@mui/material';
import { Search, Print, Download } from '@mui/icons-material';

const Reports = () => {
  const [searchQuery, setSearchQuery] = useState('');
  // Dummy data - replace with actual data from your backend
  const reportData = {
    childDetails: {
      labNo: '2024_001',
      name: 'John',
      surname: 'Doe',
      idDob: 'ID123456',
      collectionDate: '2024-01-15',
    },
    fatherDetails: {
      labNo: '2024_002',
      name: 'Mike',
      surname: 'Doe',
      idDob: 'ID789012',
      collectionDate: '2024-01-15',
    },
    additionalInfo: {
      submissionDate: '2024-01-15',
      motherPresent: 'NO',
      emailContact: 'john@example.com',
      phoneContact: '1234567890',
      addressArea: '123 Street, City',
      comments: 'Standard paternity test',
    }
  };

  const ReportSection = ({ title, data }) => (
    <TableContainer component={Paper} elevation={0} sx={{ mb: 3 }}>
      <Typography variant="h6" sx={{ color: '#1e4976', mb: 2, px: 2, pt: 2 }}>
        {title}
      </Typography>
      <Table>
        <TableBody>
          {Object.entries(data).map(([key, value]) => (
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
              <TableCell>{value}</TableCell>
            </TableRow>
          ))}
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
          placeholder="Search by Lab No, Name, or ID..."
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
            <ReportSection title="Child Details" data={reportData.childDetails} />
          </Grid>

          <Grid item xs={12}>
            <ReportSection title="Father Details" data={reportData.fatherDetails} />
          </Grid>

          <Grid item xs={12}>
            <ReportSection title="Additional Information" data={reportData.additionalInfo} />
          </Grid>

          {/* Results Section - Add your actual results structure here */}
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