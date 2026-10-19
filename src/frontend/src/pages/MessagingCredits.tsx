import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { messagingApi, PlanUsage, subscriptionApi } from '../services/api';

const MessagingCredits: React.FC = () => {
  const [balance, setBalance] = useState<{ balance: number; totalPurchased: number; totalSent: number } | null>(null);
  const [packages, setPackages] = useState<any[]>([]);
  // Los mensajes salen primero de los incluidos en el plan del mes y después de los packs comprados.
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const [b, p] = await Promise.all([messagingApi.getBalance(), messagingApi.getPackages()]);
      setBalance(b);
      setPackages(p);
    } catch (e: any) {
      setError('No se pudo cargar la información.');
    }
  };

  useEffect(() => {
    load();
    subscriptionApi.usage().then(setUsage).catch(() => setUsage(null));
  }, []);

  const limit = usage?.whatsAppMonthlyLimit;
  const remaining = usage?.whatsAppIncludedRemaining;

  const buy = async (id: string) => {
    try {
      const res = await messagingApi.purchase(id);
      if (res.paymentLink) {
        window.open(res.paymentLink, '_blank');
      }
    } catch (e: any) {
      setError('Error al crear el enlace de pago.');
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Créditos de Mensajes</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Mi Balance</Typography>
              {usage && limit !== undefined && (
                <Box sx={{ mt: 1, mb: 1.5, p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
                  {limit < 0 ? (
                    <Typography variant="body2">Incluidos en tu plan {usage.planName}: <strong>ilimitados</strong></Typography>
                  ) : limit > 0 ? (
                    <Typography variant="body2">
                      Incluidos en tu plan este mes: <strong>{Math.max(0, limit - Math.max(0, remaining ?? 0))} de {limit}</strong> usados
                    </Typography>
                  ) : (
                    <>
                      <Typography variant="body2">Tu plan {usage.planName} no incluye mensajes de WhatsApp.</Typography>
                      <Button size="small" sx={{ mt: 0.5, px: 0 }} onClick={() => navigate('/subscription/plans?highlight=plus&from=whatsapp')}>
                        Plus incluye 30 por mes
                      </Button>
                    </>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Primero se usan los incluidos; después, los de los packs.
                  </Typography>
                </Box>
              )}
              <Typography variant="body1" sx={{ mt: 1 }}>Packs comprados disponibles: <strong>{balance?.balance ?? 0}</strong></Typography>
              <Typography variant="body2">Comprados: {balance?.totalPurchased ?? 0}</Typography>
              <Typography variant="body2">Enviados: {balance?.totalSent ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <Grid container spacing={2}>
            {packages.map((p) => (
              <Grid item xs={12} sm={6} md={4} key={p.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">{p.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{p.quantity} mensajes</Typography>
                    <Typography variant="h5" sx={{ mt: 1 }}>${p.price} {p.currency}</Typography>
                    <Button variant="contained" fullWidth sx={{ mt: 2 }} onClick={() => buy(p.id)}>Comprar</Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MessagingCredits;

