import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Button,
  Box,
  TextField,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  Divider,
  Chip,
} from '@mui/material';
import {
  Save,
  Refresh,
  Palette,
  FormatPaint,
  ColorLens,
  Visibility,
  ContentCopy,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import axios from 'axios';
import { ThemeConfiguration } from '../types';

const ThemeSettings: React.FC = () => {
  const [themeConfig, setThemeConfig] = useState<ThemeConfiguration>({
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
  });

  const [originalTheme, setOriginalTheme] = useState<ThemeConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    loadThemeConfiguration();
  }, []);

  const loadThemeConfiguration = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/themeconfiguration');
      const theme = response.data.data;
      setThemeConfig(theme);
      setOriginalTheme(theme);
    } catch (error) {
      console.error('Error loading theme configuration:', error);
      setSnackbar({ open: true, message: 'Error al cargar la configuración del tema', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleColorChange = (field: keyof ThemeConfiguration, value: string) => {
    setThemeConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveTheme = async () => {
    try {
      setSaving(true);
      await axios.post('/api/themeconfiguration', themeConfig);
      setOriginalTheme(themeConfig);
      setSnackbar({ open: true, message: 'Tema guardado exitosamente', severity: 'success' });
      
      // Reload the page to apply new theme
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error saving theme configuration:', error);
      setSnackbar({ open: true, message: 'Error al guardar el tema', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetTheme = async () => {
    try {
      setSaving(true);
      const response = await axios.post('/api/themeconfiguration/reset');
      const theme = response.data.data;
      setThemeConfig(theme);
      setOriginalTheme(theme);
      setSnackbar({ open: true, message: 'Tema restablecido a valores por defecto', severity: 'success' });
      
      // Reload the page to apply new theme
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error resetting theme configuration:', error);
      setSnackbar({ open: true, message: 'Error al restablecer el tema', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (color: string) => {
    navigator.clipboard.writeText(color);
    setSnackbar({ open: true, message: 'Color copiado al portapapeles', severity: 'success' });
  };

  const hasChanges = JSON.stringify(themeConfig) !== JSON.stringify(originalTheme);

  const ColorInput: React.FC<{
    label: string;
    field: keyof ThemeConfiguration;
    description?: string;
  }> = ({ label, field, description }) => {
    const value = themeConfig[field] as string;
    
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          {label}
        </Typography>
        {description && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {description}
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              backgroundColor: value,
              border: '1px solid #ccc',
              borderRadius: 1,
              cursor: 'pointer',
            }}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'color';
              input.value = value;
              input.onchange = (e) => {
                handleColorChange(field, (e.target as HTMLInputElement).value);
              };
              input.click();
            }}
          />
          <TextField
            size="small"
            value={value}
            onChange={(e) => handleColorChange(field, e.target.value)}
            sx={{ flex: 1 }}
            placeholder="#000000"
          />
          <Tooltip title="Copiar color">
            <IconButton size="small" onClick={() => copyToClipboard(value)}>
              <ContentCopy fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>Cargando configuración del tema...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Palette /> Configuración del Tema
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Personaliza los colores y apariencia de tu negocio
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleResetTheme}
              disabled={saving}
            >
              Restablecer
            </Button>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSaveTheme}
              disabled={saving || !hasChanges}
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </Box>
        </Box>

        {hasChanges && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Tienes cambios sin guardar. Los cambios se aplicarán cuando guardes y la página se recargará.
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Colores Principales */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ColorLens /> Colores Principales
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <ColorInput
                  label="Color Primario"
                  field="primaryColor"
                  description="Color principal de tu marca (botones, enlaces, elementos destacados)"
                />
                
                <ColorInput
                  label="Color Secundario"
                  field="secondaryColor"
                  description="Color complementario para elementos secundarios"
                />
                
                <ColorInput
                  label="Color de Acento"
                  field="accentColor"
                  description="Color para resaltar elementos importantes o llamadas a la acción"
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Colores de Fondo */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FormatPaint /> Colores de Fondo
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <ColorInput
                  label="Fondo Principal"
                  field="backgroundColor"
                  description="Color de fondo de la aplicación"
                />
                
                <ColorInput
                  label="Fondo de Superficie"
                  field="surfaceColor"
                  description="Color de fondo para tarjetas y paneles"
                />
                
                <ColorInput
                  label="Color de Borde"
                  field="borderColor"
                  description="Color para bordes y divisores"
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Colores de Estado */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Estados y Notificaciones
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <ColorInput
                  label="Error"
                  field="errorColor"
                  description="Para mensajes de error y validaciones"
                />
                
                <ColorInput
                  label="Advertencia"
                  field="warningColor"
                  description="Para alertas y advertencias"
                />
                
                <ColorInput
                  label="Información"
                  field="infoColor"
                  description="Para mensajes informativos"
                />
                
                <ColorInput
                  label="Éxito"
                  field="successColor"
                  description="Para confirmaciones y acciones exitosas"
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Colores de Texto */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Colores de Texto
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <ColorInput
                  label="Texto Principal"
                  field="textPrimaryColor"
                  description="Color para títulos y texto principal"
                />
                
                <ColorInput
                  label="Texto Secundario"
                  field="textSecondaryColor"
                  description="Color para texto secundario y descripciones"
                />

                <Box sx={{ mt: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={themeConfig.autoContrastText}
                        onChange={(e) => setThemeConfig(prev => ({ ...prev, autoContrastText: e.target.checked }))}
                      />
                    }
                    label="Ajustar automáticamente el contraste del texto"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
                    Ajusta automáticamente el color del texto para mejor legibilidad
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Configuración Adicional */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Configuración Adicional
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Familia de Fuente"
                      value={themeConfig.fontFamily}
                      onChange={(e) => setThemeConfig(prev => ({ ...prev, fontFamily: e.target.value }))}
                      helperText="Ej: Roboto, Arial, sans-serif"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Radio de Borde (px)"
                      value={themeConfig.borderRadius}
                      onChange={(e) => setThemeConfig(prev => ({ ...prev, borderRadius: parseInt(e.target.value) || 0 }))}
                      inputProps={{ min: 0, max: 50 }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={3}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={themeConfig.useShadows}
                          onChange={(e) => setThemeConfig(prev => ({ ...prev, useShadows: e.target.checked }))}
                        />
                      }
                      label="Usar sombras"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Vista Previa */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Visibility /> Vista Previa
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ p: 2, backgroundColor: themeConfig.backgroundColor, borderRadius: 1 }}>
                  <Box sx={{ p: 2, backgroundColor: themeConfig.surfaceColor, borderRadius: themeConfig.borderRadius / 8, mb: 2 }}>
                    <Typography variant="h6" sx={{ color: themeConfig.textPrimaryColor, mb: 1 }}>
                      Título de Ejemplo
                    </Typography>
                    <Typography variant="body1" sx={{ color: themeConfig.textSecondaryColor, mb: 2 }}>
                      Este es un texto de ejemplo para mostrar cómo se verán los colores en tu aplicación.
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Button variant="contained" sx={{ backgroundColor: themeConfig.primaryColor }}>
                        Botón Primario
                      </Button>
                      <Button variant="outlined" sx={{ borderColor: themeConfig.primaryColor, color: themeConfig.primaryColor }}>
                        Botón Secundario
                      </Button>
                      <Chip label="Éxito" sx={{ backgroundColor: themeConfig.successColor, color: 'white' }} />
                      <Chip label="Error" sx={{ backgroundColor: themeConfig.errorColor, color: 'white' }} />
                      <Chip label="Advertencia" sx={{ backgroundColor: themeConfig.warningColor, color: 'white' }} />
                      <Chip label="Info" sx={{ backgroundColor: themeConfig.infoColor, color: 'white' }} />
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </motion.div>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ThemeSettings;