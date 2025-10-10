"use client";
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2D5A47' },
    secondary: { main: '#B8860B' },
    background: { default: '#ffffff' },
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
  },
});

export default theme;

