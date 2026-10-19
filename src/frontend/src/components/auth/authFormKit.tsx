/**
 * authFormKit — shared presentational pieces for the "Editorial Gazette" auth
 * pages (/login, /register, /forgot-password, /reset-password).
 *
 * These are the bits every auth form repeats: the underline-only text field
 * style, the mono-labelled divider, and the coral pill CTA. Kept in one place
 * so the password-recovery screens render identically to the login screen.
 */

import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { authPalette, authFonts } from './AuthShell';

// ─── Shared editorial field style: underline-only, forest glow on focus ───
export const underlineFieldSx = {
  '& .MuiFilledInput-root': {
    backgroundColor: 'transparent !important',
    fontFamily: authFonts.body,
    fontSize: 16,
    paddingLeft: 0,
    paddingRight: 0,
    borderRadius: 0,
    '&::before': {
      borderBottom: `1px solid ${authPalette.ink}`,
    },
    '&:hover::before': {
      borderBottom: `1px solid ${authPalette.ink} !important`,
    },
    '&::after': {
      borderBottom: `2px solid ${authPalette.primary}`,
    },
    '&.Mui-focused': {
      boxShadow: `0 6px 20px -14px ${authPalette.primary}`,
    },
  },
  '& .MuiFilledInput-input': {
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: '22px',
    paddingBottom: '8px',
    color: authPalette.ink,
    caretColor: authPalette.primary,
  },
  '& .MuiInputLabel-root': {
    fontFamily: authFonts.mono,
    fontSize: 11,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: authPalette.inkFaint,
    transform: 'translate(0, 20px) scale(1)',
    '&.Mui-focused': { color: authPalette.primary },
    '&.MuiInputLabel-shrink': {
      transform: 'translate(0, -2px) scale(0.9)',
      letterSpacing: '0.22em',
    },
  },
  '& .MuiFormHelperText-root': {
    fontFamily: authFonts.mono,
    fontSize: 10.5,
    letterSpacing: '0.1em',
    color: authPalette.inkSoft,
    marginLeft: 0,
    textTransform: 'uppercase',
  },
};

// ─── Editorial divider with mono label ───
export const Divider: React.FC<{ label: string }> = ({ label }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      my: 3,
      '&::before, &::after': {
        content: '""',
        flex: 1,
        height: 1,
        backgroundColor: authPalette.rule,
      },
    }}
  >
    <Typography
      sx={{
        fontFamily: authFonts.mono,
        fontSize: 10.5,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: authPalette.inkFaint,
      }}
    >
      {label}
    </Typography>
  </Box>
);

// ─── Pill CTA with coral bar that slides in from left on hover ───
export const PillCTA: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  loading?: boolean;
}> = ({ children, onClick, type = 'button', disabled, loading }) => (
  <Box
    component="button"
    type={type}
    onClick={onClick}
    disabled={disabled}
    sx={{
      position: 'relative',
      overflow: 'hidden',
      width: '100%',
      height: 52,
      border: 'none',
      outline: 'none',
      borderRadius: 999,
      cursor: disabled ? 'not-allowed' : 'pointer',
      backgroundColor: disabled
        ? 'rgba(23, 20, 16, 0.12)'
        : authPalette.primary,
      color: disabled ? 'rgba(23, 20, 16, 0.4)' : '#F4EFE6',
      fontFamily: authFonts.body,
      fontWeight: 600,
      fontSize: 15,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      transition:
        'transform 240ms cubic-bezier(0.22, 0.61, 0.36, 1), background-color 200ms ease',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1,
      '&::before': {
        content: '""',
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 0,
        backgroundColor: authPalette.secondary,
        transition: 'width 220ms cubic-bezier(0.22, 0.61, 0.36, 1)',
        zIndex: 0,
      },
      '&:not(:disabled):hover::before': {
        width: 14,
      },
      '&:not(:disabled):hover': {
        backgroundColor: authPalette.primaryDeep,
      },
      '& > span': {
        position: 'relative',
        zIndex: 1,
      },
    }}
  >
    <span>
      {loading ? (
        <CircularProgress size={18} sx={{ color: '#F4EFE6' }} />
      ) : (
        children
      )}
    </span>
  </Box>
);

// ─── Editorial inline link (e.g. "Volver al inicio de sesión") ───
export const InlineLink: React.FC<{
  href: string;
  children: React.ReactNode;
}> = ({ href, children }) => (
  <Box
    component="a"
    href={href}
    sx={{
      color: authPalette.secondary,
      fontFamily: authFonts.display,
      fontStyle: 'normal',
      fontWeight: 500,
      fontSize: 15,
      textDecoration: 'none',
      borderBottom: `1px solid ${authPalette.secondary}`,
      paddingBottom: '1px',
      transition: 'color 150ms ease, border-color 150ms ease',
      '&:hover': {
        color: authPalette.primary,
        borderBottomColor: authPalette.primary,
      },
    }}
  >
    {children}
  </Box>
);

// ─── Consentimiento de marketing por WhatsApp (opt-in tildado por defecto) ───
export const WHATSAPP_OPT_IN_LABEL = 'Acepto recibir novedades y promociones de TurnosPro por WhatsApp.';

export const WhatsAppOptInCheckbox: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ checked, onChange, disabled }) => (
  <Box
    component="label"
    sx={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 1.25,
      cursor: disabled ? 'default' : 'pointer',
      userSelect: 'none',
      opacity: disabled ? 0.6 : 1,
    }}
  >
    <Box
      component="input"
      type="checkbox"
      name="whatsAppMarketingOptIn"
      checked={checked}
      disabled={disabled}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.checked)}
      sx={{
        appearance: 'none',
        WebkitAppearance: 'none',
        flexShrink: 0,
        width: 18,
        height: 18,
        margin: '2px 0 0',
        border: `1px solid ${authPalette.ink}`,
        borderRadius: '3px',
        backgroundColor: 'transparent',
        display: 'grid',
        placeContent: 'center',
        cursor: 'inherit',
        transition: 'background-color 150ms ease, border-color 150ms ease',
        '&::after': {
          content: '""',
          width: 5,
          height: 9,
          border: `solid ${authPalette.paper}`,
          borderWidth: '0 2px 2px 0',
          transform: 'translateY(-1px) rotate(45deg)',
          opacity: 0,
        },
        '&:checked': {
          backgroundColor: authPalette.primary,
          borderColor: authPalette.primary,
        },
        '&:checked::after': { opacity: 1 },
        '&:focus-visible': {
          outline: `2px solid ${authPalette.primary}`,
          outlineOffset: 2,
        },
      }}
    />
    <Typography
      component="span"
      sx={{ fontFamily: authFonts.body, fontSize: 14, lineHeight: 1.45, color: authPalette.inkSoft }}
    >
      {WHATSAPP_OPT_IN_LABEL}
    </Typography>
  </Box>
);
