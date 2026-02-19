import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  ArrowBack,
  TrendingUp,
  AttachMoney,
  People,
  CalendarToday,
  Download,
  Refresh,
  Assessment,
  MonetizationOn,
  Schedule,
  Star,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTenant } from '../contexts/TenantContext';
import api from '../services/api';
import { es } from 'date-fns/locale';
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

interface ReportData {
  totalRevenue: number;
  totalBookings: number;
  totalCustomers: number;
  averageServicePrice: number;
  topServices: Array<{ name: string; count: number; revenue: number }>;
  topProfessionals: Array<{ name: string; bookings: number; revenue: number }>;
  bookingsByDay: Array<{ date: string; count: number }>;
  revenueByMonth: Array<{ month: string; revenue: number }>;
  bookingsByStatus: Array<{ status: string; count: number }>;
}

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { getTerm } = useTenant();
  
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year' | 'custom'>('month');
  const [startDate, setStartDate] = useState<Date | null>(new Date(new Date().setMonth(new Date().getMonth() - 1)));
  const [endDate, setEndDate] = useState<Date | null>(new Date());

  useEffect(() => {
    fetchReportData();
  }, [dateRange, startDate, endDate]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      let start, end;
      const now = new Date();
      
      switch (dateRange) {
        case 'week':
          start = new Date(now.setDate(now.getDate() - 7));
          end = new Date();
          break;
        case 'month':
          start = new Date(now.setMonth(now.getMonth() - 1));
          end = new Date();
          break;
        case 'year':
          start = new Date(now.setFullYear(now.getFullYear() - 1));
          end = new Date();
          break;
        case 'custom':
          start = startDate;
          end = endDate;
          break;
      }

      const response = await api.get('/reports/dashboard', {
        params: {
          startDate: start?.toISOString(),
          endDate: end?.toISOString(),
        },
      });

      setReportData(response.data);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMockData = (): ReportData => ({
    totalRevenue: 15750,
    totalBookings: 245,
    totalCustomers: 89,
    averageServicePrice: 64.29,
    topServices: [
      { name: 'Corte de Cabello', count: 85, revenue: 2550 },
      { name: 'Coloración', count: 45, revenue: 4500 },
      { name: 'Tratamiento Capilar', count: 38, revenue: 3800 },
      { name: 'Manicura', count: 42, revenue: 1260 },
      { name: 'Pedicura', count: 35, revenue: 1400 },
    ],
    topProfessionals: [
      { name: 'María García', bookings: 78, revenue: 5460 },
      { name: 'Juan Pérez', bookings: 65, revenue: 4550 },
      { name: 'Ana López', bookings: 52, revenue: 3640 },
      { name: 'Carlos Ruiz', bookings: 50, revenue: 2100 },
    ],
    bookingsByDay: [
      { date: 'Lun', count: 35 },
      { date: 'Mar', count: 42 },
      { date: 'Mié', count: 38 },
      { date: 'Jue', count: 45 },
      { date: 'Vie', count: 52 },
      { date: 'Sáb', count: 28 },
      { date: 'Dom', count: 5 },
    ],
    revenueByMonth: [
      { month: 'Ene', revenue: 12500 },
      { month: 'Feb', revenue: 14200 },
      { month: 'Mar', revenue: 15750 },
    ],
    bookingsByStatus: [
      { status: 'Confirmado', count: 210 },
      { status: 'Pendiente', count: 25 },
      { status: 'Cancelado', count: 10 },
    ],
  });

  const handleExportReport = () => {
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateCSV = () => {
    if (!reportData) return '';
    
    let csv = 'Reporte de Gestión\n\n';
    csv += `Período: ${dateRange}\n`;
    csv += `Ingresos Totales,$${reportData.totalRevenue}\n`;
    csv += `Total de Reservas,${reportData.totalBookings}\n`;
    csv += `Total de Clientes,${reportData.totalCustomers}\n`;
    csv += `Precio Promedio,$${reportData.averageServicePrice}\n\n`;
    
    csv += 'Servicios Más Solicitados\n';
    csv += 'Servicio,Cantidad,Ingresos\n';
    reportData.topServices.forEach(service => {
      csv += `${service.name},${service.count},$${service.revenue}\n`;
    });
    
    return csv;
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

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
              Reportes y Análisis
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchReportData}
            >
              Actualizar
            </Button>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleExportReport}
            >
              Exportar CSV
            </Button>
            <Button variant="outlined" onClick={() => navigate('/financial-reports')}>
              Reportes financieros
            </Button>
            <Button variant="outlined" onClick={() => navigate('/payroll')}>
              Sueldos y comisiones
            </Button>
          </Box>
        </Box>

        {/* Filtros de fecha */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Período</InputLabel>
                <Select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as any)}
                  label="Período"
                >
                  <MenuItem value="week">Última semana</MenuItem>
                  <MenuItem value="month">Último mes</MenuItem>
                  <MenuItem value="year">Último año</MenuItem>
                  <MenuItem value="custom">Personalizado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {dateRange === 'custom' && (
              <>
                <Grid item xs={12} md={3}>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                    <DatePicker
                      label="Fecha inicio"
                      value={startDate}
                      onChange={setStartDate}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12} md={3}>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                    <DatePicker
                      label="Fecha fin"
                      value={endDate}
                      onChange={setEndDate}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </LocalizationProvider>
                </Grid>
              </>
            )}
          </Grid>
        </Paper>

        {loading ? (
          <LinearProgress />
        ) : reportData ? (
          <>
            {/* KPIs principales */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <MonetizationOn sx={{ mr: 1, color: 'success.main' }} />
                        <Typography color="text.secondary" variant="subtitle2">
                          Ingresos Totales
                        </Typography>
                      </Box>
                      <Typography variant="h4" sx={{ fontWeight: 600 }}>
                        ${reportData.totalRevenue.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                        +12% vs período anterior
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <CalendarToday sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography color="text.secondary" variant="subtitle2">
                          Total {getTerm('booking')}s
                        </Typography>
                      </Box>
                      <Typography variant="h4" sx={{ fontWeight: 600 }}>
                        {reportData.totalBookings}
                      </Typography>
                      <Typography variant="body2" color="primary.main" sx={{ mt: 1 }}>
                        +8% vs período anterior
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <People sx={{ mr: 1, color: 'info.main' }} />
                        <Typography color="text.secondary" variant="subtitle2">
                          Clientes Activos
                        </Typography>
                      </Box>
                      <Typography variant="h4" sx={{ fontWeight: 600 }}>
                        {reportData.totalCustomers}
                      </Typography>
                      <Typography variant="body2" color="info.main" sx={{ mt: 1 }}>
                        +15 nuevos clientes
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                >
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <AttachMoney sx={{ mr: 1, color: 'warning.main' }} />
                        <Typography color="text.secondary" variant="subtitle2">
                          Ticket Promedio
                        </Typography>
                      </Box>
                      <Typography variant="h4" sx={{ fontWeight: 600 }}>
                        ${reportData.averageServicePrice.toFixed(2)}
                      </Typography>
                      <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                        +5% vs período anterior
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            </Grid>

            {/* Gráficos */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    {getTerm('booking')}s por Día
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.bookingsByDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Estado de {getTerm('booking')}s
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reportData.bookingsByStatus}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.status}: ${entry.count}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {reportData.bookingsByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            </Grid>

            {/* Tablas de rankings */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    <Star sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Servicios Más Solicitados
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Servicio</TableCell>
                          <TableCell align="center">Cantidad</TableCell>
                          <TableCell align="right">Ingresos</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportData.topServices.map((service, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {index === 0 && <Chip label="TOP" size="small" color="primary" sx={{ mr: 1 }} />}
                              {service.name}
                            </TableCell>
                            <TableCell align="center">{service.count}</TableCell>
                            <TableCell align="right">${service.revenue}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Top {getTerm('professional')}s
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>{getTerm('professional')}</TableCell>
                          <TableCell align="center">{getTerm('booking')}s</TableCell>
                          <TableCell align="right">Ingresos</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportData.topProfessionals.map((professional, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {index === 0 && <Chip label="MVP" size="small" color="success" sx={{ mr: 1 }} />}
                              {professional.name}
                            </TableCell>
                            <TableCell align="center">{professional.bookings}</TableCell>
                            <TableCell align="right">${professional.revenue}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
            </Grid>
          </>
        ) : (
          <Typography>Error al cargar los datos</Typography>
        )}
      </motion.div>
    </Container>
  );
};

export default Reports;
