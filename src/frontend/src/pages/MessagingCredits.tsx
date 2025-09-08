import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, Alert } from '@mui/material';
import { messagingApi } from '../services/api';

const MessagingCredits: React.FC = () => {
  const [balance, setBalance] = useState<{ balance: number; totalPurchased: number; totalSent: number } | null>(null);
  const [packages, setPackages] = useState<any[]>([]);
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

  useEffect(() => { load(); }, []);

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
              <Typography variant="body1" sx={{ mt: 1 }}>Disponibles: <strong>{balance?.balance ?? 0}</strong></Typography>
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

