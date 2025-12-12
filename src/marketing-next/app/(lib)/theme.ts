"use client";
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2563EB' }, // blue-600
    secondary: { main: '#10B981' }, // emerald-500
    background: { default: '#F8FAFC' },
    text: { primary: '#0F172A', secondary: '#475569' },
  },
  typography: {
    fontFamily: '"Space Grotesk", Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
  },
});

export default theme;
