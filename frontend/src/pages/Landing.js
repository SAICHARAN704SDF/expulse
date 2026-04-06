import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const featureCards = [
  {
    title: 'Run a Vital Check',
    description: 'Generate a quick simulated health analysis with heart rate, oxygen, stress, breathing, and blood pressure insights.',
    icon: <MonitorHeartIcon />,
    accent: '#0f766e',
  },
  {
    title: 'Track Your History',
    description: 'Review previous analyses anytime and download your reports from a clean history dashboard.',
    icon: <HistoryEduIcon />,
    accent: '#2563eb',
  },
  {
    title: 'Chat With Expluse',
    description: 'Ask simple health-related questions and get guided chatbot responses inside the app.',
    icon: <SmartToyIcon />,
    accent: '#7c3aed',
  },
];

const steps = [
  {
    title: 'Create your account',
    detail: 'Secure signup and JWT-based login keep your personal dashboard private.',
  },
  {
    title: 'Run an analysis',
    detail: 'Get a complete wellness snapshot in one click from your dashboard.',
  },
  {
    title: 'Review and ask',
    detail: 'Check past results, download reports, and use the built-in assistant for follow-up questions.',
  },
];

const Landing = () => {
  const { user } = useAuth();

  return (
    <Box sx={{ overflow: 'hidden' }}>
      <Container maxWidth="lg" sx={{ pt: { xs: 5, md: 8 }, pb: { xs: 6, md: 10 } }}>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Chip
                label="Health dashboard, history, profile, and chatbot"
                sx={{
                  bgcolor: 'rgba(15,118,110,0.12)',
                  color: '#0f766e',
                  fontWeight: 700,
                  mb: 2,
                }}
              />
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '2.4rem', md: '4rem' },
                  lineHeight: 1.02,
                  letterSpacing: '-0.03em',
                  maxWidth: 620,
                }}
              >
                Expluse for everyday health insights.
              </Typography>
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{ mt: 2.5, maxWidth: 560, fontWeight: 400, lineHeight: 1.7 }}
              >
                Monitor your wellness with secure login, instant health analysis, downloadable history reports, and a built-in assistant, all in one calm and modern interface.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
                <Button
                  component={Link}
                  to={user ? '/dashboard' : '/signup'}
                  variant="contained"
                  size="large"
                  sx={{
                    px: 3.5,
                    py: 1.4,
                    borderRadius: 99,
                    background: 'linear-gradient(135deg, #0f766e 0%, #0ea5a4 100%)',
                    boxShadow: '0 18px 35px rgba(15,118,110,0.22)',
                  }}
                >
                  {user ? 'Open Dashboard' : 'Get Started'}
                </Button>
                <Button
                  component={Link}
                  to={user ? '/history' : '/login'}
                  variant="outlined"
                  size="large"
                  sx={{ px: 3.5, py: 1.4, borderRadius: 99 }}
                >
                  {user ? 'View History' : 'Login'}
                </Button>
              </Stack>

              <Stack direction="row" spacing={1.25} sx={{ mt: 3, flexWrap: 'wrap', gap: 1.25 }}>
                <Chip icon={<ShieldOutlinedIcon />} label="JWT protected" variant="outlined" />
                <Chip icon={<PersonOutlineIcon />} label="Profile ready" variant="outlined" />
                <Chip icon={<FavoriteIcon />} label="Wellness-focused" variant="outlined" />
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: 'linear-gradient(160deg, #0f172a 0%, #13385c 42%, #0f766e 100%)',
                  color: '#fff',
                  boxShadow: '0 35px 80px rgba(15, 23, 42, 0.22)',
                }}
              >
                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                  <Typography variant="overline" sx={{ letterSpacing: 1.8, opacity: 0.75 }}>
                    Expluse Preview
                  </Typography>
                  <Typography variant="h4" fontWeight={800} sx={{ mt: 1 }}>
                    Everything linked in one workflow
                  </Typography>

                  <Box
                    sx={{
                      mt: 3,
                      p: 2.5,
                      borderRadius: 5,
                      bgcolor: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.16)',
                    }}
                  >
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>
                          Heart Rate
                        </Typography>
                        <Typography variant="h5" fontWeight={800}>
                          72 bpm
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>
                          Oxygen
                        </Typography>
                        <Typography variant="h5" fontWeight={800}>
                          98%
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>
                          Stress
                        </Typography>
                        <Typography variant="h5" fontWeight={800}>
                          24%
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>
                          Risk Level
                        </Typography>
                        <Typography variant="h5" fontWeight={800}>
                          Low
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  <Box sx={{ mt: 3, display: 'grid', gap: 1.5 }}>
                    {['Signup or login securely', 'Run your analysis instantly', 'Review history and reports', 'Ask the health chatbot anytime'].map((item) => (
                      <Box
                        key={item}
                        sx={{
                          px: 2,
                          py: 1.5,
                          borderRadius: 4,
                          bgcolor: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.12)',
                        }}
                      >
                        <Typography variant="body1">{item}</Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </motion.div>
      </Container>

      <Container maxWidth="lg" sx={{ pb: 10 }}>
        <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
          Core Features
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 620 }}>
          Your original project functionality is kept intact, just presented in a cleaner product-focused style.
        </Typography>

        <Grid container spacing={3}>
          {featureCards.map((feature, index) => (
            <Grid item xs={12} md={4} key={feature.title}>
              <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    borderRadius: 6,
                    border: '1px solid rgba(15,23,42,0.08)',
                    background: 'rgba(255,255,255,0.82)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 20px 40px rgba(15,23,42,0.06)',
                  }}
                >
                  <CardContent sx={{ p: 3.25 }}>
                    <Box
                      sx={{
                        width: 52,
                        height: 52,
                        borderRadius: 3,
                        bgcolor: feature.accent,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Typography variant="h5" fontWeight={700} gutterBottom>
                      {feature.title}
                    </Typography>
                    <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Box sx={{ background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(14,165,164,0.08) 100%)', py: 9 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={5}>
              <Typography variant="h4" fontWeight={800} sx={{ mb: 1.5 }}>
                How it works
              </Typography>
              <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                Similar to the reference product style, the experience is broken into clear sections and reassuring action steps. The difference is that this content matches your actual app features.
              </Typography>
            </Grid>
            <Grid item xs={12} md={7}>
              <Stack spacing={2}>
                {steps.map((step, index) => (
                  <Card key={step.title} elevation={0} sx={{ borderRadius: 5, border: '1px solid rgba(15,23,42,0.08)' }}>
                    <CardContent sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-start', p: 3 }}>
                      <Box
                        sx={{
                          minWidth: 40,
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                        }}
                      >
                        {index + 1}
                      </Box>
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          {step.title}
                        </Typography>
                        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                          {step.detail}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 9 }}>
        <Card
          elevation={0}
          sx={{
            borderRadius: 7,
            p: { xs: 3, md: 5 },
            background: 'linear-gradient(135deg, #effcfb 0%, #ecf5ff 100%)',
            border: '1px solid rgba(15,23,42,0.06)',
          }}
        >
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Disclaimer
          </Typography>
          <Typography color="text.secondary" sx={{ lineHeight: 1.8, maxWidth: 860 }}>
            Expluse in this project is designed for general wellness insights and demonstration purposes. It should not be used as a medical diagnosis tool. For real medical concerns, always consult a qualified healthcare professional.
          </Typography>
        </Card>
      </Container>
    </Box>
  );
};

export default Landing;
