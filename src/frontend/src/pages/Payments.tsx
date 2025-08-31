import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
  Card,
  CardContent,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  ArrowBack,
  Add,
  AttachMoney,
  CreditCard,
  AccountBalance,
  LocalAtm,
  Receipt,
  Search,
  CalendarToday,
  CheckCircle,
  Cancel,
  Edit,
  TrendingUp,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTenant } from '../contexts/TenantContext';
import api from '../services/api';
import { es } from 'date-fns/locale';
import { format, startOfDay, endOfDay } from 'date-fns';

interface Payment {
  id: string;
  bookingId: string;
  customerName: string;
  serviceName: string;
  employeeName?: string;
  amount: number;
  paymentMethod: string;
  status: string;
  paymentDate: string;
  tipAmount?: number;
  commissionAmount?: number;
  transactionId?: string;
  notes?: string;
}

interface Booking {
  id: string;
  customerName: string;
  serviceName: string;
  professionalName: string;
  price: number;
  startTime: string;
  status: string;
}

const Payments: React.FC = () => {
  const navigate = useNavigate();
  const { getTerm } = useTenant();
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [unpaidBookings, setUnpaidBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState<Date | null>(new Date());
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  
  const [paymentForm, setPaymentForm] = useState({
    bookingId: '',
    employeeId: '',
    amount: 0,
    tipAmount: 0,
    paymentMethod: 'cash',
    transactionId: '',
    notes: '',
  });
  
  const [errors, setErrors] = useState<any>({});
  const [todayStats, setTodayStats] = useState({
    totalRevenue: 0,
    cashRevenue: 0,
    cardRevenue: 0,
    transferRevenue: 0,
    mercadopagoRevenue: 0,
    totalPayments: 0,
    pendingPayments: 0,
  });

  const paymentMethods = [
    { value: 'cash', label: 'Efectivo', icon: <LocalAtm /> },
    { value: 'card', label: 'Tarjeta', icon: <CreditCard /> },
    { value: 'transfer', label: 'Transferencia', icon: <AccountBalance /> },
    { value: 'mercadopago', label: 'MercadoPago', icon: <PaymentIcon /> },
  ];

  useEffect(() => {
    fetchData();
  }, [filterDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const startDate = filterDate ? startOfDay(filterDate) : startOfDay(new Date());
      const endDate = filterDate ? endOfDay(filterDate) : endOfDay(new Date());
      
      const [paymentsRes, bookingsRes, employeesRes, statsRes] = await Promise.all([
        api.get('/payments', {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          }
        }),
        api.get('/bookings/unpaid'),
        api.get('/employees'),
        api.get('/payments/stats/today'),
      ]);
      
      setPayments(paymentsRes.data);
      setUnpaidBookings(bookingsRes.data);
      setEmployees(employeesRes.data);
      setTodayStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPaymentDialog = (booking?: Booking) => {
    if (booking) {
      setSelectedBooking(booking);
      setPaymentForm({
        bookingId: booking.id,
        employeeId: '',
        amount: booking.price,
        tipAmount: 0,
        paymentMethod: 'cash',
        transactionId: '',
        notes: '',
      });
    }
    setErrors({});
    setOpenPaymentDialog(true);
  };

  const handleClosePaymentDialog = () => {
    setOpenPaymentDialog(false);
    setSelectedBooking(null);
    setPaymentForm({
      bookingId: '',
      employeeId: '',
      amount: 0,
      tipAmount: 0,
      paymentMethod: 'cash',
      transactionId: '',
      notes: '',
    });
    setErrors({});
  };

  const validatePaymentForm = () => {
    const newErrors: any = {};
    
    if (!paymentForm.bookingId) {
      newErrors.bookingId = 'Seleccione una reserva';
    }
    
    if (!paymentForm.amount || paymentForm.amount <= 0) {
      newErrors.amount = 'El monto debe ser mayor a 0';
    }
    
    if (paymentForm.paymentMethod === 'mercadopago' || paymentForm.paymentMethod === 'transfer') {
      if (!paymentForm.transactionId) {
        newErrors.transactionId = 'Ingrese el ID de transacción';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSavePayment = async () => {
    if (!validatePaymentForm()) return;

    try {
      await api.post('/payments', paymentForm);
      fetchData();
      handleClosePaymentDialog();
    } catch (error) {
      console.error('Error saving payment:', error);
      setErrors({ submit: 'Error al registrar el pago' });
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash': return 'success';
      case 'card': return 'primary';
      case 'transfer': return 'info';
      case 'mercadopago': return 'warning';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      case 'refunded': return 'default';
      default: return 'default';
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.transactionId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = filterMethod === 'all' || payment.paymentMethod === filterMethod;
    return matchesSearch && matchesMethod;
  });

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
              Pagos y Facturación
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenPaymentDialog(true)}
          >
            Registrar Pago
          </Button>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingUp sx={{ mr: 1, color: 'success.main' }} />
                  <Typography color="text.secondary" variant="subtitle2">
                    Total del Día
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  ${todayStats.totalRevenue.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {todayStats.totalPayments} pagos registrados
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <LocalAtm sx={{ mr: 1, color: 'success.main' }} />
                  <Typography color="text.secondary" variant="subtitle2">
                    Efectivo
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  ${todayStats.cashRevenue.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CreditCard sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography color="text.secondary" variant="subtitle2">
                    Tarjeta
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  ${todayStats.cardRevenue.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AccountBalance sx={{ mr: 1, color: 'info.main' }} />
                  <Typography color="text.secondary" variant="subtitle2">
                    Transferencia
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  ${todayStats.transferRevenue.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Unpaid Bookings Alert */}
        {unpaidBookings.length > 0 && (
          <Alert 
            severity="warning" 
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={() => setOpenPaymentDialog(true)}>
                Ver pendientes
              </Button>
            }
          >
            Hay {unpaidBookings.length} reservas sin pago registrado
          </Alert>
        )}

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar pagos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                <DatePicker
                  label="Fecha"
                  value={filterDate}
                  onChange={setFilterDate}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={5}>
              <ToggleButtonGroup
                value={filterMethod}
                exclusive
                onChange={(e, value) => value && setFilterMethod(value)}
                aria-label="payment method filter"
                fullWidth
              >
                <ToggleButton value="all">
                  Todos
                </ToggleButton>
                {paymentMethods.map((method) => (
                  <ToggleButton key={method.value} value={method.value}>
                    {method.icon}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </Paper>

        {/* Payments Table */}
        <Paper sx={{ p: 2 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Servicio</TableCell>
                  <TableCell>Empleado</TableCell>
                  <TableCell>Monto</TableCell>
                  <TableCell>Propina</TableCell>
                  <TableCell>Método</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Fecha/Hora</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      No se encontraron pagos
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.customerName}</TableCell>
                        <TableCell>{payment.serviceName}</TableCell>
                        <TableCell>{payment.employeeName || '-'}</TableCell>
                        <TableCell>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            ${payment.amount.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {payment.tipAmount ? `$${payment.tipAmount.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={payment.paymentMethod}
                            size="small"
                            color={getPaymentMethodColor(payment.paymentMethod) as any}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={payment.status}
                            size="small"
                            color={getStatusColor(payment.status) as any}
                            icon={payment.status === 'completed' ? <CheckCircle /> : undefined}
                          />
                        </TableCell>
                        <TableCell>
                          {format(new Date(payment.paymentDate), 'dd/MM HH:mm')}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Ver detalles">
                            <IconButton size="small">
                              <Receipt />
                            </IconButton>
                          </Tooltip>
                          {payment.status === 'pending' && (
                            <Tooltip title="Marcar como pagado">
                              <IconButton size="small" color="success">
                                <CheckCircle />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredPayments.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Filas por página:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          />
        </Paper>

        {/* Payment Dialog */}
        <Dialog open={openPaymentDialog} onClose={handleClosePaymentDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            Registrar Pago
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {!selectedBooking && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Seleccionar Reserva</InputLabel>
                    <Select
                      value={paymentForm.bookingId}
                      onChange={(e) => {
                        const booking = unpaidBookings.find(b => b.id === e.target.value);
                        if (booking) {
                          setSelectedBooking(booking);
                          setPaymentForm({
                            ...paymentForm,
                            bookingId: booking.id,
                            amount: booking.price,
                          });
                        }
                      }}
                      label="Seleccionar Reserva"
                    >
                      {unpaidBookings.map((booking) => (
                        <MenuItem key={booking.id} value={booking.id}>
                          {booking.customerName} - {booking.serviceName} - ${booking.price}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {selectedBooking && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="subtitle2">
                      <strong>Cliente:</strong> {selectedBooking.customerName}
                    </Typography>
                    <Typography variant="subtitle2">
                      <strong>Servicio:</strong> {selectedBooking.serviceName}
                    </Typography>
                    <Typography variant="subtitle2">
                      <strong>Profesional:</strong> {selectedBooking.professionalName}
                    </Typography>
                  </Alert>
                </Grid>
              )}

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Empleado que cobró</InputLabel>
                  <Select
                    value={paymentForm.employeeId}
                    onChange={(e) => setPaymentForm({ ...paymentForm, employeeId: e.target.value as string })}
                    label="Empleado que cobró"
                  >
                    <MenuItem value="">Sin especificar</MenuItem>
                    {employees.map((employee) => (
                      <MenuItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Monto"
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) })}
                  error={!!errors.amount}
                  helperText={errors.amount}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Propina"
                  type="number"
                  value={paymentForm.tipAmount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, tipAmount: parseFloat(e.target.value) || 0 })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Método de Pago
                </Typography>
                <ToggleButtonGroup
                  value={paymentForm.paymentMethod}
                  exclusive
                  onChange={(e, value) => value && setPaymentForm({ ...paymentForm, paymentMethod: value })}
                  aria-label="payment method"
                  fullWidth
                >
                  {paymentMethods.map((method) => (
                    <ToggleButton key={method.value} value={method.value}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        {method.icon}
                        <Typography variant="caption">{method.label}</Typography>
                      </Box>
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Grid>

              {(paymentForm.paymentMethod === 'mercadopago' || paymentForm.paymentMethod === 'transfer') && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="ID de Transacción"
                    value={paymentForm.transactionId}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                    error={!!errors.transactionId}
                    helperText={errors.transactionId}
                  />
                </Grid>
              )}

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notas (opcional)"
                  multiline
                  rows={2}
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <Alert severity="success">
                  <Typography variant="h6">
                    Total a cobrar: ${(paymentForm.amount + paymentForm.tipAmount).toFixed(2)}
                  </Typography>
                </Alert>
              </Grid>
            </Grid>

            {errors.submit && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {errors.submit}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePaymentDialog}>Cancelar</Button>
            <Button onClick={handleSavePayment} variant="contained">
              Registrar Pago
            </Button>
          </DialogActions>
        </Dialog>
      </motion.div>
    </Container>
  );
};

export default Payments;