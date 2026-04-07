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

const Signup = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();
    const normalizedConfirmPassword = confirmPassword.trim();

    if (!normalizedUsername || !normalizedEmail || !normalizedPassword || !normalizedConfirmPassword) {
      setError('Please fill all fields.');
      return;
    }

    if (normalizedPassword !== normalizedConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      await signup(normalizedUsername, normalizedEmail, normalizedPassword);
      navigate('/profile');
    } catch (err) {
      const isNetworkError = err.message === 'Network Error';
      if (isNetworkError) {
        setError('Cannot reach the backend right now. Check your connection and try again.');
        return;
      }

      setError(
        err.response?.data?.detail
          || err.message
          || 'Unable to create account right now. Please try again.',
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
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.95fr 1.05fr' } }}>
            <CardContent sx={{ p: { xs: 4, md: 5 } }}>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Create Account
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Start using analysis history, profile tracking, and the health chatbot.
              </Typography>

              {error && (
                <Alert
                  severity="error"
                  sx={{ mb: 2, '& .MuiAlert-message': { width: '100%' } }}
                >
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  margin="normal"
                  label="Username"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    if (error) setError('');
                  }}
                  required
                />
                <TextField
                  fullWidth
                  margin="normal"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
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
                <TextField
                  fullWidth
                  margin="normal"
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    if (error) setError('');
                  }}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowConfirmPassword((value) => !value)} edge="end">
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
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
                  {submitting ? 'Creating account...' : 'Signup'}
                </Button>
              </Box>

              <Typography variant="body2" sx={{ mt: 2 }}>
                Already have an account?{' '}
                <Typography component={Link} to="/login" color="primary" sx={{ textDecoration: 'none' }}>
                  Login
                </Typography>
              </Typography>
            </CardContent>

            <Box
              sx={{
                p: { xs: 4, md: 6 },
                background: 'linear-gradient(160deg, rgba(16,45,84,0.82) 0%, rgba(9,116,140,0.42) 100%)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                borderLeft: { md: '1px solid rgba(58,125,203,0.35)' },
              }}
            >
              <Typography variant="overline" sx={{ letterSpacing: 1.8, color: '#47c2ff' }}>
                New to Expluse
              </Typography>
              <Typography variant="h3" sx={{ mt: 1, mb: 2, color: '#dfe9ff' }}>
                Build your personal health dashboard.
              </Typography>
              <Typography sx={{ color: 'rgba(216,232,255,0.85)', maxWidth: 460, lineHeight: 1.8 }}>
                Create an account to save your analyses, revisit your history, view profile details, and use the assistant whenever you need guidance.
              </Typography>
            </Box>
          </Box>
        </Card>
      </motion.div>
    </Container>
  );
};

export default Signup;
