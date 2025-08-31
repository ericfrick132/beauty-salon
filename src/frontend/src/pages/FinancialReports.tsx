import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Alert,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  ArrowBack,
  TrendingUp,
  AttachMoney,
  CalendarToday,
  Download,
  Print,
  Assessment,
  LocalAtm,
  CreditCard,
  AccountBalance,
  Payment as PaymentIcon,
  Group,
  Receipt,
  ShowChart,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTenant } from '../contexts/TenantContext';
import api from '../services/api';
import { es } from 'date-fns/locale';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DailyReport {
  date: string;
  totalRevenue: number;
  cashRevenue: number;
  cardRevenue: number;
  transferRevenue: number;
  mercadoPagoRevenue: number;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalCommissions: number;
  totalTips: number;
}

interface EmployeeCommission {
  employeeId: string;
  employeeName: string;
  totalServices: number;
  totalRevenue: number;
  commissionPercentage: number;
  commissionAmount: number;
  fixedSalary: number;
  totalEarnings: number;
}

const FinancialReports: React.FC = () => {
  const navigate = useNavigate();
  const { getTerm } = useTenant();
  
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [employeeCommissions, setEmployeeCommissions] = useState<EmployeeCommission[]>([]);
  
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalCash: 0,
    totalCard: 0,
    totalTransfer: 0,
    totalMercadoPago: 0,
    totalBookings: 0,
    totalCommissions: 0,
    totalTips: 0,
    averageTicket: 0,
  });

  useEffect(() => {
    fetchReports();
  }, [reportType, selectedDate]);

  const fetchReports = async () => {
    if (!selectedDate) return;
    
    setLoading(true);
    try {
      let startDate, endDate;
      
      switch (reportType) {
        case 'daily':
          startDate = new Date(selectedDate);
          endDate = new Date(selectedDate);
          break;
        case 'weekly':
          startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
          endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
          break;
        case 'monthly':
          startDate = startOfMonth(selectedDate);
          endDate = endOfMonth(selectedDate);
          break;
      }
      
      const [reportsRes, commissionsRes] = await Promise.all([
        api.get('/reports/financial', {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          }
        }),
        api.get('/reports/commissions', {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          }
        }),
      ]);
      
      setDailyReports(reportsRes.data.reports);
      setEmployeeCommissions(commissionsRes.data);
      
      // Calculate summary
      const totals = reportsRes.data.reports.reduce((acc: any, report: DailyReport) => ({
        totalRevenue: acc.totalRevenue + report.totalRevenue,
        totalCash: acc.totalCash + report.cashRevenue,
        totalCard: acc.totalCard + report.cardRevenue,
        totalTransfer: acc.totalTransfer + report.transferRevenue,
        totalMercadoPago: acc.totalMercadoPago + report.mercadoPagoRevenue,
        totalBookings: acc.totalBookings + report.totalBookings,
        totalCommissions: acc.totalCommissions + report.totalCommissions,
        totalTips: acc.totalTips + report.totalTips,
      }), {
        totalRevenue: 0,
        totalCash: 0,
        totalCard: 0,
        totalTransfer: 0,
        totalMercadoPago: 0,
        totalBookings: 0,
        totalCommissions: 0,
        totalTips: 0,
      });
      
      setSummary({
        ...totals,
        averageTicket: totals.totalBookings > 0 ? totals.totalRevenue / totals.totalBookings : 0,
      });
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = () => {
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_financiero_${format(selectedDate || new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateCSV = () => {
    let csv = 'Reporte Financiero\n\n';
    csv += `Período: ${reportType === 'daily' ? 'Diario' : reportType === 'weekly' ? 'Semanal' : 'Mensual'}\n`;
    csv += `Fecha: ${format(selectedDate || new Date(), 'dd/MM/yyyy')}\n\n`;
    
    csv += 'Resumen General\n';
    csv += `Ingresos Totales,$${summary.totalRevenue}\n`;
    csv += `Efectivo,$${summary.totalCash}\n`;
    csv += `Tarjeta,$${summary.totalCard}\n`;
    csv += `Transferencia,$${summary.totalTransfer}\n`;
    csv += `MercadoPago,$${summary.totalMercadoPago}\n`;
    csv += `Total Reservas,${summary.totalBookings}\n`;
    csv += `Ticket Promedio,$${summary.averageTicket.toFixed(2)}\n`;
    csv += `Comisiones,$${summary.totalCommissions}\n`;
    csv += `Propinas,$${summary.totalTips}\n\n`;
    
    csv += 'Detalle por Día\n';
    csv += 'Fecha,Ingresos,Efectivo,Tarjeta,Transferencia,MercadoPago,Reservas,Comisiones,Propinas\n';
    dailyReports.forEach(report => {
      csv += `${format(new Date(report.date), 'dd/MM/yyyy')},`;
      csv += `$${report.totalRevenue},`;
      csv += `$${report.cashRevenue},`;
      csv += `$${report.cardRevenue},`;
      csv += `$${report.transferRevenue},`;
      csv += `$${report.mercadoPagoRevenue},`;
      csv += `${report.totalBookings},`;
      csv += `$${report.totalCommissions},`;
      csv += `$${report.totalTips}\n`;
    });
    
    csv += '\nComisiones por Empleado\n';
    csv += 'Empleado,Servicios,Ingresos,Comisión %,Comisión $,Salario Fijo,Total\n';
    employeeCommissions.forEach(commission => {
      csv += `${commission.employeeName},`;
      csv += `${commission.totalServices},`;
      csv += `$${commission.totalRevenue},`;
      csv += `${commission.commissionPercentage}%,`;
      csv += `$${commission.commissionAmount},`;
      csv += `$${commission.fixedSalary},`;
      csv += `$${commission.totalEarnings}\n`;
    });
    
    return csv;
  };

  const paymentMethodData = [
    { name: 'Efectivo', value: summary.totalCash, color: '#4CAF50' },
    { name: 'Tarjeta', value: summary.totalCard, color: '#2196F3' },
    { name: 'Transferencia', value: summary.totalTransfer, color: '#00BCD4' },
    { name: 'MercadoPago', value: summary.totalMercadoPago, color: '#FFC107' },
  ];

  const COLORS = ['#4CAF50', '#2196F3', '#00BCD4', '#FFC107'];

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
              Reportes Financieros
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Print />}
              onClick={() => window.print()}
            >
              Imprimir
            </Button>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleExportReport}
            >
              Exportar CSV
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Reporte</InputLabel>
                <Select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  label="Tipo de Reporte"
                >
                  <MenuItem value="daily">Diario</MenuItem>
                  <MenuItem value="weekly">Semanal</MenuItem>
                  <MenuItem value="monthly">Mensual</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                <DatePicker
                  label="Fecha"
                  value={selectedDate}
                  onChange={setSelectedDate}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
          </Grid>
        </Paper>

        {loading ? (
          <LinearProgress />
        ) : (
          <>
            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <TrendingUp sx={{ mr: 1, color: 'white' }} />
                      <Typography color="white" variant="subtitle2">
                        Ingresos Totales
                      </Typography>
                    </Box>
                    <Typography variant="h3" sx={{ fontWeight: 600, color: 'white' }}>
                      ${summary.totalRevenue.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      {summary.totalBookings} reservas
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Receipt sx={{ mr: 1, color: 'info.main' }} />
                      <Typography color="text.secondary" variant="subtitle2">
                        Ticket Promedio
                      </Typography>
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      ${summary.averageTicket.toFixed(2)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Group sx={{ mr: 1, color: 'warning.main' }} />
                      <Typography color="text.secondary" variant="subtitle2">
                        Comisiones
                      </Typography>
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      ${summary.totalCommissions.toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <AttachMoney sx={{ mr: 1, color: 'success.main' }} />
                      <Typography color="text.secondary" variant="subtitle2">
                        Propinas
                      </Typography>
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      ${summary.totalTips.toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Charts */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Ingresos por Día
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailyReports}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => format(new Date(date), 'dd/MM')}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any) => `$${value.toFixed(2)}`}
                        labelFormatter={(date) => format(new Date(date), 'dd/MM/yyyy')}
                      />
                      <Legend />
                      <Bar dataKey="totalRevenue" fill="#8884d8" name="Ingresos" />
                      <Bar dataKey="totalCommissions" fill="#82ca9d" name="Comisiones" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Métodos de Pago
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={paymentMethodData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: $${entry.value.toFixed(0)}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {paymentMethodData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            </Grid>

            {/* Payment Methods Breakdown */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Desglose por Método de Pago
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                    <LocalAtm sx={{ mr: 2, fontSize: 40, color: 'success.main' }} />
                    <Box>
                      <Typography variant="subtitle2">Efectivo</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        ${summary.totalCash.toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
                    <CreditCard sx={{ mr: 2, fontSize: 40, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="subtitle2">Tarjeta</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        ${summary.totalCard.toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                    <AccountBalance sx={{ mr: 2, fontSize: 40, color: 'info.main' }} />
                    <Box>
                      <Typography variant="subtitle2">Transferencia</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        ${summary.totalTransfer.toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
                    <PaymentIcon sx={{ mr: 2, fontSize: 40, color: 'warning.main' }} />
                    <Box>
                      <Typography variant="subtitle2">MercadoPago</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        ${summary.totalMercadoPago.toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Employee Commissions Table */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Comisiones por Empleado
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Empleado</TableCell>
                      <TableCell align="center">Servicios</TableCell>
                      <TableCell align="right">Ingresos Generados</TableCell>
                      <TableCell align="center">Comisión %</TableCell>
                      <TableCell align="right">Comisión $</TableCell>
                      <TableCell align="right">Salario Fijo</TableCell>
                      <TableCell align="right">Total a Pagar</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {employeeCommissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          No hay comisiones registradas para este período
                        </TableCell>
                      </TableRow>
                    ) : (
                      employeeCommissions.map((commission) => (
                        <TableRow key={commission.employeeId}>
                          <TableCell>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {commission.employeeName}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={commission.totalServices} size="small" />
                          </TableCell>
                          <TableCell align="right">
                            ${commission.totalRevenue.toFixed(2)}
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={`${commission.commissionPercentage}%`}
                              size="small"
                              color="info"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography color="warning.main" sx={{ fontWeight: 500 }}>
                              ${commission.commissionAmount.toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            ${commission.fixedSalary.toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="h6" color="success.main" sx={{ fontWeight: 600 }}>
                              ${commission.totalEarnings.toFixed(2)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    {employeeCommissions.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="right">
                          <Typography variant="h6">Total Comisiones:</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                            ${employeeCommissions.reduce((acc, c) => acc + c.totalEarnings, 0).toFixed(2)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        )}
      </motion.div>
    </Container>
  );
};

export default FinancialReports;