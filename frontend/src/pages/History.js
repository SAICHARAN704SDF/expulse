import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import GetAppIcon from '@mui/icons-material/GetApp';
import TimelineIcon from '@mui/icons-material/Timeline';
import { motion } from 'framer-motion';
import api from '../services/api';

const History = () => {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get('/analytics/history');
        setAnalyses(response.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load analysis history.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const handleDownload = async (analysisId) => {
    try {
      const response = await api.get(`/analytics/${analysisId}/report`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analysis-${analysisId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download the report.');
    }
  };

  const riskColor = (riskLevel) => {
    if (riskLevel === 'Low') return 'success';
    if (riskLevel === 'Moderate') return 'warning';
    return 'error';
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card
          elevation={0}
          sx={{
            borderRadius: 8,
            border: '1px solid rgba(58,125,203,0.35)',
            background: 'linear-gradient(160deg, rgba(5,15,30,0.96) 0%, rgba(7,19,37,0.96) 100%)',
            boxShadow: '0 28px 70px rgba(4, 12, 24, 0.52)',
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TimelineIcon sx={{ color: '#2fb9ff' }} />
              <Typography variant="h5" fontWeight={700}>
                Analysis History
              </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : analyses.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 4,
                  textAlign: 'center',
                  borderColor: 'rgba(58,125,203,0.35)',
                  background: 'rgba(8, 19, 35, 0.78)',
                }}
              >
                <Typography variant="h6" gutterBottom>
                  No analyses yet
                </Typography>
                <Typography color="text.secondary">
                  Your health analysis history will appear here after you run an analysis.
                </Typography>
              </Paper>
            ) : (
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{
                  borderColor: 'rgba(58,125,203,0.35)',
                  background: 'rgba(8, 19, 35, 0.78)',
                  '& .MuiTableCell-root': {
                    borderColor: 'rgba(128,188,255,0.14)',
                  },
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Heart Rate</TableCell>
                      <TableCell>Oxygen</TableCell>
                      <TableCell>Stress</TableCell>
                      <TableCell>Respiratory Rate</TableCell>
                      <TableCell>Blood Pressure</TableCell>
                      <TableCell>Health Score</TableCell>
                      <TableCell>Risk</TableCell>
                      <TableCell align="center">Report</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analyses.map((analysis) => (
                      <TableRow key={analysis.id} hover>
                        <TableCell>
                          {new Date(analysis.analysis_date).toLocaleString()}
                        </TableCell>
                        <TableCell>{analysis.heart_rate} bpm</TableCell>
                        <TableCell>{analysis.oxygen_level}%</TableCell>
                        <TableCell>{analysis.stress_level}%</TableCell>
                        <TableCell>{analysis.respiratory_rate} bpm</TableCell>
                        <TableCell>
                          {analysis.blood_pressure_systolic}/{analysis.blood_pressure_diastolic}
                        </TableCell>
                        <TableCell>{analysis.health_score}/100</TableCell>
                        <TableCell>
                          <Chip
                            label={analysis.risk_level}
                            color={riskColor(analysis.risk_level)}
                            size="small"
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton color="primary" onClick={() => handleDownload(analysis.id)}>
                            <GetAppIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  );
};

export default History;
