import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  Backdrop,
  CircularProgress,
  LinearProgress,
  Box,
  Typography,
  Fade,
  Skeleton,
  Card,
  CardContent,
  Grid,
  Alert,
  Button
} from '@mui/material';
import { keyframes } from '@mui/system';

// Loading context for global state management
const LoadingContext = createContext();

// Loading states enum
export const LoadingStates = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  RETRY: 'retry'
};

// Pulse animation
const pulse = keyframes`
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
  100% {
    opacity: 1;
  }
`;

/**
 * Loading Provider Component
 */
export const LoadingProvider = ({ children }) => {
  const [loadingStates, setLoadingStates] = useState(new Map());
  const [globalLoading, setGlobalLoading] = useState(false);

  const setLoading = (key, state, options = {}) => {
    setLoadingStates(prev => {
      const newMap = new Map(prev);
      if (state === LoadingStates.IDLE) {
        newMap.delete(key);
      } else {
        newMap.set(key, { state, ...options });
      }
      return newMap;
    });
  };

  const getLoading = (key) => {
    return loadingStates.get(key) || { state: LoadingStates.IDLE };
  };

  const isAnyLoading = () => {
    return Array.from(loadingStates.values()).some(
      item => item.state === LoadingStates.LOADING
    );
  };

  const setGlobalLoadingState = (loading) => {
    setGlobalLoading(loading);
  };

  return (
    <LoadingContext.Provider value={{
      loadingStates,
      setLoading,
      getLoading,
      isAnyLoading,
      globalLoading,
      setGlobalLoadingState
    }}>
      {children}
    </LoadingContext.Provider>
  );
};

/**
 * Hook to use loading context
 */
export const useLoading = (key) => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }

  const { setLoading, getLoading } = context;

  const startLoading = (options = {}) => {
    setLoading(key, LoadingStates.LOADING, options);
  };

  const stopLoading = () => {
    setLoading(key, LoadingStates.IDLE);
  };

  const setSuccess = (options = {}) => {
    setLoading(key, LoadingStates.SUCCESS, options);
    setTimeout(() => stopLoading(), options.duration || 2000);
  };

  const setError = (options = {}) => {
    setLoading(key, LoadingStates.ERROR, options);
  };

  const retry = () => {
    setLoading(key, LoadingStates.RETRY);
  };

  return {
    ...getLoading(key),
    startLoading,
    stopLoading,
    setSuccess,
    setError,
    retry,
    isLoading: getLoading(key).state === LoadingStates.LOADING
  };
};

/**
 * Global Loading Backdrop
 */
export const GlobalLoadingBackdrop = () => {
  const { globalLoading } = useContext(LoadingContext) || {};

  return (
    <Backdrop
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        display: 'flex',
        flexDirection: 'column'
      }}
      open={globalLoading}
    >
      <CircularProgress color="inherit" size={60} />
      <Typography variant="h6" sx={{ mt: 2 }}>
        Loading...
      </Typography>
    </Backdrop>
  );
};

/**
 * Enhanced Loading Spinner with customizable appearance
 */
export const LoadingSpinner = ({
  size = 40,
  message = 'Loading...',
  variant = 'circular',
  color = 'primary',
  fullScreen = false,
  transparent = false,
  showMessage = true
}) => {
  const content = (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      p={2}
    >
      {variant === 'circular' ? (
        <CircularProgress size={size} color={color} />
      ) : (
        <Box sx={{ width: '100%', maxWidth: 300 }}>
          <LinearProgress color={color} />
        </Box>
      )}
      {showMessage && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1, textAlign: 'center' }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );

  if (fullScreen) {
    return (
      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: transparent ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.7)'
        }}
        open={true}
      >
        {content}
      </Backdrop>
    );
  }

  return content;
};

/**
 * Progress Bar with percentage
 */
export const ProgressBar = ({
  value = 0,
  label = '',
  variant = 'determinate',
  color = 'primary',
  showPercentage = true,
  height = 8
}) => {
  return (
    <Box sx={{ width: '100%' }}>
      {label && (
        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          {showPercentage && (
            <Typography variant="body2" color="text.secondary">
              {Math.round(value)}%
            </Typography>
          )}
        </Box>
      )}
      <LinearProgress
        variant={variant}
        value={value}
        color={color}
        sx={{ height, borderRadius: height / 2 }}
      />
    </Box>
  );
};

/**
 * Skeleton Loader for different content types
 */
export const SkeletonLoader = ({
  type = 'text',
  count = 1,
  height = 20,
  width = '100%',
  variant = 'rectangular'
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'table':
        return (
          <Box>
            {Array.from({ length: count }, (_, index) => (
              <Box key={index} display="flex" gap={1} mb={1}>
                <Skeleton variant="circular" width={40} height={40} />
                <Box flexGrow={1}>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" />
                </Box>
                <Skeleton variant="text" width="20%" />
              </Box>
            ))}
          </Box>
        );

      case 'card':
        return (
          <Grid container spacing={2}>
            {Array.from({ length: count }, (_, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card>
                  <CardContent>
                    <Skeleton variant="text" width="60%" height={24} />
                    <Skeleton variant="text" width="100%" />
                    <Skeleton variant="text" width="80%" />
                    <Box mt={2}>
                      <Skeleton variant="rectangular" height={100} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        );

      case 'list':
        return (
          <Box>
            {Array.from({ length: count }, (_, index) => (
              <Box key={index} display="flex" alignItems="center" gap={2} mb={2}>
                <Skeleton variant="circular" width={40} height={40} />
                <Box flexGrow={1}>
                  <Skeleton variant="text" width="70%" />
                  <Skeleton variant="text" width="50%" />
                </Box>
              </Box>
            ))}
          </Box>
        );

      default:
        return Array.from({ length: count }, (_, index) => (
          <Skeleton
            key={index}
            variant={variant}
            width={width}
            height={height}
            sx={{ mb: 1 }}
          />
        ));
    }
  };

  return <Box>{renderSkeleton()}</Box>;
};

/**
 * Loading State Component with different states
 */
export const LoadingState = ({
  state = LoadingStates.IDLE,
  loading,
  error,
  retry,
  children,
  loadingComponent,
  errorComponent,
  emptyComponent,
  data
}) => {
  const currentState = state !== LoadingStates.IDLE ? state :
    loading ? LoadingStates.LOADING :
    error ? LoadingStates.ERROR :
    LoadingStates.IDLE;

  const renderContent = () => {
    switch (currentState) {
      case LoadingStates.LOADING:
        return loadingComponent || (
          <LoadingSpinner message="Loading data..." />
        );

      case LoadingStates.ERROR:
        return errorComponent || (
          <Alert
            severity="error"
            action={
              retry && (
                <Button color="inherit" size="small" onClick={retry}>
                  Retry
                </Button>
              )
            }
          >
            {error?.message || 'An error occurred while loading data'}
          </Alert>
        );

      case LoadingStates.SUCCESS:
        if (data && Array.isArray(data) && data.length === 0) {
          return emptyComponent || (
            <Alert severity="info">
              No data available
            </Alert>
          );
        }
        return children;

      default:
        return children;
    }
  };

  return (
    <Fade in={true} timeout={300}>
      <Box>{renderContent()}</Box>
    </Fade>
  );
};

/**
 * Pulsing animation component for loading states
 */
export const PulsingBox = ({ children, isLoading = false, ...props }) => {
  return (
    <Box
      sx={{
        animation: isLoading ? `${pulse} 1.5s ease-in-out infinite` : 'none',
        ...props.sx
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

/**
 * Smart loading wrapper that handles async operations
 */
export const AsyncWrapper = ({
  asyncFunction,
  dependencies = [],
  children,
  loadingComponent,
  errorComponent,
  onSuccess,
  onError
}) => {
  const [state, setState] = useState(LoadingStates.LOADING);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const executeAsync = async () => {
    setState(LoadingStates.LOADING);
    setError(null);

    try {
      const result = await asyncFunction();
      setData(result);
      setState(LoadingStates.SUCCESS);
      if (onSuccess) onSuccess(result);
    } catch (err) {
      setError(err);
      setState(LoadingStates.ERROR);
      if (onError) onError(err);
    }
  };

  useEffect(() => {
    executeAsync();
  }, dependencies);

  return (
    <LoadingState
      state={state}
      data={data}
      error={error}
      retry={executeAsync}
      loadingComponent={loadingComponent}
      errorComponent={errorComponent}
    >
      {typeof children === 'function' ? children(data) : children}
    </LoadingState>
  );
};

export default LoadingSpinner;