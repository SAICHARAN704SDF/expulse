import React, { useState } from 'react';
import {
  Avatar,
  Box,
  CircularProgress,
  Drawer,
  Fab,
  IconButton,
  List,
  ListItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import { useTheme } from '@mui/material/styles';
import api from '../services/api';

const Chatbot = () => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      text: "Hello! I can help with Expluse website issues, rPPG/ECG signal concepts, frame/ROI detection, and vitals interpretation.",
      sender: 'bot',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    const trimmedMessage = input.trim();
    if (!trimmedMessage || loading) {
      return;
    }

    const nextMessages = [
      ...messages,
      { text: trimmedMessage, sender: 'user' },
    ];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/chat', { message: trimmedMessage });
      setMessages([
        ...nextMessages,
        { text: response.data.response, sender: 'bot' },
      ]);
    } catch (error) {
      setMessages([
        ...nextMessages,
        {
          text: 'I am having trouble responding right now. Please try again.',
          sender: 'bot',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const isDark = theme.palette.mode === 'dark';
  const drawerBg = isDark
    ? 'linear-gradient(180deg, #111827 0%, #1f2937 100%)'
    : 'linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%)';
  const botBubbleBg = isDark ? 'rgba(255,255,255,0.1)' : '#ffffff';
  const botBubbleText = isDark ? '#f8fafc' : '#16324f';
  const userBubbleBg = isDark ? '#3b82f6' : '#1976d2';
  const userBubbleText = '#ffffff';

  return (
    <>
      <Fab
        color="primary"
        onClick={() => setOpen(true)}
        sx={{ position: 'fixed', right: 24, bottom: 24, zIndex: 1200 }}
      >
        <ChatIcon />
      </Fab>

      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box
          sx={{
            width: { xs: 320, sm: 380 },
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: drawerBg,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              borderBottom: '1px solid',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(21,101,192,0.1)',
              background: isDark ? 'rgba(17,24,39,0.72)' : 'rgba(255,255,255,0.72)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <SmartToyIcon />
              </Avatar>
              <Typography variant="h6">Health Assistant</Typography>
            </Box>
            <IconButton onClick={() => setOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <List sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            {messages.map((message, index) => (
              <ListItem
                key={`${message.sender}-${index}`}
                disableGutters
                sx={{
                  justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  mb: 1.5,
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    maxWidth: '85%',
                    display: 'flex',
                    gap: 1.25,
                    bgcolor: message.sender === 'user' ? userBubbleBg : botBubbleBg,
                    color: message.sender === 'user' ? userBubbleText : botBubbleText,
                    border: message.sender === 'user'
                      ? 'none'
                      : isDark
                        ? '1px solid rgba(255,255,255,0.08)'
                        : '1px solid rgba(21,101,192,0.08)',
                    boxShadow: message.sender === 'user'
                      ? '0 12px 30px rgba(25,118,210,0.24)'
                      : isDark
                        ? '0 12px 30px rgba(0,0,0,0.18)'
                        : '0 10px 24px rgba(15,23,42,0.08)',
                    borderRadius: 4,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 28,
                      height: 28,
                      bgcolor: message.sender === 'user' ? 'primary.dark' : 'secondary.main',
                    }}
                  >
                    {message.sender === 'user' ? <PersonIcon fontSize="small" /> : <SmartToyIcon fontSize="small" />}
                  </Avatar>
                  <Typography
                    variant="body2"
                    sx={{
                      color: message.sender === 'user' ? userBubbleText : botBubbleText,
                      lineHeight: 1.55,
                    }}
                  >
                    {message.text}
                  </Typography>
                </Paper>
              </ListItem>
            ))}

            {loading && (
              <ListItem disableGutters>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={18} />
                  <Typography variant="body2">Assistant is typing...</Typography>
                </Box>
              </ListItem>
            )}
          </List>

          <Box
            sx={{
              p: 2,
              borderTop: '1px solid',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(21,101,192,0.1)',
              display: 'flex',
              gap: 1,
              background: isDark ? 'rgba(17,24,39,0.72)' : 'rgba(255,255,255,0.72)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder="Ask about scanner issues, rPPG/ECG, ROI, BPM, RR, SDNN, RMSSD..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                  borderRadius: 3,
                },
              }}
            />
            <IconButton color="primary" onClick={handleSend} disabled={loading || !input.trim()}>
              <SendIcon />
            </IconButton>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default Chatbot;
