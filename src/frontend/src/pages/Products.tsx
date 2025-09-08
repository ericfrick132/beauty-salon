import React, { useEffect, useState } from 'react';
import {
  Container, Box, Typography, Grid, Card, CardContent, TextField, Button, Alert,
  Table, TableHead, TableRow, TableCell, TableBody
} from '@mui/material';
import api from '../services/api';

interface ProductForm {
  barcode: string;
  name: string;
  categoryId?: string;
  costPrice: string;
  salePrice: string;
  initialStock: string;
}

interface ProductDto {
  id: string;
  barcode: number;
  name: string;
  salePrice: number;
  costPrice: number;
  currentStock: number;
}

const Products: React.FC = () => {
  const [form, setForm] = useState<ProductForm>({ barcode: '', name: '', costPrice: '', salePrice: '', initialStock: '0' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [items, setItems] = useState<ProductDto[]>([]);

  const load = async () => {
    const resp = await api.get('/inventory/products');
    setItems(resp.data);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    try {
      const payload = {
        barcode: Number(form.barcode),
        name: form.name.trim(),
        costPrice: Number(form.costPrice),
        salePrice: Number(form.salePrice),
        initialStock: Number(form.initialStock || '0'),
      };
      if (!payload.barcode || !payload.name || isNaN(payload.costPrice) || isNaN(payload.salePrice)) {
        setMessage({ type: 'error', text: 'Complete los campos obligatorios' });
        return;
      }
      await api.post('/inventory/products', payload);
      setMessage({ type: 'success', text: 'Producto creado' });
      setForm({ barcode: '', name: '', costPrice: '', salePrice: '', initialStock: '0' });
      await load();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.error || 'Error al crear producto' });
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Gestión de Productos</Typography>
      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 2 }}>{message.text}</Alert>
      )}
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>Alta de producto</Typography>
              <Box sx={{ display: 'grid', gap: 2 }}>
                <TextField label="Código de barras" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value.replace(/[^0-9]/g, '') })} />
                <TextField label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <TextField label="Precio de costo" type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
                <TextField label="Precio de venta" type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} />
                <TextField label="Stock inicial" type="number" value={form.initialStock} onChange={(e) => setForm({ ...form, initialStock: e.target.value })} />
                <Button variant="contained" onClick={submit}>Guardar</Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>Productos</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Código</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell align="right">Costo</TableCell>
                    <TableCell align="right">Venta</TableCell>
                    <TableCell align="right">Stock</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{p.barcode}</TableCell>
                      <TableCell>{p.name}</TableCell>
                      <TableCell align="right">${p.costPrice.toFixed(2)}</TableCell>
                      <TableCell align="right">${p.salePrice.toFixed(2)}</TableCell>
                      <TableCell align="right">{p.currentStock}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Products;

