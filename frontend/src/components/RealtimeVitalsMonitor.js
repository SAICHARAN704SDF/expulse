import React, { useEffect, useMemo, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import {
  Alert,
  Box,
  Card,
  Chip,
  IconButton,
  Typography,
} from '@mui/material';
import PlayCircleOutlineRoundedIcon from '@mui/icons-material/PlayCircleOutlineRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import PauseCircleOutlineRoundedIcon from '@mui/icons-material/PauseCircleOutlineRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import AirRoundedIcon from '@mui/icons-material/AirRounded';
import GraphicEqRoundedIcon from '@mui/icons-material/GraphicEqRounded';
import CenterFocusStrongRoundedIcon from '@mui/icons-material/CenterFocusStrongRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RadioButtonCheckedRoundedIcon from '@mui/icons-material/RadioButtonCheckedRounded';
import api from '../services/api';
import './RealtimeVitalsMonitor.css';

const captureIntervalMs = 140;
const sendIntervalMs = 2200;
const targetWindowFrames = 150;
const batchFrameCount = 30;
const fps = Math.round(1000 / captureIntervalMs);

const colorByQuality = {
  good: 'success',
  fair: 'warning',
  low: 'error',
};

const initialVitals = {
  bpm: 0,
  respiratory_rate: 0,
  sdnn_ms: 0,
  rmssd_ms: 0,
  confidence: 0,
  signal_quality: 0,
  quality_label: 'low',
  model_used: 'temporal_transformer',
  warning: '',
  face_detected: true,
  face_in_frame: true,
  in_frame_coverage: 0,
  roi_regions: {},
  region_signal_strength: {},
};

const RealtimeVitalsMonitor = () => {
  const webcamRef = useRef(null);
  const sessionIdRef = useRef(sessionStorage.getItem('rppgSessionId') || window.crypto.randomUUID());
  const frameBufferRef = useRef([]);
  const captureTimerRef = useRef(null);
  const flushTimerRef = useRef(null);
  const waveTimerRef = useRef(null);
  const phaseRef = useRef(0);
  const latestVitalsRef = useRef(initialVitals);
  const requestInFlightRef = useRef(false);

  const [scanState, setScanState] = useState('idle');
  const [error, setError] = useState('');
  const [vitals, setVitals] = useState(initialVitals);
  const [faceAlert, setFaceAlert] = useState('');
  const [fitAlert, setFitAlert] = useState('');
  const [waveform, setWaveform] = useState([]);
  const [respWaveform, setRespWaveform] = useState([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [scanStartedAt, setScanStartedAt] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

  const webcamConstraints = useMemo(
    () => ({
      width: 720,
      height: 1280,
      facingMode: 'user',
    }),
    [],
  );

  useEffect(() => {
    sessionStorage.setItem('rppgSessionId', sessionIdRef.current);

    return () => {
      if (captureTimerRef.current) {
        clearInterval(captureTimerRef.current);
      }
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
      }
      if (waveTimerRef.current) {
        clearInterval(waveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    latestVitalsRef.current = vitals;
  }, [vitals]);

  useEffect(() => {
    if (!cameraReady || scanState !== 'idle') {
      return;
    }

    const timer = window.setTimeout(() => {
      startScan();
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [cameraReady, scanState]);

  useEffect(() => {
    if (scanState !== 'scanning' || !scanStartedAt) {
      return undefined;
    }

    const ticker = window.setInterval(() => {
      setElapsedMs(Date.now() - scanStartedAt);
    }, 180);

    return () => {
      clearInterval(ticker);
    };
  }, [scanState, scanStartedAt]);

  const createWaveSamples = (hrValue, rrValue, phase = 0) => {
    const hr = Number(hrValue) || 0;
    const rr = Number(rrValue) || 0;

    if (hr <= 0 || rr <= 0) {
      const flat = Array.from({ length: 72 }).map((_, index) => ({ x: index, y: 0 }));
      setWaveform(flat);
      setRespWaveform(flat);
      return;
    }

    const pulse = Array.from({ length: 72 }).map((_, index) => {
      const t = index / 72 + phase;
      const fundamental = Math.sin(2 * Math.PI * t * (hr / 10));
      const harmonic = 0.55 * Math.sin(2 * Math.PI * t * (hr / 5));
      const notch = 0.2 * Math.sin(2 * Math.PI * t * (hr / 2.5));
      const value = 0.6 * fundamental + 0.35 * harmonic - 0.15 * notch;
      return {
        x: index,
        y: value,
      };
    });

    const respiration = Array.from({ length: 72 }).map((_, index) => {
      const t = index / 72 + phase * 0.6;
      const value = 0.8 * Math.sin(2 * Math.PI * t * (rr / 2.8)) + 0.2 * Math.sin(2 * Math.PI * t * (rr / 1.7));
      return {
        x: index,
        y: value,
      };
    });

    setWaveform(pulse);
    setRespWaveform(respiration);
  };

  useEffect(() => {
    createWaveSamples(vitals.bpm, vitals.respiratory_rate, phaseRef.current);
  }, [vitals.bpm, vitals.respiratory_rate]);

  const captureFrame = () => {
    const screenshot = webcamRef.current?.getScreenshot?.();
    if (!screenshot) {
      return;
    }

    frameBufferRef.current.push(screenshot);
    if (frameBufferRef.current.length > targetWindowFrames) {
      frameBufferRef.current = frameBufferRef.current.slice(-targetWindowFrames);
    }
  };

  const pushInference = async () => {
    if (requestInFlightRef.current) {
      return;
    }

    const frames = frameBufferRef.current.slice(-Math.min(batchFrameCount, frameBufferRef.current.length));
    if (frames.length < 16) {
      return;
    }

    requestInFlightRef.current = true;

    try {
      const response = await api.post('/predict', {
        session_id: sessionIdRef.current,
        frames,
        fps,
        model_preference: 'temporal_transformer',
        reset_session: false,
      });

      const nextVitals = {
        bpm: response.data.bpm,
        respiratory_rate: response.data.respiratory_rate,
        sdnn_ms: response.data.sdnn_ms,
        rmssd_ms: response.data.rmssd_ms,
        confidence: response.data.confidence,
        signal_quality: response.data.signal_quality,
        quality_label: response.data.quality_label,
        model_used: response.data.model_used,
        warning: response.data.warning || '',
        face_detected: response.data.face_detected !== false,
        face_in_frame: response.data.face_in_frame !== false,
        in_frame_coverage: Number(response.data.in_frame_coverage || 0),
        roi_regions: response.data.roi_regions || {},
        region_signal_strength: response.data.region_signal_strength || {},
      };

      setVitals(nextVitals);
      setError('');

      if (response.data.face_detected === false) {
        setFaceAlert('No face detected');
        setVitals((previous) => ({
          ...previous,
          bpm: 0,
          respiratory_rate: 0,
          sdnn_ms: 0,
          rmssd_ms: 0,
          confidence: 0,
          signal_quality: 0,
          roi_regions: {},
        }));
      } else {
        setFaceAlert('');
      }

      if (response.data.face_in_frame === false) {
        setFitAlert('Align your face fully inside the blue frame');
        setVitals((previous) => ({
          ...previous,
          bpm: 0,
          respiratory_rate: 0,
          sdnn_ms: 0,
          rmssd_ms: 0,
          confidence: 0,
          signal_quality: 0,
          roi_regions: {},
        }));
      } else {
        setFitAlert('');
      }
    } catch (requestError) {
      const detail = requestError.response?.data?.detail;
      const message = Array.isArray(detail) ? detail[0]?.msg : detail;
      setError(message || 'Unable to process your scan. Please try again.');
      setFaceAlert('');
      setFitAlert('');
      setVitals((previous) => ({
        ...previous,
        bpm: 0,
        respiratory_rate: 0,
        sdnn_ms: 0,
        rmssd_ms: 0,
        confidence: 0,
        signal_quality: 0,
        roi_regions: {},
      }));
    } finally {
      requestInFlightRef.current = false;
    }
  };

  const startScan = async () => {
    if (scanState === 'scanning') {
      return;
    }

    setError('');
    setVitals(initialVitals);
    frameBufferRef.current = [];
    setScanStartedAt(Date.now());
    setElapsedMs(0);
    setScanState('scanning');
    phaseRef.current = 0;
    requestInFlightRef.current = false;
    setFaceAlert('');
    setFitAlert('');

    try {
      await api.post('/predict', {
        session_id: sessionIdRef.current,
        frames: [webcamRef.current?.getScreenshot?.()].filter(Boolean),
        fps,
        model_preference: 'temporal_transformer',
        reset_session: true,
      });
    } catch (_error) {
      // Session reset request is best effort.
    }

    captureTimerRef.current = window.setInterval(captureFrame, captureIntervalMs);
    flushTimerRef.current = window.setInterval(pushInference, sendIntervalMs);
    window.setTimeout(() => {
      pushInference();
    }, 900);

    waveTimerRef.current = window.setInterval(() => {
      phaseRef.current += 0.015;
      createWaveSamples(
        latestVitalsRef.current.bpm,
        latestVitalsRef.current.respiratory_rate,
        phaseRef.current,
      );
    }, 180);
  };

  const stopScan = (complete = false) => {
    if (captureTimerRef.current) {
      clearInterval(captureTimerRef.current);
      captureTimerRef.current = null;
    }

    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    if (waveTimerRef.current) {
      clearInterval(waveTimerRef.current);
      waveTimerRef.current = null;
    }

    setScanState(complete ? 'complete' : 'idle');
    if (!complete) {
      setElapsedMs(0);
    }
  };

  const resetAll = () => {
    stopScan(false);
    setVitals(initialVitals);
    setWaveform([]);
    setRespWaveform([]);
    setScanStartedAt(null);
    setElapsedMs(0);
    frameBufferRef.current = [];
    setError('');
    setFaceAlert('');
    setFitAlert('');
    requestInFlightRef.current = false;
  };

  const scanSeconds = Math.floor(elapsedMs / 1000);
  const roiEntries = Object.entries(vitals.roi_regions || {});
  const hasLiveReadings = (vitals.bpm || 0) > 0 && (vitals.respiratory_rate || 0) > 0;

  return (
    <Box className="monitor-shell">
      <Box className="monitor-vfx-ring monitor-vfx-ring-left" />
      <Box className="monitor-vfx-ring monitor-vfx-ring-right" />

      <Card className="monitor-card">
        <Box className="camera-stage">
          <Webcam
            audio={false}
            ref={webcamRef}
            mirrored
            screenshotFormat="image/jpeg"
            screenshotQuality={0.78}
            videoConstraints={webcamConstraints}
            onUserMedia={() => setCameraReady(true)}
            onUserMediaError={() => setError('Camera permission denied or unavailable.')}
            className="scan-camera-video"
          />

          <Box className="scan-overlay-frost" />

          <Box className="top-status-row">
            <Chip size="small" label={`FPS ${fps}`} className="monitor-chip" />
            <Chip
              size="small"
              icon={<GraphicEqRoundedIcon fontSize="small" />}
              label={scanState === 'scanning' ? `Live ${String(scanSeconds).padStart(2, '0')}s` : 'Paused'}
              className="monitor-chip"
              color={colorByQuality[vitals.quality_label] || 'default'}
            />
          </Box>

          {scanState === 'scanning' && vitals.face_detected === false && (
            <Box className="inline-no-face-warning">
              <Typography className="inline-no-face-warning-text">No face detected</Typography>
            </Box>
          )}

          {scanState === 'scanning' && vitals.face_detected && vitals.face_in_frame === false && (
            <Box className="inline-fit-warning">
              <Typography className="inline-fit-warning-text">Align Face In Blue Frame</Typography>
            </Box>
          )}

          <Box className="wave-overlay-panel">
            <Box className="wave-overlay-row">
              <Box className="overlay-title-wrap">
                <Typography className="wave-title wave-title-red"><FavoriteRoundedIcon fontSize="small" /> Pulse</Typography>
              </Box>
              <Box className="overlay-line-wrap">
                <svg viewBox="0 0 620 70" preserveAspectRatio="none" className="wave-svg">
                  <path
                    d={waveform.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x * 8.6} ${35 - point.y * 24}`).join(' ')}
                    className="wave-path wave-path-red"
                  />
                </svg>
              </Box>
              <Box className="overlay-value-wrap">
                <Typography className="overlay-metric-label">HR</Typography>
                <Typography className="overlay-metric-value overlay-metric-value-red">{Math.round(vitals.bpm || 0)}</Typography>
                <Typography className="overlay-metric-unit">bpm</Typography>
              </Box>
            </Box>

            <Box className="wave-overlay-row wave-overlay-row-blue">
              <Box className="overlay-title-wrap">
                <Typography className="wave-title wave-title-blue"><AirRoundedIcon fontSize="small" /> Respiration</Typography>
              </Box>
              <Box className="overlay-line-wrap">
                <svg viewBox="0 0 620 70" preserveAspectRatio="none" className="wave-svg">
                  <path
                    d={respWaveform.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x * 8.6} ${35 - point.y * 22}`).join(' ')}
                    className="wave-path wave-path-blue"
                  />
                </svg>
              </Box>
              <Box className="overlay-value-wrap">
                <Typography className="overlay-metric-label">RR</Typography>
                <Typography className="overlay-metric-value overlay-metric-value-blue">{Math.round(vitals.respiratory_rate || 0)}</Typography>
                <Typography className="overlay-metric-unit">bpm</Typography>
              </Box>
            </Box>
          </Box>


          <Box className={`scan-oval ${scanState === 'scanning' ? 'scan-oval-active' : ''}`}>
            {scanState === 'scanning' && !hasLiveReadings && <Box className="scan-sweep-line" />}
          </Box>

          {roiEntries.map(([regionName, regionBox]) => {
            if (!Array.isArray(regionBox) || regionBox.length !== 4) {
              return null;
            }

            const [x, y, w, h] = regionBox;
            const left = `${Math.max(0, x) * 100}%`;
            const top = `${Math.max(0, y) * 100}%`;
            const width = `${Math.max(0.02, w) * 100}%`;
            const height = `${Math.max(0.02, h) * 100}%`;
            const strength = Number(vitals.region_signal_strength?.[regionName] || 0).toFixed(3);
            const label = regionName.replace('_', ' ');

            return (
              <Box
                key={regionName}
                className={`roi-region-box roi-region-${regionName}`}
                sx={{ left, top, width, height }}
              >
                <Typography className="roi-region-label">
                  {label}
                  {' '}
                  {strength}
                </Typography>
              </Box>
            );
          })}

          <IconButton className="floating-control floating-control-left" onClick={scanState === 'scanning' ? () => stopScan(true) : startScan}>
            {scanState === 'scanning' ? <PauseCircleOutlineRoundedIcon /> : <PlayCircleOutlineRoundedIcon />}
          </IconButton>

          <IconButton className="floating-control floating-control-right" onClick={resetAll}>
            <CenterFocusStrongRoundedIcon />
          </IconButton>

          <Box className="bottom-action-bar">
            <IconButton className="action-icon-btn" aria-label="info">
              <InfoOutlinedIcon />
            </IconButton>
            <IconButton
              className={`action-icon-btn action-icon-btn-center ${scanState === 'scanning' ? 'action-icon-btn-center-live' : ''}`}
              aria-label="scan"
              onClick={scanState === 'scanning' ? () => stopScan(true) : startScan}
            >
              <RadioButtonCheckedRoundedIcon />
            </IconButton>
            <IconButton className="action-icon-btn" aria-label="refresh" onClick={resetAll}>
              <AutorenewRoundedIcon />
            </IconButton>
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mt: 1.4 }}>{error}</Alert>}
        {!!faceAlert && !error && <Alert severity="warning" sx={{ mt: 1.4 }}>{faceAlert}</Alert>}
        {!!fitAlert && !error && <Alert severity="warning" sx={{ mt: 1.4 }}>{fitAlert}</Alert>}
        {!!vitals.warning && <Alert severity="warning" sx={{ mt: 1.4 }}>{vitals.warning}</Alert>}
      </Card>
    </Box>
  );
};

export default RealtimeVitalsMonitor;
