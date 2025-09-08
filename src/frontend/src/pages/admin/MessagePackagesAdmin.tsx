import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, TextField, Switch, Button, IconButton, Alert } from '@mui/material';
import { messagePackagesAdminApi } from '../../services/api';
import DeleteIcon from '@mui/icons-material/Delete';

type Pack = { id?: string; name: string; quantity: number; price: number; currency: string; isActive: boolean };

const MessagePackagesAdmin: React.FC = () => {
  const [list, setList] = useState<Pack[]>([]);
  const [form, setForm] = useState<Pack>({ name: 'Paquete 100', quantity: 100, price: 1000, currency: 'ARS', isActive: true });
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const items = await messagePackagesAdminApi.list();
      setList(items);
    } catch (e: any) {
      setError('No se pudieron cargar los paquetes');
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    try {
      await messagePackagesAdminApi.create(form);
      setForm({ name: 'Paquete 100', quantity: 100, price: 1000, currency: 'ARS', isActive: true });
      load();
    } catch {
      setError('Error creando paquete');
    }
  };

  const update = async (p: Pack) => {
    if (!p.id) return;
    try {
      await messagePackagesAdminApi.update(p.id, p);
      load();
    } catch {
      setError('Error actualizando paquete');
    }
  };

  const remove = async (id: string) => {
    try {
      await messagePackagesAdminApi.remove(id);
      load();
    } catch {
      setError('Error eliminando paquete');
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Paquetes de Mensajes (Super Admin)</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6">Crear nuevo paquete</Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={4}><TextField label="Nombre" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} fullWidth /></Grid>
            <Grid item xs={6} sm={2}><TextField label="Cantidad" type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value, 10) })} fullWidth /></Grid>
            <Grid item xs={6} sm={2}><TextField label="Precio" type="number" value={form.price} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) })} fullWidth /></Grid>
            <Grid item xs={6} sm={2}><TextField label="Moneda" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} fullWidth /></Grid>
            <Grid item xs={6} sm={2}>
              <Box display="flex" alignItems="center" height="100%">
                <Switch checked={form.isActive} onChange={(_, v) => setForm({ ...form, isActive: v })} /> Activo
              </Box>
            </Grid>
          </Grid>
          <Button variant="contained" sx={{ mt: 2 }} onClick={create}>Crear</Button>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {list.map((p) => (
          <Grid item xs={12} md={6} key={p.id}>
            <Card>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}><TextField label="Nombre" value={p.name} onChange={e => setList(list.map(x => x.id === p.id ? { ...x, name: e.target.value } : x))} fullWidth /></Grid>
                  <Grid item xs={6} sm={2}><TextField label="Cantidad" type="number" value={p.quantity} onChange={e => setList(list.map(x => x.id === p.id ? { ...x, quantity: parseInt(e.target.value, 10) } : x))} fullWidth /></Grid>
                  <Grid item xs={6} sm={2}><TextField label="Precio" type="number" value={p.price} onChange={e => setList(list.map(x => x.id === p.id ? { ...x, price: parseFloat(e.target.value) } : x))} fullWidth /></Grid>
                  <Grid item xs={6} sm={2}><TextField label="Moneda" value={p.currency} onChange={e => setList(list.map(x => x.id === p.id ? { ...x, currency: e.target.value } : x))} fullWidth /></Grid>
                  <Grid item xs={6} sm={1}>
                    <Switch checked={p.isActive} onChange={(_, v) => setList(list.map(x => x.id === p.id ? { ...x, isActive: v } : x))} />
                  </Grid>
                  <Grid item xs={6} sm={1}>
                    <IconButton onClick={() => p.id && remove(p.id)}><DeleteIcon /></IconButton>
                  </Grid>
                </Grid>
                <Box mt={2}><Button variant="outlined" onClick={() => update(p)}>Guardar</Button></Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default MessagePackagesAdmin;

