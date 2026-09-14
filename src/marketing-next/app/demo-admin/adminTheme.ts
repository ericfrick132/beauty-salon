'use client';
import { createTheme } from '@mui/material/styles';

// Réplica de createTurnosProTheme() del panel real (src/frontend/src/theme/theme.ts) con los
// colores por defecto de un negocio. La landing tiene su propio tema editorial; la demo no lo usa.
export const ui = {
  primary: '#1E40AF',
  accent: '#2563EB',
  secondary: '#1E3A5F',
  bg: '#FAF7F2',
  surface: '#FFFFFF',
  navbar: '#111827',
  text: '#111827',
  textSoft: '#374151',
  textMute: '#6B7280',
  border: '#D1D5DB',
  line: '#E5E7EB',
  hover: '#F3F4F6',
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  whatsapp: '#128c7e',
  whatsappDeep: '#075e54',
  // Página pública de reservas (BookingPage.tsx)
  paper: '#F4EFE6',
  paperSurface: '#FAF7F0',
  ink: '#171410',
  inkSoft: '#5C5347',
  inkMute: '#8C8275',
  rule: 'rgba(23, 20, 16, 0.14)',
};

const body = 'var(--font-grotesk), "Space Grotesk", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const display = 'var(--font-fraunces), "Fraunces", "Space Grotesk", Georgia, serif';
export const mono = 'var(--font-mono), "JetBrains Mono", ui-monospace, monospace';

export const adminTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: ui.primary, contrastText: '#ffffff' },
    secondary: { main: ui.secondary, contrastText: '#ffffff' },
    background: { default: ui.bg, paper: ui.surface },
    text: { primary: ui.text, secondary: ui.textSoft },
    error: { main: ui.error },
    warning: { main: ui.warning },
    success: { main: ui.success },
    info: { main: ui.accent },
    divider: ui.border,
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: body,
    htmlFontSize: 16,
    allVariants: { color: ui.text },
    h1: { fontFamily: display, fontSize: '2.25rem', fontWeight: 600, lineHeight: 1.18, letterSpacing: '-0.02em' },
    h2: { fontFamily: display, fontSize: '1.875rem', fontWeight: 600, lineHeight: 1.22, letterSpacing: '-0.02em' },
    h3: { fontFamily: display, fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.3, letterSpacing: '-0.015em' },
    h4: { fontFamily: display, fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.35, letterSpacing: '-0.01em' },
    h5: { fontSize: '1.125rem', fontWeight: 500, lineHeight: 1.5 },
    h6: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.5 },
    body1: { fontSize: '1rem', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.6 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          padding: '8px 20px',
          boxShadow: 'none',
          transition: 'all 0.2s ease',
          '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
        },
        contained: { backgroundColor: ui.primary, color: '#ffffff', '&:hover': { backgroundColor: ui.accent } },
        outlined: {
          borderColor: ui.border,
          color: ui.text,
          borderWidth: '1.5px',
          '&:hover': { borderColor: ui.primary, backgroundColor: `${ui.primary}08`, borderWidth: '1.5px' },
        },
        sizeSmall: { padding: '4px 12px' },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: 'none', border: 'none', borderRadius: 8 } },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: ui.surface,
          borderRadius: 8,
          border: `1px solid ${ui.line}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          transition: 'all 0.2s ease',
          '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500, border: 'none', fontFamily: body, textTransform: 'none', letterSpacing: 0, height: 24 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: ui.surface,
          '& fieldset': { borderColor: ui.border, borderWidth: '1.5px' },
          '&:hover fieldset': { borderColor: `${ui.primary} !important` },
          '&.Mui-focused fieldset': { borderColor: `${ui.primary} !important` },
        },
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 12, border: 'none' } },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 600, color: ui.text, backgroundColor: '#F3F4F6' },
        root: { borderColor: ui.line },
      },
    },
    MuiMenu: {
      styleOverrides: { paper: { border: `1px solid ${ui.line}`, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } },
    },
  },
});
