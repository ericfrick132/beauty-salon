import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Divider,
  TextField,
  Chip,
} from '@mui/material';
import { Palette, Save } from '@mui/icons-material';
import { superAdminApi } from '../../services/api';

export interface ThemeConfiguration {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  errorColor: string;
  warningColor: string;
  infoColor: string;
  successColor: string;
  textPrimaryColor: string;
  textSecondaryColor: string;
  borderColor: string;
  fontFamily: string;
  borderRadius: number;
  useShadows: boolean;
  autoContrastText: boolean;
}

const defaultTheme: ThemeConfiguration = {
  primaryColor: '#1976d2',
  secondaryColor: '#ffffff',
  accentColor: '#ffc107',
  backgroundColor: '#ffffff',
  surfaceColor: '#f5f5f5',
  errorColor: '#f44336',
  warningColor: '#ff9800',
  infoColor: '#2196f3',
  successColor: '#4caf50',
  textPrimaryColor: '#000000',
  textSecondaryColor: '#666666',
  borderColor: '#e0e0e0',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
  borderRadius: 8,
  useShadows: true,
  autoContrastText: true,
};

interface ThemeColorRowProps {
  label: string;
  value: string;
  size?: 'large' | 'small';
  onChange: (value: string) => void;
}

const ThemeColorRow: React.FC<ThemeColorRowProps> = ({ label, value, size = 'large', onChange }) => {
  const swatchSize = size === 'small' ? 30 : 40;
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom>{label}</Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Box
          sx={{
            width: swatchSize,
            height: swatchSize,
            backgroundColor: value,
            border: '1px solid #ccc',
            borderRadius: 1,
            cursor: 'pointer',
          }}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'color';
            input.value = value;
            input.onchange = (e) => onChange((e.target as HTMLInputElement).value);
            input.click();
          }}
        />
        <TextField
          size="small"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          sx={{ flex: 1 }}
        />
      </Box>
    </Box>
  );
};

interface TenantThemeDialogProps {
  open: boolean;
  tenant: { id: string; businessName: string } | null;
  onClose: () => void;
  onSaved?: () => void;
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
}

const TenantThemeDialog: React.FC<TenantThemeDialogProps> = ({ open, tenant, onClose, onSaved, onError, onSuccess }) => {
  const [theme, setTheme] = useState<ThemeConfiguration>(defaultTheme);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !tenant) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const response = await superAdminApi.getTenantTheme(tenant.id);
        const data = (response as any).data || response;
        if (active && data) setTheme({ ...defaultTheme, ...data });
      } catch (err: any) {
        onError?.(err?.response?.data?.message || 'Error cargando el tema del negocio');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [open, tenant, onError]);

  const change = (field: keyof ThemeConfiguration, value: string) => {
    setTheme(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      await superAdminApi.saveTenantTheme(tenant.id, theme);
      onSuccess?.('Tema actualizado exitosamente');
      onSaved?.();
      onClose();
    } catch (err: any) {
      onError?.(err?.response?.data?.message || 'Error actualizando el tema');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      const response = await superAdminApi.resetTenantTheme(tenant.id);
      const data = (response as any).data || response;
      if (data) setTheme({ ...defaultTheme, ...data });
      onSuccess?.('Tema restablecido a valores por defecto');
    } catch (err: any) {
      onError?.(err?.response?.data?.message || 'Error restableciendo el tema');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Palette /> Personalizar Tema{tenant ? ` - ${tenant.businessName}` : ''}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <Typography>Cargando configuración del tema...</Typography>
          </Box>
        ) : (
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Colores Principales</Typography>
              <Divider sx={{ mb: 2 }} />
              <ThemeColorRow label="Color Primario" value={theme.primaryColor} onChange={(v) => change('primaryColor', v)} />
              <ThemeColorRow label="Color Secundario" value={theme.secondaryColor} onChange={(v) => change('secondaryColor', v)} />
              <ThemeColorRow label="Color de Acento" value={theme.accentColor} onChange={(v) => change('accentColor', v)} />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Colores de Fondo</Typography>
              <Divider sx={{ mb: 2 }} />
              <ThemeColorRow label="Fondo Principal" value={theme.backgroundColor} onChange={(v) => change('backgroundColor', v)} />
              <ThemeColorRow label="Superficie" value={theme.surfaceColor} onChange={(v) => change('surfaceColor', v)} />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Colores de Estado</Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <ThemeColorRow size="small" label="Error" value={theme.errorColor} onChange={(v) => change('errorColor', v)} />
                </Grid>
                <Grid item xs={6} md={3}>
                  <ThemeColorRow size="small" label="Advertencia" value={theme.warningColor} onChange={(v) => change('warningColor', v)} />
                </Grid>
                <Grid item xs={6} md={3}>
                  <ThemeColorRow size="small" label="Información" value={theme.infoColor} onChange={(v) => change('infoColor', v)} />
                </Grid>
                <Grid item xs={6} md={3}>
                  <ThemeColorRow size="small" label="Éxito" value={theme.successColor} onChange={(v) => change('successColor', v)} />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Vista Previa</Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ p: 2, backgroundColor: theme.backgroundColor, borderRadius: 1 }}>
                <Box sx={{ p: 2, backgroundColor: theme.surfaceColor, borderRadius: theme.borderRadius / 8, mb: 2 }}>
                  <Typography variant="h6" sx={{ color: theme.textPrimaryColor, mb: 1 }}>
                    Ejemplo de Título
                  </Typography>
                  <Typography variant="body1" sx={{ color: theme.textSecondaryColor, mb: 2 }}>
                    Este es un texto de ejemplo para mostrar cómo se verán los colores.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button variant="contained" sx={{ backgroundColor: theme.primaryColor }}>
                      Botón Primario
                    </Button>
                    <Chip label="Éxito" sx={{ backgroundColor: theme.successColor, color: 'white' }} />
                    <Chip label="Error" sx={{ backgroundColor: theme.errorColor, color: 'white' }} />
                    <Chip label="Info" sx={{ backgroundColor: theme.infoColor, color: 'white' }} />
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleReset} disabled={loading}>Restablecer</Button>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" startIcon={<Save />} disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar Tema'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TenantThemeDialog;
