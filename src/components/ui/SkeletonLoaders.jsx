import React from 'react';
import { Box, Card, CardContent, Skeleton, Grid, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';

// Dashboard skeleton loader
export const DashboardSkeleton = () => (
  <Box sx={{ p: 3 }}>
    {/* Header */}
    <Box sx={{ mb: 4 }}>
      <Skeleton variant="text" width="60%" height={40} />
      <Skeleton variant="text" width="40%" height={24} sx={{ mt: 1 }} />
    </Box>

    {/* Stats cards */}
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {[1, 2, 3, 4].map((item) => (
        <Grid item xs={12} sm={6} md={3} key={item}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Box sx={{ ml: 2, flex: 1 }}>
                  <Skeleton variant="text" width="80%" height={20} />
                </Box>
              </Box>
              <Skeleton variant="text" width="60%" height={32} />
              <Skeleton variant="text" width="40%" height={16} />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>

    {/* Chart and table row */}
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="30%" height={24} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" width="100%" height={300} />
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="40%" height={24} sx={{ mb: 2 }} />
            {[1, 2, 3, 4, 5].map((item) => (
              <Box key={item} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Skeleton variant="circular" width={24} height={24} />
                <Box sx={{ ml: 2, flex: 1 }}>
                  <Skeleton variant="text" width="70%" />
                  <Skeleton variant="text" width="50%" height={14} />
                </Box>
                <Skeleton variant="text" width="20%" />
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  </Box>
);

// Table skeleton loader
export const TableSkeleton = ({ rows = 10, columns = 5 }) => (
  <Table>
    <TableHead>
      <TableRow>
        {Array.from({ length: columns }).map((_, index) => (
          <TableCell key={index}>
            <Skeleton variant="text" width="80%" />
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
    <TableBody>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton variant="text" width="60%" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

// Form skeleton loader
export const FormSkeleton = () => (
  <Box sx={{ p: 3 }}>
    <Skeleton variant="text" width="40%" height={32} sx={{ mb: 3 }} />

    {[1, 2, 3, 4, 5].map((item) => (
      <Box key={item} sx={{ mb: 3 }}>
        <Skeleton variant="text" width="20%" height={20} sx={{ mb: 1 }} />
        <Skeleton variant="rectangular" width="100%" height={56} />
      </Box>
    ))}

    <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
      <Skeleton variant="rectangular" width={120} height={36} />
      <Skeleton variant="rectangular" width={100} height={36} />
    </Box>
  </Box>
);

// Card list skeleton loader
export const CardListSkeleton = ({ count = 6 }) => (
  <Grid container spacing={3} sx={{ p: 3 }}>
    {Array.from({ length: count }).map((_, index) => (
      <Grid item xs={12} sm={6} md={4} key={index}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Skeleton variant="circular" width={40} height={40} />
              <Box sx={{ ml: 2, flex: 1 }}>
                <Skeleton variant="text" width="80%" />
                <Skeleton variant="text" width="60%" height={14} />
              </Box>
            </Box>
            <Skeleton variant="text" width="100%" />
            <Skeleton variant="text" width="70%" />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Skeleton variant="rectangular" width={80} height={24} />
              <Skeleton variant="rectangular" width={60} height={24} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

// Detailed item skeleton
export const DetailSkeleton = () => (
  <Box sx={{ p: 3 }}>
    {/* Header */}
    <Box sx={{ mb: 4 }}>
      <Skeleton variant="text" width="50%" height={40} />
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} variant="rectangular" width={80} height={24} />
        ))}
      </Box>
    </Box>

    {/* Content sections */}
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Box sx={{ mb: 4 }}>
          <Skeleton variant="text" width="30%" height={24} sx={{ mb: 2 }} />
          {[1, 2, 3, 4].map((item) => (
            <Box key={item} sx={{ display: 'flex', mb: 2 }}>
              <Skeleton variant="text" width="20%" />
              <Skeleton variant="text" width="40%" sx={{ ml: 2 }} />
            </Box>
          ))}
        </Box>

        <Box>
          <Skeleton variant="text" width="25%" height={24} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" width="100%" height={200} />
        </Box>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="40%" height={24} sx={{ mb: 2 }} />
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <Box key={item} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Skeleton variant="text" width="50%" />
                <Skeleton variant="text" width="30%" />
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  </Box>
);

// Minimal loading component
export const MinimalLoader = ({ size = 40, text = "Loading..." }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '200px',
      gap: 2
    }}
  >
    <Box
      sx={{
        width: size,
        height: size,
        border: '3px solid',
        borderColor: 'primary.light',
        borderTopColor: 'primary.main',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        '@keyframes spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        }
      }}
    />
    {text && (
      <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
        {text}
      </Box>
    )}
  </Box>
);

// Full page skeleton
export const FullPageSkeleton = ({ type = 'dashboard' }) => {
  const components = {
    dashboard: DashboardSkeleton,
    table: () => <TableSkeleton rows={15} columns={6} />,
    form: FormSkeleton,
    cards: () => <CardListSkeleton count={9} />,
    detail: DetailSkeleton
  };

  const Component = components[type] || DashboardSkeleton;

  return (
    <Box sx={{
      minHeight: '100vh',
      backgroundColor: 'background.default',
      animation: 'pulse 1.5s ease-in-out infinite alternate',
      '@keyframes pulse': {
        '0%': { opacity: 1 },
        '100%': { opacity: 0.7 }
      }
    }}>
      <Component />
    </Box>
  );
};

export default {
  DashboardSkeleton,
  TableSkeleton,
  FormSkeleton,
  CardListSkeleton,
  DetailSkeleton,
  MinimalLoader,
  FullPageSkeleton
};