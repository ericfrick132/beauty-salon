import { createTheme } from '@mui/material/styles';
import { TenantConfig } from '../types';

// Function to create dynamic theme based on tenant config
export const createTurnosProTheme = (config?: TenantConfig) => {
  const theme = config?.theme;

  // Use theme configuration if available, otherwise use defaults
  const primaryColor = theme?.primaryColor || '#1E40AF'; // blue-800 (deeper blue)
  const secondaryColor = theme?.secondaryColor || '#1E3A5F';
  const accentColor = theme?.accentColor || '#2563EB'; // blue-600
  const backgroundColor = theme?.backgroundColor || '#FAF7F2'; // warm cream
  const surfaceColor = theme?.surfaceColor || '#FFFFFF';
  const errorColor = theme?.errorColor || '#DC2626';
  const warningColor = theme?.warningColor || '#D97706';
  const infoColor = theme?.infoColor || '#2563EB';
  const successColor = theme?.successColor || '#16A34A';
  const textPrimaryColor = theme?.textPrimaryColor || '#111827'; // gray-900
  const textSecondaryColor = theme?.textSecondaryColor || '#374151'; // gray-700
  const borderColor = theme?.borderColor || '#D1D5DB'; // gray-300
  const fontFamily = theme?.fontFamily || '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  const borderRadius = theme?.borderRadius || 8;
  const useShadows = theme?.useShadows ?? true;

  return createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: primaryColor,
        contrastText: '#ffffff',
      },
      secondary: {
        main: secondaryColor,
        contrastText: '#ffffff',
      },
      background: {
        default: backgroundColor,
        paper: surfaceColor,
      },
      text: {
        primary: textPrimaryColor,
        secondary: textSecondaryColor,
      },
      error: {
        main: errorColor,
      },
      warning: {
        main: warningColor,
      },
      success: {
        main: successColor,
      },
      info: {
        main: infoColor,
      },
      divider: borderColor,
    },
    typography: {
      fontFamily: fontFamily,
      htmlFontSize: 16,
      allVariants: {
        color: textPrimaryColor,
      },
    h1: {
      fontSize: '2.25rem',
      fontWeight: 700,
      lineHeight: 1.25,
    },
    h2: {
      fontSize: '1.875rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
  },
  shape: {
    borderRadius: borderRadius,
  },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: borderRadius,
            padding: '8px 20px',
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: useShadows ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
            },
          },
          contained: {
            backgroundColor: primaryColor,
            color: '#ffffff',
            '&:hover': {
              backgroundColor: accentColor,
            },
          },
          outlined: {
            borderColor: borderColor,
            color: textPrimaryColor,
            borderWidth: '1.5px',
            '&:hover': {
              borderColor: primaryColor,
              backgroundColor: `${primaryColor}08`,
              borderWidth: '1.5px',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: surfaceColor,
            borderRadius: borderRadius,
            border: `1px solid ${borderColor}`,
            boxShadow: useShadows ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: useShadows ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: borderRadius,
              backgroundColor: surfaceColor,
              '& fieldset': {
                borderColor: borderColor,
                borderWidth: '1.5px',
              },
              '&:hover fieldset': {
                borderColor: primaryColor,
              },
              '&.Mui-focused fieldset': {
                borderColor: primaryColor,
              },
            },
            '& .MuiInputLabel-root': {
              color: textSecondaryColor,
              '&.Mui-focused': {
                color: primaryColor,
              },
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: '#111827',
            color: '#ffffff',
            borderBottom: 'none',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: surfaceColor,
            borderRight: `1px solid ${borderColor}`,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 500,
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              fontWeight: 600,
              color: textPrimaryColor,
              backgroundColor: '#F3F4F6',
            },
          },
        },
      },
    },
  });
};

// Default theme (backwards compatibility)
export const TurnosProTheme = createTurnosProTheme();
