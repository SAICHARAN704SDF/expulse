import React from 'react';
import {
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import { Navigate, Route, Routes } from 'react-router-dom';
import Chatbot from './components/Chatbot';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Signup from './pages/Signup';

const AppLayout = () => {
  const { user } = useAuth();

  const theme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#1ea6ff',
      },
      secondary: {
        main: '#ff6a42',
      },
      background: {
        default: '#040812',
        paper: '#081322',
      },
      text: {
        primary: '#dfebff',
        secondary: '#9cb3d6',
      },
    },
    shape: {
      borderRadius: 18,
    },
    typography: {
      fontFamily: '"Space Grotesk", sans-serif',
      button: {
        fontWeight: 700,
      },
      overline: {
        fontFamily: '"Sora", sans-serif',
      },
      h2: {
        fontWeight: 800,
        fontFamily: '"Sora", sans-serif',
      },
      h3: {
        fontWeight: 800,
        fontFamily: '"Sora", sans-serif',
      },
      h4: {
        fontWeight: 700,
        fontFamily: '"Sora", sans-serif',
      },
      h5: {
        fontWeight: 700,
        fontFamily: '"Sora", sans-serif',
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }}>
        <Navbar darkMode toggleDarkMode={null} />
        <Routes>
          <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <Signup />} />
          <Route
            path="/dashboard"
            element={(
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            )}
          />
          <Route
            path="/history"
            element={(
              <PrivateRoute>
                <History />
              </PrivateRoute>
            )}
          />
          <Route
            path="/profile"
            element={(
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            )}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {user && <Chatbot />}
      </Box>
    </ThemeProvider>
  );
};

const App = () => (
  <AuthProvider>
    <AppLayout />
  </AuthProvider>
);

export default App;
