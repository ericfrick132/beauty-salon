import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Select,
  TextField,
  Typography,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@mui/material';
import { Add, Delete, Remove, QrCodeScanner } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface ProductDto {
  id: string;
  barcode: number;
  name: string;
  salePrice: number;
  costPrice: number;
  currentStock: number;
  taxRate: number;
}

interface CartItem {
  productId: string;
  name: string;
  barcode: number;
  unitPrice: number;
  quantity: number;
  discountPct: number;
  taxRate: number;
}

const SalesPOS: React.FC = () => {
  const navigate = useNavigate();
  const [barcode, setBarcode] = useState('');
  const [items, setItems] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [receivedAmount, setReceivedAmount] = useState<number | ''>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = () => inputRef.current?.focus();
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  const totals = useMemo(() => {
    let sub = 0, disc = 0, tax = 0;
    items.forEach(i => {
      const lineBase = i.unitPrice * i.quantity;
      const lineDisc = i.discountPct > 0 ? lineBase * (i.discountPct / 100) : 0;
      const taxable = lineBase - lineDisc;
      const lineTax = i.taxRate > 0 ? taxable * (i.taxRate / 100) : 0;
      sub += lineBase;
      disc += lineDisc;
      tax += lineTax;
    });
    const total = sub - disc + tax;
    return { sub, disc, tax, total };
  }, [items]);

  const handleScan = async () => {
    const code = barcode.trim();
    if (!code) return;
    try {
      const resp = await api.get(`/inventory/products/by-barcode/${code}`);
      const p: ProductDto = resp.data;
      setItems(prev => {
        const existing = prev.find(i => i.productId === p.id);
        if (existing) {
          return prev.map(i => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i);
        }
        return [
          ...prev,
          {
            productId: p.id,
            name: p.name,
            barcode: p.barcode,
            unitPrice: p.salePrice,
            quantity: 1,
            discountPct: 0,
            taxRate: p.taxRate || 0,
          }
        ];
      });
      setBarcode('');
      inputRef.current?.focus();
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Producto no encontrado' });
      setBarcode('');
    }
  };

  const updateQty = (id: string, delta: number) => {
    setItems(prev => prev.map(i => i.productId === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.productId !== id));

  const confirmSale = async () => {
    if (items.length === 0) return;
    try {
      const payload = {
        paymentMethod,
        receivedAmount: paymentMethod === 'cash' ? (receivedAmount || 0) : undefined,
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity, discountPercentage: i.discountPct }))
      };
      const resp = await api.post('/sales', payload);
      setMessage({ type: 'success', text: 'Venta registrada correctamente' });
      setItems([]);
      setReceivedAmount('');
    } catch (err: any) {
      const text = err?.response?.data?.error || 'Error al registrar la venta';
      setMessage({ type: 'error', text });
    }
  };

  const change = paymentMethod === 'cash' && typeof receivedAmount === 'number' ? Math.max(0, receivedAmount - totals.total) : 0;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <QrCodeScanner sx={{ mr: 1 }} />
          <Typography variant="h5">Venta de artículos (POS)</Typography>
        </Box>
        <Button variant="outlined" onClick={() => navigate('/products')}>
          Gestionar productos
        </Button>
      </Box>

      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 2 }}>{message.text}</Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                inputRef={inputRef}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleScan(); }}
                label="Escanea código de barras"
                fullWidth
                autoFocus
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Select fullWidth value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <MenuItem value="cash">Efectivo</MenuItem>
                <MenuItem value="card">Tarjeta</MenuItem>
                <MenuItem value="transfer">Transferencia</MenuItem>
                <MenuItem value="mercadopago">MercadoPago</MenuItem>
              </Select>
            </Grid>
            {paymentMethod === 'cash' && (
              <Grid item xs={12} md={3}>
                <TextField
                  label="Importe recibido"
                  type="number"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  fullWidth
                />
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Producto</TableCell>
                    <TableCell align="right">Precio</TableCell>
                    <TableCell align="center">Cantidad</TableCell>
                    <TableCell align="right">Desc. %</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                    <TableCell align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map(item => {
                    const lineBase = item.unitPrice * item.quantity;
                    const lineDisc = item.discountPct > 0 ? lineBase * (item.discountPct / 100) : 0;
                    const taxable = lineBase - lineDisc;
                    const lineTax = item.taxRate > 0 ? taxable * (item.taxRate / 100) : 0;
                    const lineTotal = taxable + lineTax;
                    return (
                      <TableRow key={item.productId}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{item.name}</Typography>
                          <Typography variant="caption">{item.barcode}</Typography>
                        </TableCell>
                        <TableCell align="right">${item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell align="center">
                          <IconButton size="small" onClick={() => updateQty(item.productId, -1)}><Remove /></IconButton>
                          <Typography component="span" sx={{ mx: 1 }}>{item.quantity}</Typography>
                          <IconButton size="small" onClick={() => updateQty(item.productId, 1)}><Add /></IconButton>
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            value={item.discountPct}
                            onChange={(e) => setItems(prev => prev.map(i => i.productId === item.productId ? { ...i, discountPct: Math.max(0, Math.min(100, Number(e.target.value))) } : i))}
                            sx={{ width: 90 }}
                          />
                        </TableCell>
                        <TableCell align="right">${lineTotal.toFixed(2)}</TableCell>
                        <TableCell align="center">
                          <IconButton color="error" onClick={() => removeItem(item.productId)}><Delete /></IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="text.secondary">Escanea un producto para agregarlo</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Resumen</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="text.secondary">Subtotal</Typography>
                <Typography>${totals.sub.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="text.secondary">Descuentos</Typography>
                <Typography>-${totals.disc.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="text.secondary">Impuestos</Typography>
                <Typography>${totals.tax.toFixed(2)}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Total</Typography>
                <Typography variant="h6">${totals.total.toFixed(2)}</Typography>
              </Box>
              {paymentMethod === 'cash' && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography color="text.secondary">Vuelto</Typography>
                  <Typography>${change.toFixed(2)}</Typography>
                </Box>
              )}
              <Button variant="contained" color="primary" fullWidth disabled={items.length === 0} onClick={confirmSale}>
                Confirmar venta
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default SalesPOS;
