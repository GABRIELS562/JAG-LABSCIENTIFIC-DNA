import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Typography,
  Grid,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Tabs,
  Tab,
  IconButton,
  Divider,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment
} from '@mui/material';
import {
  Search,
  Download,
  Print,
  Email,
  FilterList,
  CalendarToday
} from '@mui/icons-material';

const Reports = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedReport, setSelectedReport] = useState(null);
  const [dateRange, setDateRange] = useState('week');

  // Dummy data to match registration form
  const reportsData = [
    {
      labNo: '2024_001',
      testType: 'Paternity Test',
      submissionDate: '2024-02-20',
      status: 'Completed',
      client: {
        name: 'John',
        surname: 'Doe',
        idNumber: '8501015012345',
        contact: '0123456789',
        email: 'john@example.com'
      },
      mother: {
        name: 'Jane',
        surname: 'Doe',
        idNumber: '8601015012345',
        present: true
      },
      child: {
        name: 'Baby',
        surname: 'Doe',
        idNumber: '2301015012345'
      },
      allegedFather: {
        name: 'James',
        surname: 'Smith',
        idNumber: '8401015012345'
      },
      results: {
        probability: '99.99%',
        conclusion: 'Inclusion',
        date: '2024-02-22'
      }
    },
    // Add more dummy reports...
  ];

  const renderSearchSection = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search by Lab Number, Name, or ID..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Date Range</InputLabel>
              <Select
                value={dateRange}
                label="Date Range"
                onChange={(e) => setDateRange(e.target.value)}
              >
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="week">This Week</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
                <MenuItem value="custom">Custom Range</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Test Type</InputLabel>
              <Select
                defaultValue=""
                label="Test Type"
              >
                <MenuItem value="paternity">Paternity Test</MenuItem>
                <MenuItem value="maternity">Maternity Test</MenuItem>
                <MenuItem value="relationship">Relationship Test</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<FilterList />}
            >
              Filter
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderReportsList = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Lab No</TableCell>
            <TableCell>Client Name</TableCell>
            <TableCell>Test Type</TableCell>
            <TableCell>Submission Date</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {reportsData.map((report) => (
            <TableRow 
              key={report.labNo}
              hover
              onClick={() => setSelectedReport(report)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell>{report.labNo}</TableCell>
              <TableCell>{`${report.client.name} ${report.client.surname}`}</TableCell>
              <TableCell>{report.testType}</TableCell>
              <TableCell>{report.submissionDate}</TableCell>
              <TableCell>
                <Chip 
                  label={report.status}
                  color={report.status === 'Completed' ? 'success' : 'warning'}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <IconButton title="Download Report">
                  <Download />
                </IconButton>
                <IconButton title="Print Report">
                  <Print />
                </IconButton>
                <IconButton title="Email Report">
                  <Email />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderReportDetails = () => (
    selectedReport && (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h6">Report Details</Typography>
            <Box>
              <Button
                startIcon={<Download />}
                variant="outlined"
                sx={{ mr: 1 }}
              >
                Download
              </Button>
              <Button
                startIcon={<Print />}
                variant="outlined"
                sx={{ mr: 1 }}
              >
                Print
              </Button>
              <Button
                startIcon={<Email />}
                variant="contained"
              >
                Email
              </Button>
            </Box>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Test Information
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Lab Number
                      </Typography>
                      <Typography variant="body1">
                        {selectedReport.labNo}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Test Type
                      </Typography>
                      <Typography variant="body1">
                        {selectedReport.testType}
                      </Typography>
                    </Grid>
                    {/* Add more test details */}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Client Information
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Name
                      </Typography>
                      <Typography variant="body1">
                        {`${selectedReport.client.name} ${selectedReport.client.surname}`}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        ID Number
                      </Typography>
                      <Typography variant="body1">
                        {selectedReport.client.idNumber}
                      </Typography>
                    </Grid>
                    {/* Add more client details */}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Add sections for Mother, Child, Alleged Father */}
            
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Results
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="textSecondary">
                        Probability
                      </Typography>
                      <Typography variant="body1">
                        {selectedReport.results.probability}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="textSecondary">
                        Conclusion
                      </Typography>
                      <Typography variant="body1">
                        {selectedReport.results.conclusion}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="textSecondary">
                        Date
                      </Typography>
                      <Typography variant="body1">
                        {selectedReport.results.date}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    )
  );

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper elevation={2} sx={{ p: 4 }}>
        <Typography variant="h5" sx={{ mb: 4, color: '#1e4976', fontWeight: 'bold' }}>
          Reports Management
        </Typography>

        {renderSearchSection()}

        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ mb: 3 }}
        >
          <Tab label="All Reports" />
          <Tab label="Completed" />
          <Tab label="Pending" />
          <Tab label="Archived" />
        </Tabs>

        <Grid container spacing={3}>
          <Grid item xs={12} md={selectedReport ? 6 : 12}>
            {renderReportsList()}
          </Grid>
          {selectedReport && (
            <Grid item xs={12} md={6}>
              {renderReportDetails()}
            </Grid>
          )}
        </Grid>
      </Paper>
    </Box>
  );
};

export default Reports;