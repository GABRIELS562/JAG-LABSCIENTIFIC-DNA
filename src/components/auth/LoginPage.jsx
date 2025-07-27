import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
  Grid,
  Paper,
  Container
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  Science as ScienceIcon,
  Security as SecurityIcon,
  Person as PersonIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export default function LoginPage() {
  const { login, loading, error, clearError, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState('username'); // 'username' or 'email'
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Clear errors when input changes
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [formData, clearError, error]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field-specific errors
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (loginMode === 'username') {
      if (!formData.username.trim()) {
        errors.username = 'Username is required';
      } else if (formData.username.length < 3) {
        errors.username = 'Username must be at least 3 characters';
      }
    } else {
      if (!formData.username.trim()) {
        errors.username = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.username)) {
        errors.username = 'Please enter a valid email address';
      }
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const credentials = {
        password: formData.password
      };

      // Add username or email based on login mode
      if (loginMode === 'username') {
        credentials.username = formData.username.trim();
      } else {
        credentials.email = formData.username.trim();
      }

      const result = await login(credentials);

      if (result.success) {
        // Redirect to intended page or dashboard
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error('Login submission error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const handleToggleLoginMode = () => {
    setLoginMode(prev => prev === 'username' ? 'email' : 'username');
    setFormData(prev => ({ ...prev, username: '' }));
    setFormErrors({});
  };

  const isFormValid = formData.username.trim() && formData.password.length >= 6;

  return (
    <Container maxWidth="sm" sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      py: 4
    }}>
      <Paper elevation={8} sx={{ 
        width: '100%', 
        borderRadius: 3,
        overflow: 'hidden'
      }}>
        {/* Header */}
        <Box sx={{ 
          background: 'linear-gradient(135deg, #0D488F 0%, #1e4976 100%)',
          color: 'white',
          p: 4,
          textAlign: 'center'
        }}>
          <ScienceIcon sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
            🧬 LabDNA LIMS
          </Typography>
          <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
            Laboratory Information Management System
          </Typography>
        </Box>

        <CardContent sx={{ p: 4 }}>
          {/* Login Mode Toggle */}
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
              Welcome Back
            </Typography>
            <Button
              variant="text"
              onClick={handleToggleLoginMode}
              sx={{ textTransform: 'none' }}
            >
              {loginMode === 'username' 
                ? 'Login with email instead' 
                : 'Login with username instead'
              }
            </Button>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Username/Email Field */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="username"
                  label={loginMode === 'username' ? 'Username' : 'Email Address'}
                  value={formData.username}
                  onChange={handleInputChange}
                  error={!!formErrors.username}
                  helperText={formErrors.username}
                  disabled={loading || submitting}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {loginMode === 'username' ? (
                          <PersonIcon color="action" />
                        ) : (
                          <EmailIcon color="action" />
                        )}
                      </InputAdornment>
                    ),
                  }}
                  placeholder={
                    loginMode === 'username' 
                      ? 'Enter your username' 
                      : 'Enter your email address'
                  }
                />
              </Grid>

              {/* Password Field */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  label="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  error={!!formErrors.password}
                  helperText={formErrors.password}
                  disabled={loading || submitting}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SecurityIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={handleTogglePasswordVisibility}
                          edge="end"
                          disabled={loading || submitting}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  placeholder="Enter your password"
                />
              </Grid>

              {/* Submit Button */}
              <Grid item xs={12}>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={!isFormValid || loading || submitting}
                  startIcon={
                    (loading || submitting) ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <LoginIcon />
                    )
                  }
                  sx={{
                    py: 1.5,
                    background: 'linear-gradient(135deg, #0D488F 0%, #1e4976 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #1e4976 0%, #0D488F 100%)',
                    },
                    '&:disabled': {
                      background: '#ccc',
                    }
                  }}
                >
                  {(loading || submitting) ? 'Signing In...' : 'Sign In'}
                </Button>
              </Grid>
            </Grid>
          </form>

          <Divider sx={{ my: 3 }} />

          {/* Footer Info */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Secure access to your laboratory data
            </Typography>
            <Typography variant="caption" color="text.secondary">
              For technical support, contact your system administrator
            </Typography>
          </Box>
        </CardContent>
      </Paper>
    </Container>
  );
}