import React from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = ({ darkMode, toggleDarkMode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'rgba(6, 12, 23, 0.74)',
        color: '#dbe9ff',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(133,189,255,0.18)',
      }}
    >
      <Toolbar sx={{ gap: 1.2, minHeight: { xs: 60, md: 78 }, px: { xs: 1, md: 2 } }}>
        <Typography
          variant="h6"
          component={Link}
          to="/"
          sx={{ color: 'inherit', textDecoration: 'none', fontWeight: 800, flexGrow: 1, letterSpacing: '-0.03em', fontFamily: '"Sora", sans-serif', fontSize: { xs: '0.95rem', md: '1.25rem' } }}
        >
          Expluse Vitals Scan
        </Typography>

        {toggleDarkMode && (
          <IconButton color="inherit" onClick={toggleDarkMode} sx={{ border: '1px solid rgba(128,188,255,0.2)', color: '#b8d8ff' }}>
            {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        )}

        {user ? (
          <>
            <Button color="inherit" component={Link} to="/dashboard" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
              Dashboard
            </Button>
            <Button color="inherit" component={Link} to="/history" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
              History
            </Button>
            <Button color="inherit" component={Link} to="/profile" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
              Profile
            </Button>
            <IconButton color="inherit" onClick={handleMenuOpen}>
              <Avatar sx={{ width: 32, height: 32 }}>
                {user.username?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
              <MenuItem component={Link} to="/profile" onClick={handleMenuClose}>
                My Profile
              </MenuItem>
              <MenuItem component={Link} to="/history" onClick={handleMenuClose}>
                History
              </MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button color="inherit" component={Link} to="/" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
              Home
            </Button>
            <Button color="inherit" component={Link} to="/login" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
              Login
            </Button>
            <Button
              variant="contained"
              component={Link}
              to="/signup"
              sx={{ borderRadius: 99, px: { xs: 1.5, md: 2.25 }, minWidth: { xs: 86, md: 'auto' }, background: 'linear-gradient(140deg, #1ea6ff 0%, #83d5ff 100%)', color: '#031022' }}
            >
              Signup
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
