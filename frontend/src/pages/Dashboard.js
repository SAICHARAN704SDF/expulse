import React from 'react';
import {
  Box,
  Card,
  Container,
  Typography,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import RealtimeVitalsMonitor from '../components/RealtimeVitalsMonitor';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <Container maxWidth="lg" sx={{ mt: { xs: 1.5, md: 4 }, mb: { xs: 2.5, md: 6 }, px: { xs: 1.25, md: 3 } }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card
          elevation={0}
          sx={{
            p: { xs: 2, md: 4 },
            mb: { xs: 1.3, md: 3 },
            borderRadius: 4,
            background:
              'radial-gradient(circle at 85% -30%, rgba(44,163,255,0.34) 0%, rgba(44,163,255,0) 42%), linear-gradient(145deg, #07101f 0%, #0b1528 65%, #0d1d36 100%)',
            color: '#dceaff',
            border: '1px solid rgba(143, 202, 255, 0.2)',
            boxShadow: '0 30px 70px rgba(2,10,22,0.55)',
            display: { xs: 'none', md: 'block' },
          }}
        >
          <Typography variant="overline" sx={{ opacity: 0.9, letterSpacing: 1.2 }}>
            Real-time rPPG Dashboard
          </Typography>
          <Typography variant="h3" fontWeight={800} sx={{ mt: 1, mb: 1 }}>
            Welcome back, {user?.username}
          </Typography>
          <Typography variant="body1" sx={{ maxWidth: 720, opacity: 0.92 }}>
            Capture webcam frames in short batches, estimate pulse and respiration from live facial signals, and track a smoothed signal-quality score alongside BPM.
          </Typography>
        </Card>

        <Box sx={{ mt: { xs: 0, md: 3 } }}>
          <RealtimeVitalsMonitor />
        </Box>
      </motion.div>
    </Container>
  );
};

export default Dashboard;
