import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { API_URL_STORAGE_KEY, normalizeApiBaseUrl } from '../services/api';

const ApiConfigGate = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [error, setError] = useState('');

  const savedUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }

    return normalizeApiBaseUrl(localStorage.getItem(API_URL_STORAGE_KEY));
  }, []);

  useEffect(() => {
    if (savedUrl) {
      setReady(true);
      return;
    }

    setDialogOpen(true);
  }, [savedUrl]);

  const handleSave = () => {
    const normalizedUrl = normalizeApiBaseUrl(apiUrl);

    if (!normalizedUrl) {
      setError('Enter a valid backend URL, for example https://api.example.com or http://192.168.1.10:8000');
      return;
    }

    localStorage.setItem(API_URL_STORAGE_KEY, normalizedUrl);
    setError('');
    setDialogOpen(false);
    setReady(true);
  };

  if (!ready) {
    return (
      <>
        <Dialog open={dialogOpen} fullWidth maxWidth="sm">
          <DialogTitle>Set Backend URL</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              Enter the public backend URL for this app. The value should point to your deployed FastAPI server.
            </Typography>
            <TextField
              autoFocus
              fullWidth
              label="Backend URL"
              placeholder="https://your-backend.com or http://192.168.1.10:8000"
              value={apiUrl}
              onChange={(event) => setApiUrl(event.target.value)}
              helperText="The app will automatically use /api after this URL."
              sx={{ mt: 1 }}
            />
            {error && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="error">{error}</Alert>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setApiUrl('http://127.0.0.1:8000')}>
              Use Localhost
            </Button>
            <Button variant="contained" onClick={handleSave}>
              Save
            </Button>
          </DialogActions>
        </Dialog>
        <Box sx={{ minHeight: '100vh', bgcolor: '#040812' }} />
      </>
    );
  }

  return children;
};

export default ApiConfigGate;