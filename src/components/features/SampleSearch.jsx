import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  InputAdornment,
  Chip
} from '@mui/material';
import { Search } from '@mui/icons-material';

const SampleSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dummy data
  const sampleData = [
    {
      labNo: '2024_001',
      name: 'John',
      surname: 'Doe',
      submissionDate: '2024-02-15',
      status: 'Pending',
      type: 'Paternity'
    },
    {
      labNo: '2024_002',
      name: 'Jane',
      surname: 'Smith',
      submissionDate: '2024-02-14',
      status: 'Completed',
      type: 'Paternity'
    },
    {
      labNo: '2024_003',
      name: 'Mike',
      surname: 'Johnson',
      submissionDate: '2024-02-13',
      status: 'In Progress',
      type: 'Relationship'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'success';
      case 'Pending': return 'warning';
      case 'In Progress': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper elevation={2} sx={{ p: 4 }}>
        <Typography variant="h5" sx={{ mb: 4, color: '#1e4976', fontWeight: 'bold' }}>
          Sample Search
        </Typography>

        <Box sx={{ mb: 4 }}>
          <TextField
            fullWidth
            placeholder="Search by Lab Number, Name, or Surname..."
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
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Lab No</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Surname</TableCell>
                <TableCell>Submission Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sampleData.map((sample) => (
                <TableRow key={sample.labNo}>
                  <TableCell>{sample.labNo}</TableCell>
                  <TableCell>{sample.name}</TableCell>
                  <TableCell>{sample.surname}</TableCell>
                  <TableCell>{sample.submissionDate}</TableCell>
                  <TableCell>{sample.type}</TableCell>
                  <TableCell>
                    <Chip 
                      label={sample.status}
                      color={getStatusColor(sample.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined">
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default SampleSearch; 