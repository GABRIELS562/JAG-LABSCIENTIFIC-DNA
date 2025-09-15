import React from 'react';
import {
  Box,
  CircularProgress,
  Skeleton,
  Typography,
  LinearProgress,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Backdrop
} from '@mui/material';

// Basic loading spinner
export const LoadingSpinner = ({ 
  size = 40, 
  color = 'primary', 
  message = 'Loading...',
  showMessage = true 
}) => (
  <Box 
    display="flex" 
    flexDirection="column" 
    alignItems="center" 
    justifyContent="center" 
    p={3}
  >
    <CircularProgress size={size} color={color} />
    {showMessage && (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        {message}
      </Typography>
    )}
  </Box>
);

// Inline loading spinner for buttons and small spaces
export const InlineLoader = ({ size = 20, color = 'inherit' }) => (
  <CircularProgress size={size} color={color} sx={{ mr: 1 }} />
);

// Full screen loading overlay
export const FullScreenLoader = ({ 
  message = 'Loading...', 
  open = true,
  backdrop = true 
}) => {
  const LoaderContent = (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
    >
      <CircularProgress size={60} />
      <Typography variant="h6" sx={{ mt: 2 }}>
        {message}
      </Typography>
    </Box>
  );

  if (backdrop) {
    return (
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={open}
      >
        <Box textAlign="center">
          <CircularProgress size={60} color="inherit" />
          <Typography variant="h6" sx={{ mt: 2 }}>
            {message}
          </Typography>
        </Box>
      </Backdrop>
    );
  }

  return open ? LoaderContent : null;
};

// Progress bar for operations with known progress
export const ProgressLoader = ({ 
  progress = 0, 
  message = 'Processing...', 
  showPercentage = true 
}) => (
  <Box sx={{ width: '100%', p: 2 }}>
    <Typography variant="body2" color="text.secondary" gutterBottom>
      {message}
      {showPercentage && ` (${Math.round(progress)}%)`}
    </Typography>
    <LinearProgress 
      variant="determinate" 
      value={progress} 
      sx={{ height: 8, borderRadius: 4 }}
    />
  </Box>
);

// Skeleton loaders for different content types
export const TextSkeleton = ({ lines = 3, height = 20 }) => (
  <Box>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={index}
        variant="text"
        height={height}
        width={index === lines - 1 ? '70%' : '100%'}
        sx={{ mb: 0.5 }}
      />
    ))}
  </Box>
);

export const CardSkeleton = ({ height = 200 }) => (
  <Card>
    <CardContent>
      <Skeleton variant="text" height={30} width="60%" />
      <Skeleton variant="text" height={20} width="40%" sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={height - 100} />
    </CardContent>
  </Card>
);

export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <Table>
    <TableHead>
      <TableRow>
        {Array.from({ length: columns }).map((_, index) => (
          <TableCell key={index}>
            <Skeleton variant="text" height={30} />
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
    <TableBody>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton variant="text" height={25} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

export const GridSkeleton = ({ items = 6, columns = 3 }) => (
  <Grid container spacing={2}>
    {Array.from({ length: items }).map((_, index) => (
      <Grid item xs={12} sm={6} md={12 / columns} key={index}>
        <CardSkeleton />
      </Grid>
    ))}
  </Grid>
);

// Well plate loading skeleton
export const PlateSkeleton = () => (
  <Box>
    <Skeleton variant="text" height={40} width="30%" sx={{ mb: 2 }} />
    <Grid container spacing={0.5}>
      {Array.from({ length: 96 }).map((_, index) => (
        <Grid item key={index} xs={1}>
          <Skeleton 
            variant="circular" 
            width={30} 
            height={30} 
            sx={{ borderRadius: '4px' }}
          />
        </Grid>
      ))}
    </Grid>
  </Box>
);

// Sample list skeleton
export const SampleListSkeleton = ({ count = 5 }) => (
  <Box>
    {Array.from({ length: count }).map((_, index) => (
      <Card key={index} sx={{ mb: 1 }}>
        <CardContent sx={{ py: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" height={25} width="40%" />
              <Skeleton variant="text" height={20} width="60%" />
            </Box>
            <Skeleton variant="rectangular" width={80} height={25} />
          </Box>
        </CardContent>
      </Card>
    ))}
  </Box>
);

// Loading state wrapper component
export const LoadingWrapper = ({ 
  loading, 
  error, 
  children, 
  skeleton,
  errorComponent,
  loadingComponent
}) => {
  if (loading) {
    if (loadingComponent) {
      return loadingComponent;
    }
    if (skeleton) {
      return skeleton;
    }
    return <LoadingSpinner />;
  }

  if (error) {
    if (errorComponent) {
      return errorComponent;
    }
    return (
      <Box p={2} textAlign="center">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return children;
};

// Higher-order component for adding loading states
export const withLoading = (Component, LoadingComponent = LoadingSpinner) => {
  return ({ loading, ...props }) => {
    if (loading) {
      return <LoadingComponent />;
    }
    return <Component {...props} />;
  };
};

export default LoadingWrapper;