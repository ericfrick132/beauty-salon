import React, { useEffect, useState } from 'react';
import {
  Container, Box, Typography, Grid, Card, CardContent, TextField, Button, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import api, { inventoryApi } from '../services/api';

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
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDto | null>(null);
  const [priceForm, setPriceForm] = useState({ costPrice: '', salePrice: '', reason: '' });

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

  const closePriceDialog = () => {
    setPriceDialogOpen(false);
    setEditingProduct(null);
  };

  const openPriceDialog = (product: ProductDto) => {
    setEditingProduct(product);
    setPriceForm({
      costPrice: product.costPrice.toString(),
      salePrice: product.salePrice.toString(),
      reason: '',
    });
    setPriceDialogOpen(true);
  };

  const handleUpdatePrice = async () => {
    if (!editingProduct) return;
    const costPrice = Number(priceForm.costPrice);
    const salePrice = Number(priceForm.salePrice);

    if (isNaN(costPrice) || isNaN(salePrice) || costPrice < 0 || salePrice <= 0) {
      setMessage({ type: 'error', text: 'Ingrese valores válidos para los precios' });
      return;
    }

    try {
      await inventoryApi.updateProductPrice(editingProduct.id, {
        costPrice,
        salePrice,
        reason: priceForm.reason || undefined,
      });
      setMessage({ type: 'success', text: 'Precios actualizados' });
      setPriceDialogOpen(false);
      setEditingProduct(null);
      await load();
    } catch (err: any) {
      const text = err?.response?.data?.error || 'Error al actualizar precios';
      setMessage({ type: 'error', text });
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
                  <TableCell align="center">Acciones</TableCell>
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
                    <TableCell align="center">
                      <Button size="small" variant="outlined" onClick={() => openPriceDialog(p)}>
                        Editar precio
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={priceDialogOpen} onClose={closePriceDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Actualizar precios</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
            <TextField
              label="Precio de costo"
              type="number"
              value={priceForm.costPrice}
              onChange={(e) => setPriceForm({ ...priceForm, costPrice: e.target.value })}
            />
            <TextField
              label="Precio de venta"
              type="number"
              value={priceForm.salePrice}
              onChange={(e) => setPriceForm({ ...priceForm, salePrice: e.target.value })}
            />
            <TextField
              label="Motivo (opcional)"
              multiline
              rows={2}
              value={priceForm.reason}
              onChange={(e) => setPriceForm({ ...priceForm, reason: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closePriceDialog}>Cancelar</Button>
          <Button variant="contained" onClick={handleUpdatePrice}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Products;
