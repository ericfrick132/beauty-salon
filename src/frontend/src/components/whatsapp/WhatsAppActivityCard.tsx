import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Typography } from '@mui/material';
import { menuBotApi, WhatsAppInboundEvent } from '../../services/api';
import { describeInboundEvent, formatEventTime, formatSender, ActivityTone } from './whatsappActivity';

const toneColor: Record<ActivityTone, string> = {
  ok: '#2e7d32',
  warn: '#ed6c02',
  error: '#d32f2f',
  pending: '#9e9e9e',
};

/**
 * Últimos mensajes que recibió el WhatsApp del negocio y qué hizo el asistente con cada uno.
 * Existe para que "no me responde" tenga una explicación a la vista (lo mandó desde el mismo
 * celular, el asistente está apagado, no era texto...) sin tener que escribirnos.
 */
const WhatsAppActivityCard: React.FC<{ whoAnswers?: string }> = ({ whoAnswers = 'el negocio' }) => {
  const [events, setEvents] = useState<WhatsAppInboundEvent[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEvents(await menuBotApi.activity());
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="subtitle1" fontWeight={700}>Actividad reciente</Typography>
          <Button size="small" onClick={load} disabled={loading}>{loading ? 'Actualizando…' : '↻ Actualizar'}</Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Para probarlo, escribile a tu número desde <strong>otro celular</strong>: los mensajes que salen de tu propio WhatsApp no se responden.
        </Typography>

        {events === null ? (
          <Typography variant="body2" color="text.secondary">Cargando…</Typography>
        ) : events.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Todavía no llegó ningún mensaje a tu WhatsApp conectado.</Typography>
        ) : (
          <Box>
            {events.map((e) => {
              const d = describeInboundEvent(e, whoAnswers);
              return (
                <Box key={e.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ mt: 0.9, width: 8, height: 8, borderRadius: '50%', bgcolor: toneColor[d.tone], flexShrink: 0 }} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                      <Typography variant="body2" noWrap>{formatSender(e)}</Typography>
                      <Typography variant="caption" color="text.secondary">{formatEventTime(e.receivedAt)}</Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: toneColor[d.tone], display: 'block' }}>{d.label}</Typography>
                    {d.hint && <Typography variant="caption" color="text.secondary">{d.hint}</Typography>}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default WhatsAppActivityCard;
