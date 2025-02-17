import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardContent
} from '@mui/material';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title
} from 'chart.js';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, Title);

const Statistics = () => {
  const [timeFrame, setTimeFrame] = useState('day');

  const dailyData = {
    labels: ['Pending', 'In Progress', 'Completed'],
    datasets: [{
      data: [4, 2, 6],
      backgroundColor: [
        '#ffa726', // Orange for Pending
        '#29b6f6', // Blue for In Progress
        '#66bb6a'  // Green for Completed
      ]
    }]
  };

  const monthlyData = {
    labels: ['Pending', 'In Progress', 'Completed'],
    datasets: [{
      data: [15, 8, 45],
      backgroundColor: [
        '#ffa726',
        '#29b6f6',
        '#66bb6a'
      ]
    }]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom'
      },
      title: {
        display: true,
        text: `Sample Status Distribution (${timeFrame === 'day' ? 'Today' : 'This Month'})`
      }
    }
  };

  const summaryData = timeFrame === 'day' ? {
    total: 12,
    pending: 4,
    inProgress: 2,
    completed: 6
  } : {
    total: 68,
    pending: 15,
    inProgress: 8,
    completed: 45
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper elevation={2} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
          <Typography variant="h5" sx={{ color: '#1e4976', fontWeight: 'bold' }}>
            Statistics Dashboard
          </Typography>
          
          <ToggleButtonGroup
            value={timeFrame}
            exclusive
            onChange={(e, newValue) => newValue && setTimeFrame(newValue)}
            size="small"
          >
            <ToggleButton value="day">Daily</ToggleButton>
            <ToggleButton value="month">Monthly</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Box sx={{ height: 400 }}>
              <Pie 
                data={timeFrame === 'day' ? dailyData : monthlyData}
                options={chartOptions}
              />
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Samples
                    </Typography>
                    <Typography variant="h4">
                      {summaryData.total}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card sx={{ bgcolor: '#fff3e0' }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Pending
                    </Typography>
                    <Typography variant="h4">
                      {summaryData.pending}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card sx={{ bgcolor: '#e1f5fe' }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      In Progress
                    </Typography>
                    <Typography variant="h4">
                      {summaryData.inProgress}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card sx={{ bgcolor: '#e8f5e9' }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Completed
                    </Typography>
                    <Typography variant="h4">
                      {summaryData.completed}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default Statistics; 