import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

/**
 * ProtectedRoute component that handles authentication and authorization
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The component to render if authorized
 * @param {string|string[]} props.roles - Required role(s) to access the route
 * @param {string} props.redirectTo - Where to redirect if not authenticated (default: '/login')
 * @param {boolean} props.requireAuth - Whether authentication is required (default: true)
 * @param {React.ReactNode} props.fallback - Custom loading component
 * @param {React.ReactNode} props.unauthorizedFallback - Custom unauthorized component
 */
const ProtectedRoute = ({ 
  children, 
  roles = null, 
  redirectTo = '/login',
  requireAuth = true,
  fallback = null,
  unauthorizedFallback = null
}) => {
  const { user, loading, isAuthenticated, hasRole, error } = useAuth();
  const location = useLocation();

  // Show loading state while auth is being determined
  if (loading) {
    return fallback || (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="50vh"
        gap={2}
      >
        <CircularProgress size={40} />
        <Typography variant="body1" color="text.secondary">
          Verifying authentication...
        </Typography>
      </Box>
    );
  }

  // Show error state if there's an authentication error
  if (error && requireAuth) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="50vh"
        gap={2}
        p={3}
      >
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          <Typography variant="h6" gutterBottom>
            Authentication Error
          </Typography>
          <Typography variant="body2">
            {error}
          </Typography>
        </Alert>
      </Box>
    );
  }

  // Check if authentication is required
  if (requireAuth && !isAuthenticated()) {
    // Redirect to login with the current location so we can redirect back after login
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // Check role-based authorization if roles are specified
  if (roles && user) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    const userHasRequiredRole = allowedRoles.some(role => hasRole(role));

    if (!userHasRequiredRole) {
      return unauthorizedFallback || (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="50vh"
          gap={2}
          p={3}
        >
          <Alert severity="warning" sx={{ maxWidth: 400 }}>
            <Typography variant="h6" gutterBottom>
              Access Denied
            </Typography>
            <Typography variant="body2" gutterBottom>
              You don't have permission to access this page.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Required role(s): {allowedRoles.join(', ')}
              <br />
              Your role: {user?.role || 'Unknown'}
            </Typography>
          </Alert>
        </Box>
      );
    }
  }

  // All checks passed, render the protected content
  return children;
};

// Higher-order component for wrapping components with protection
export const withProtection = (Component, options = {}) => {
  return function ProtectedComponent(props) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
};

// Specific role-based protection components for common use cases
export const StaffOnlyRoute = ({ children, ...props }) => (
  <ProtectedRoute roles={['staff']} {...props}>
    {children}
  </ProtectedRoute>
);

export const ClientOnlyRoute = ({ children, ...props }) => (
  <ProtectedRoute roles={['client']} {...props}>
    {children}
  </ProtectedRoute>
);

export const AnyAuthenticatedRoute = ({ children, ...props }) => (
  <ProtectedRoute roles={['staff', 'client']} {...props}>
    {children}
  </ProtectedRoute>
);

export default ProtectedRoute;