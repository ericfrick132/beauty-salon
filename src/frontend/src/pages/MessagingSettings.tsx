import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Switch, TextField, Button, Grid, Alert } from '@mui/material';
import { messagingApi } from '../services/api';

const defaultTemplate = 'Hola {customer_name}! Te recordamos tu turno para {service_name} el {date} a las {time}. Si no podés asistir, avisanos respondiendo este mensaje.';

const tokenHelp = '{customer_name}, {service_name}, {date}, {time}, {business_name}';

const MessagingSettings: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [minutes, setMinutes] = useState(60);
  const [template, setTemplate] = useState(defaultTemplate);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const s = await messagingApi.getSettings();
      setEnabled(!!s.whatsappRemindersEnabled);
      setMinutes(s.reminderAdvanceMinutes ?? 60);
      setTemplate(s.reminderTemplate || defaultTemplate);
    } catch (e: any) {
      setError('No se pudieron cargar los ajustes.');
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true); setSaved(null); setError(null);
    try {
      await messagingApi.updateSettings({ whatsappRemindersEnabled: enabled, reminderAdvanceMinutes: minutes, reminderTemplate: template });
      setSaved('Ajustes guardados');
    } catch (e: any) {
      setError('Error guardando ajustes');
    } finally { setSaving(false); }
  };

  const preview = () => {
    const now = new Date();
    const date = now.toLocaleDateString('es-AR');
    const time = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    return template
      .replace('{customer_name}', 'Juan Pérez')
      .replace('{service_name}', 'Corte y Peinado')
      .replace('{date}', date)
      .replace('{time}', time)
      .replace('{business_name}', 'Mi Negocio');
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Mensajería y Recordatorios</Typography>
      {saved && <Alert severity="success" sx={{ mb: 2 }}>{saved}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6">Recordatorios por WhatsApp</Typography>
              <Box display="flex" alignItems="center" mt={2}>
                <Switch checked={enabled} onChange={(_, v) => setEnabled(v)} />
                <Typography>Habilitar</Typography>
              </Box>
              <TextField
                label="Minutos antes de la cita"
                type="number"
                value={minutes}
                onChange={e => setMinutes(parseInt(e.target.value || '0', 10))}
                fullWidth
                sx={{ mt: 2 }}
                inputProps={{ min: 5, step: 5 }}
              />
              <TextField
                label="Plantilla de mensaje"
                value={template}
                onChange={e => setTemplate(e.target.value)}
                fullWidth
                multiline
                minRows={4}
                sx={{ mt: 2 }}
                helperText={`Tokens: ${tokenHelp}`}
              />
              <Box mt={2}>
                <Typography variant="subtitle2">Vista previa</Typography>
                <Card variant="outlined" sx={{ mt: 1 }}>
                  <CardContent>
                    <Typography variant="body2">{preview()}</Typography>
                  </CardContent>
                </Card>
              </Box>
              <Button variant="contained" sx={{ mt: 2 }} onClick={save} disabled={saving}>
                Guardar
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MessagingSettings;

