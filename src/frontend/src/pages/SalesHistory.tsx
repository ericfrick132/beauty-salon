import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Block, KeyboardArrowDown, KeyboardArrowUp, ReceiptLong, Storefront } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { endOfDay, format, startOfDay, startOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { salesApi } from '../services/api';
import { isAdminLike } from '../utils/permissions';
import { useAppSelector } from '../store';

interface SaleItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

interface Sale {
  id: string;
  saleNumber: string;
  customerName?: string;
  employeeName?: string;
  bookingId?: string;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  saleDate: string;
  cancellationReason?: string;
  items: SaleItem[];
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  mercadopago: 'MercadoPago',
};

const money = (n: number) => `$${n.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;

const SaleRow: React.FC<{ sale: Sale; canCancel: boolean; onCancel: (s: Sale) => void }> = ({ sale, canCancel, onCancel }) => {
  const [open, setOpen] = useState(false);
  const cancelled = sale.status === 'cancelled';
  return (
    <>
      <TableRow sx={{ opacity: cancelled ? 0.55 : 1, '& > td': { borderBottom: open ? 'none' : undefined } }}>
        <TableCell padding="checkbox">
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell>{format(new Date(sale.saleDate), 'dd/MM/yyyy HH:mm')}</TableCell>
        <TableCell>
          {sale.items.map((i) => `${i.quantity}× ${i.productName}`).join(', ')}
          {sale.bookingId && <Chip label="Con turno" size="small" sx={{ ml: 1 }} />}
        </TableCell>
        <TableCell>{sale.customerName || '—'}</TableCell>
        <TableCell>{sale.employeeName || '—'}</TableCell>
        <TableCell>{METHOD_LABELS[sale.paymentMethod] ?? sale.paymentMethod}</TableCell>
        <TableCell align="right" sx={{ fontWeight: 600, textDecoration: cancelled ? 'line-through' : 'none' }}>
          {money(sale.totalAmount)}
        </TableCell>
        <TableCell align="right">
          {cancelled ? (
            <Chip label="Anulada" size="small" color="error" variant="outlined" />
          ) : (
            canCancel && (
              <Button size="small" color="error" startIcon={<Block />} onClick={() => onCancel(sale)}>
                Anular
              </Button>
            )
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={8} sx={{ py: 0 }}>
          <Collapse in={open} unmountOnExit>
            <Box sx={{ py: 2, pl: 6 }}>
              <Typography variant="caption" color="text.secondary">
                {sale.saleNumber}
                {cancelled && sale.cancellationReason && ` · Motivo de anulación: ${sale.cancellationReason}`}
              </Typography>
              <Table size="small">
                <TableBody>
                  {sale.items.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{i.productName}</TableCell>
                      <TableCell align="center">{i.quantity}</TableCell>
                      <TableCell align="right">{money(i.unitPrice)}</TableCell>
                      <TableCell align="right">{money(i.totalAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const SalesHistory: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAppSelector((state) => state.auth.user);
  const canCancel = isAdminLike(currentUser?.role);
  const [from, setFrom] = useState<Date | null>(startOfMonth(new Date()));
  const [to, setTo] = useState<Date | null>(new Date());
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toCancel, setToCancel] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    if (!from || !to) return;
    setLoading(true);
    try {
      setSales(
        await salesApi.list({
          startDate: startOfDay(from).toISOString(),
          endDate: endOfDay(to).toISOString(),
        })
      );
      setError(null);
    } catch {
      setError('No se pudieron cargar las ventas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [from, to]);

  const summary = useMemo(() => {
    const active = sales.filter((s) => s.status !== 'cancelled');
    const total = active.reduce((a, s) => a + s.totalAmount, 0);
    const units = active.reduce((a, s) => a + s.items.reduce((b, i) => b + i.quantity, 0), 0);
    return { total, count: active.length, units, avg: active.length ? total / active.length : 0 };
  }, [sales]);

  const confirmCancel = async () => {
    if (!toCancel) return;
    setCancelling(true);
    try {
      await salesApi.cancel(toCancel.id, cancelReason || undefined);
      setToCancel(null);
      setCancelReason('');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo anular la venta');
      setToCancel(null);
    } finally {
      setCancelling(false);
    }
  };

  const kpis = [
    { label: 'Vendido', value: money(summary.total) },
    { label: 'Ventas', value: summary.count },
    { label: 'Unidades', value: summary.units },
    { label: 'Ticket promedio', value: money(summary.avg) },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptLong />
          <Typography variant="h5">Historial de ventas</Typography>
        </Box>
        <Button variant="contained" startIcon={<Storefront />} onClick={() => navigate('/pos')}>
          Nueva venta
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <DatePicker label="Desde" value={from} onChange={setFrom} slotProps={{ textField: { fullWidth: true } }} />
            </Grid>
            <Grid item xs={6} md={3}>
              <DatePicker label="Hasta" value={to} onChange={setTo} slotProps={{ textField: { fullWidth: true } }} />
            </Grid>
          </Grid>
        </LocalizationProvider>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpis.map((k) => (
          <Grid item xs={6} md={3} key={k.label}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  {k.label}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {k.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper>
        {loading && <LinearProgress />}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell>Fecha</TableCell>
                <TableCell>Productos</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Vendió</TableCell>
                <TableCell>Pago</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No hay ventas en este período</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((s) => <SaleRow key={s.id} sale={s} canCancel={canCancel} onCancel={setToCancel} />)
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={!!toCancel} onClose={() => setToCancel(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Anular venta</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Se anula la venta de {toCancel && money(toCancel.totalAmount)} y los productos vuelven al stock. Deja de
            contar en reportes y comisiones.
          </Typography>
          <TextField
            label="Motivo (opcional)"
            fullWidth
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToCancel(null)}>Volver</Button>
          <Button color="error" variant="contained" onClick={confirmCancel} disabled={cancelling}>
            Anular venta
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SalesHistory;
