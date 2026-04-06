import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const useDemoLogin = () => {
    setIdentity('demo');
    setPassword('demo123');
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const normalizedIdentity = identity.trim();
    const normalizedPassword = password.trim();

    if (!normalizedIdentity || !normalizedPassword) {
      setError('Please enter username/email and password.');
      return;
    }

    setSubmitting(true);

    try {
      await login(normalizedIdentity, normalizedPassword);
      navigate('/profile');
    } catch (err) {
      setError(
        err.response?.data?.detail
          || (err.message === 'Network Error'
            ? 'Backend server is not running on port 8000. Start FastAPI and try again.'
            : err.message)
          || 'Unable to login. Please make sure the backend server is running and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card
          elevation={0}
          sx={{
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid rgba(58,125,203,0.35)',
            background: 'linear-gradient(160deg, rgba(5,15,30,0.96) 0%, rgba(7,19,37,0.96) 100%)',
            boxShadow: '0 30px 80px rgba(4, 12, 24, 0.55)',
          }}
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.05fr 0.95fr' } }}>
            <Box
              sx={{
                p: { xs: 4, md: 6 },
                background: 'linear-gradient(160deg, rgba(16,45,84,0.82) 0%, rgba(9,116,140,0.42) 100%)',
                color: '#fff',
                borderRight: { md: '1px solid rgba(58,125,203,0.35)' },
              }}
            >
              <Typography variant="overline" sx={{ letterSpacing: 1.8, opacity: 0.75 }}>
                Welcome Back
              </Typography>
              <Typography variant="h3" sx={{ mt: 1, mb: 2 }}>
                Access your Expluse dashboard.
              </Typography>
              <Typography sx={{ opacity: 0.9, maxWidth: 460, lineHeight: 1.8 }}>
                Review your profile, run a health analysis, check previous reports, and chat with the assistant from one secure account.
              </Typography>
            </Box>

            <CardContent sx={{ p: { xs: 4, md: 5 } }}>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Login
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Enter your username or email and password to continue.
              </Typography>

              <Alert
                severity="info"
                sx={{ mb: 2, '& .MuiAlert-message': { width: '100%' } }}
                action={(
                  <Button color="inherit" size="small" onClick={useDemoLogin}>
                    Use Demo
                  </Button>
                )}
              >
                Quick login: username <strong>demo</strong> and password <strong>demo123</strong>
              </Alert>

              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  margin="normal"
                  label="Username or Email"
                  type="text"
                  value={identity}
                  onChange={(event) => {
                    setIdentity(event.target.value);
                    if (error) setError('');
                  }}
                  required
                />
                <TextField
                  fullWidth
                  margin="normal"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (error) setError('');
                  }}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword((value) => !value)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  fullWidth
                  size="large"
                  variant="contained"
                  type="submit"
                  disabled={submitting}
                  sx={{ mt: 3, borderRadius: 99, py: 1.35, fontWeight: 700 }}
                >
                  {submitting ? 'Signing in...' : 'Login'}
                </Button>
              </Box>

              <Typography variant="body2" sx={{ mt: 2 }}>
                Don&apos;t have an account?{' '}
                <Typography component={Link} to="/signup" color="primary" sx={{ textDecoration: 'none' }}>
                  Sign up
                </Typography>
              </Typography>
            </CardContent>
          </Box>
        </Card>
      </motion.div>
    </Container>
  );
};

export default Login;
