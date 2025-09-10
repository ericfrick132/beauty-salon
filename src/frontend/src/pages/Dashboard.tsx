import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Chip,
  LinearProgress,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Collapse,
} from '@mui/material';
import {
  CalendarToday,
  People,
  AttachMoney,
  TrendingUp,
  Schedule,
  CheckCircle,
  Cancel,
  AccessTime,
  AccountBalance,
  TrendingDown,
  Info,
  MonetizationOn,
  AccountBalanceWallet,
  Warning,
  Payment,
  ExpandMore,
  ExpandLess,
  ContentCopy,
  OpenInNew,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../contexts/TenantContext';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchBookings, fetchEmployees, fetchServices } from '../store/slices/bookingSlice';
import SubscriptionStatus from '../components/SubscriptionStatus';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  getThemeConfig, 
  getCardShadow, 
  getBorderStyle, 
  getTextColor, 
  getCardBackground 
} from '../utils/themeUtils';

const Dashboard: React.FC = () => {
  const { config, getTerm } = useTenant();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { bookings, employees, services, loading } = useAppSelector(state => state.booking);
  const [financialStats, setFinancialStats] = useState<any>(null);
  const [loadingFinancials, setLoadingFinancials] = useState(false);
  const [unpaidBookings, setUnpaidBookings] = useState<any[]>([]);
  const [loadingUnpaid, setLoadingUnpaid] = useState(false);
  const [showUnpaidDetails, setShowUnpaidDetails] = useState(false);
  const [copiedBookingLink, setCopiedBookingLink] = useState(false);
  const bookingShareUrl = `${window.location.origin}/book`;
  const handleCopyBookingLink = async () => {
    try {
      await navigator.clipboard.writeText(bookingShareUrl);
      setCopiedBookingLink(true);
      setTimeout(() => setCopiedBookingLink(false), 1500);
    } catch {
      setCopiedBookingLink(false);
    }
  };

  useEffect(() => {
    dispatch(fetchBookings());
    dispatch(fetchEmployees());
    dispatch(fetchServices());
    fetchUnpaidBookings();
  }, [dispatch]);

  useEffect(() => {
    fetchFinancialStats();
  }, []);

  const fetchFinancialStats = async () => {
    setLoadingFinancials(true);
    try {
      const response = await fetch('/api/dashboard/financial-stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setFinancialStats(data);
      }
    } catch (error) {
      console.error('Error fetching financial stats:', error);
    } finally {
      setLoadingFinancials(false);
    }
  };

  const fetchUnpaidBookings = async () => {
    setLoadingUnpaid(true);
    try {
      const response = await fetch('/api/bookings/unpaid', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUnpaidBookings(data);
      }
    } catch (error) {
      console.error('Error fetching unpaid bookings:', error);
    } finally {
      setLoadingUnpaid(false);
    }
  };

  // Aplicar colores específicos del vertical
  const primaryColor = config?.theme?.primaryColor || '#1976d2';
  const secondaryColor = config?.theme?.secondaryColor || '#ffffff';
  const accentColor = config?.theme?.accentColor || '#ffc107';
  const verticalGradient = `linear-gradient(135deg, ${primaryColor}20 0%, ${primaryColor}10 100%)`;

  
  // Obtener configuración del tema para el vertical
  const themeConfig = getThemeConfig(config?.vertical);
  const textColor = getTextColor(themeConfig, primaryColor);
  const cardBackground = getCardBackground(themeConfig, secondaryColor);
  const borderStyle = getBorderStyle(themeConfig, primaryColor, accentColor);
  const shadowStyle = getCardShadow(themeConfig, primaryColor);
  const isLightTheme = themeConfig.isLightBackground;

  // Calculate dynamic data
  const getWeeklyRevenue = () => {
    const today = new Date();
    const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const weeklyData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayRevenue = bookings
        .filter(b => {
          const bookingDate = new Date(b.startTime);
          return bookingDate.toDateString() === date.toDateString() && b.status !== 'cancelled';
        })
        .reduce((total, b) => total + (b.price || 0), 0);
      
      weeklyData.push({
        day: weekDays[date.getDay()],
        revenue: dayRevenue
      });
    }
    return weeklyData;
  };

  const getServiceDistribution = () => {
    const serviceMap = new Map();
    bookings
      .filter(b => b.status !== 'cancelled')
      .forEach(booking => {
        const serviceName = booking.serviceName || 'Otros';
        serviceMap.set(serviceName, (serviceMap.get(serviceName) || 0) + 1);
      });

    const total = Array.from(serviceMap.values()).reduce((a, b) => a + b, 0);
    if (total === 0) {
      return [
        { name: 'Sin datos', value: 100, color: '#cccccc' }
      ];
    }

    return Array.from(serviceMap.entries())
      .map(([name, count]) => ({
        name,
        value: Math.round((count / total) * 100),
        color: '#8884d8'
      }))
      .sort((a, b) => b.value - a.value);
  };

  const weeklyRevenue = getWeeklyRevenue();
  const serviceDistribution = getServiceDistribution();

  const todayBookings = [...bookings]
    .filter(b => new Date(b.startTime).toDateString() === new Date().toDateString())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const upcomingBookings = bookings
    .filter(b => new Date(b.startTime) > new Date())
    .slice(0, 5);

  // Calculate dynamic stats
  const calculateStats = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Today's bookings
    const todayCount = todayBookings.length;
    const yesterdayBookings = bookings.filter(b => 
      new Date(b.startTime).toDateString() === yesterday.toDateString()
    );
    const yesterdayCount = yesterdayBookings.length;
    const bookingChange = yesterdayCount > 0 ? 
      Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100) : 0;

    // Today's revenue
    const todayRevenue = todayBookings
      .filter(b => b.status !== 'cancelled')
      .reduce((total, b) => total + (b.price || 0), 0);
    const yesterdayRevenue = yesterdayBookings
      .filter(b => b.status !== 'cancelled')
      .reduce((total, b) => total + (b.price || 0), 0);
    const revenueChange = yesterdayRevenue > 0 ? 
      Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100) : 0;

    // New customers this week (customers with their first booking this week)
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    const customerFirstBookings = new Map<string, string>();
    
    // Find first booking for each customer
    [...bookings]
      .sort((a, b) => new Date(a.createdAt || a.startTime).getTime() - new Date(b.createdAt || b.startTime).getTime())
      .forEach(booking => {
        if (!customerFirstBookings.has(booking.customerId)) {
          customerFirstBookings.set(booking.customerId, booking.createdAt || booking.startTime);
        }
      });
    
    // Count customers whose first booking was this week
    const newCustomers = Array.from(customerFirstBookings.values())
      .filter(firstBookingDate => new Date(firstBookingDate) >= weekAgo)
      .length;

    // Calculate occupancy rate (simplified)
    const totalSlots = employees.length * 8; // Assuming 8 hours per day
    const occupiedSlots = todayBookings.filter(b => b.status !== 'cancelled').length;
    const occupancyRate = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;

    return [
      {
        title: `${getTerm('booking')}s Hoy`,
        value: todayCount,
        icon: <CalendarToday />,
        color: primaryColor,
        bgColor: `${primaryColor}15`,
        change: `${bookingChange >= 0 ? '+' : ''}${bookingChange}%`,
        changeType: bookingChange >= 0 ? 'positive' : 'negative',
      },
      {
        title: 'Ingresos del Día',
        value: `$${todayRevenue.toLocaleString()}`,
        icon: <AttachMoney />,
        color: accentColor,
        bgColor: `${accentColor}15`,
        change: `${revenueChange >= 0 ? '+' : ''}${revenueChange}%`,
        changeType: revenueChange >= 0 ? 'positive' : 'negative',
      },
      {
        title: 'Clientes Nuevos',
        value: newCustomers,
        icon: <People />,
        color: secondaryColor,
        bgColor: `${secondaryColor}15`,
        borderColor: primaryColor,
        change: `+${newCustomers}`,
        changeType: 'positive',
      },
      {
        title: 'Tasa de Ocupación',
        value: `${occupancyRate}%`,
        icon: <TrendingUp />,
        color: primaryColor,
        bgColor: `${primaryColor}10`,
        borderColor: accentColor,
        change: `${occupancyRate}%`,
        changeType: occupancyRate >= 60 ? 'positive' : 'negative',
      },
    ];
  };

  const stats = calculateStats();

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: verticalGradient,
      py: 3
    }}>
      <Container maxWidth="xl">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Box sx={{ mb: 4 }}>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700, 
                mb: 1,
                background: `linear-gradient(45deg, ${primaryColor}, ${accentColor})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              ¡Bienvenido de vuelta, {config?.businessName}!
            </Typography>
            <Typography variant="body1" sx={{ color: primaryColor, opacity: 0.8 }}>
              Aquí está el resumen de tu negocio para hoy, {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
            </Typography>
          </Box>
        </motion.div>

        {/* Customer Booking Link - prominent */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <Card
              sx={{
                background: cardBackground,
                boxShadow: shadowStyle,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="h6" sx={{ mb: 0.5 }}>
                    Comparte este enlace con tus clientes para reservar
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Paper variant="outlined" sx={{ p: 1.5, px: 2, flex: 1, minWidth: 280 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, wordBreak: 'break-all' }}>
                        {bookingShareUrl}
                      </Typography>
                    </Paper>
                    <Tooltip title={copiedBookingLink ? 'Copiado!' : 'Copiar enlace'}>
                      <span>
                        <Button variant="contained" onClick={handleCopyBookingLink} startIcon={<ContentCopy />}>
                          {copiedBookingLink ? 'Copiado' : 'Copiar'}
                        </Button>
                      </span>
                    </Tooltip>
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<OpenInNew />}
                      href={bookingShareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Abrir
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Subscription Status Card */}
        <SubscriptionStatus showActions={true} />

        {/* Financial Overview Card - Nueva sección */}
        {financialStats && (
          <Grid container spacing={3} sx={{ mb: 3, mt: 3 }}>
            <Grid item xs={12}>
              <Card sx={{ 
                background: cardBackground,
                boxShadow: shadowStyle,
                border: '1px solid',
                borderColor: 'divider',
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AccountBalance sx={{ color: primaryColor, mr: 2 }} />
                    <Typography variant="h6" component="h2">
                      Resumen Financiero del Mes
                    </Typography>
                    <Tooltip title="Métricas calculadas después de sueldos y comisiones">
                      <IconButton size="small" sx={{ ml: 1 }}>
                        <Info fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={3}>
                      <Box>
                        <Typography color="textSecondary" variant="body2" gutterBottom>
                          Facturación Total
                        </Typography>
                        <Typography variant="h5" color={primaryColor}>
                          ${financialStats.totalRevenue?.toLocaleString() || 0}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={3}>
                      <Box>
                        <Typography color="textSecondary" variant="body2" gutterBottom>
                          Gastos (Sueldos + Comisiones)
                        </Typography>
                        <Typography variant="h5" color="error">
                          -${financialStats.totalExpenses?.toLocaleString() || 0}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Sueldos: ${financialStats.totalSalaries?.toLocaleString() || 0} | 
                          Comisiones: ${financialStats.totalCommissions?.toLocaleString() || 0}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={3}>
                      <Box>
                        <Typography color="textSecondary" variant="body2" gutterBottom>
                          Ganancia Neta
                        </Typography>
                        <Typography 
                          variant="h5" 
                          color={financialStats.netProfit >= 0 ? 'success.main' : 'error'}
                        >
                          ${financialStats.netProfit?.toLocaleString() || 0}
                        </Typography>
                        <Chip 
                          size="small"
                          icon={financialStats.netProfit >= 0 ? <TrendingUp /> : <TrendingDown />}
                          label={`${financialStats.profitMargin?.toFixed(1) || 0}% margen`}
                          color={financialStats.profitMargin >= 30 ? 'success' : 'warning'}
                        />
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={3}>
                      <Box>
                        <Typography color="textSecondary" variant="body2" gutterBottom>
                          Crecimiento vs Mes Anterior
                        </Typography>
                        <Typography 
                          variant="h5"
                          color={financialStats.revenueGrowth >= 0 ? 'success.main' : 'error'}
                        >
                          {financialStats.revenueGrowth > 0 ? '+' : ''}
                          {financialStats.revenueGrowth?.toFixed(1) || 0}%
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Unpaid Bookings Alert */}
        {unpaidBookings.length > 0 && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                  color: 'white',
                  boxShadow: '0 8px 25px rgba(255, 152, 0, 0.3)',
                  border: '1px solid rgba(255, 152, 0, 0.3)',
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Warning sx={{ fontSize: 30, mr: 2 }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          ⚠️ Reservas Pendientes de Pago
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Hay {unpaidBookings.length} reserva{unpaidBookings.length !== 1 ? 's' : ''} sin pago registrado
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          startIcon={<Payment />}
                          onClick={() => navigate('/payments')}
                          sx={{
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.3)',
                            }
                          }}
                        >
                          Registrar Pagos
                        </Button>
                        <IconButton
                          onClick={() => setShowUnpaidDetails(!showUnpaidDetails)}
                          sx={{ color: 'white' }}
                        >
                          {showUnpaidDetails ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      </Box>
                    </Box>
                    
                    <Collapse in={showUnpaidDetails}>
                      <Divider sx={{ mb: 2, backgroundColor: 'rgba(255, 255, 255, 0.3)' }} />
                      <List sx={{ py: 0 }}>
                        {unpaidBookings.slice(0, 5).map((booking, index) => (
                          <ListItem 
                            key={booking.id} 
                            sx={{ 
                              py: 1,
                              borderRadius: 1,
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              mb: index < Math.min(unpaidBookings.length, 5) - 1 ? 1 : 0,
                            }}
                          >
                            <ListItemText
                              primary={
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'white' }}>
                                  {booking.customerName}
                                </Typography>
                              }
                              secondary={
                                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                  {booking.serviceName} • {format(new Date(booking.startTime), 'dd/MM HH:mm')}
                                </Typography>
                              }
                            />
                            <ListItemSecondaryAction>
                              <Chip
                                label={`$${booking.price}`}
                                sx={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                  color: 'white',
                                  fontWeight: 600,
                                }}
                              />
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                        {unpaidBookings.length > 5 && (
                          <Typography variant="body2" sx={{ mt: 1, opacity: 0.8, textAlign: 'center' }}>
                            ... y {unpaidBookings.length - 5} más
                          </Typography>
                        )}
                      </List>
                    </Collapse>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          </Grid>
        )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card 
                sx={{ 
                  height: '100%',
                  background: cardBackground,
                  border: themeConfig.borderStyle === 'accent' ? `1px solid ${accentColor}30` : borderStyle,
                  boxShadow: getCardShadow(themeConfig, stat.color),
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: getCardShadow({ ...themeConfig, shadowIntensity: 'strong' }, stat.color),
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: stat.bgColor,
                        color: stat.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `1px solid ${stat.color}`,
                      }}
                    >
                      {stat.icon}
                    </Box>
                    <Box sx={{ ml: 'auto' }}>
                      <Chip
                        label={stat.change}
                        size="small"
                        sx={{ 
                          fontWeight: 600,
                          backgroundColor: stat.changeType === 'positive' ? `${accentColor}20` : '#ff000020',
                          color: stat.changeType === 'positive' ? accentColor : '#ff0000',
                        }}
                      />
                    </Box>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: stat.color }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" sx={{ color: textColor, opacity: 0.8 }}>
                    {stat.title}
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card 
              sx={{ 
                height: '100%',
                background: 'linear-gradient(135deg, #009ee3 0%, #0084c7 100%)',
                color: 'white',
                cursor: 'pointer',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 10px 30px rgba(0, 158, 227, 0.3)',
                }
              }}
              onClick={() => navigate('/mercadopago-settings')}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AccountBalance sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      MercadoPago
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Configurar pagos online
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Conecta tu cuenta para recibir señas y pagos anticipados
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Paper 
              sx={{ 
                p: 3, 
                height: '100%',
                background: cardBackground,
                border: borderStyle,
                boxShadow: shadowStyle,
              }}
            >
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: textColor }}>
                Ingresos de la Semana
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke={`${primaryColor}20`} />
                  <XAxis dataKey="day" stroke={primaryColor} />
                  <YAxis stroke={primaryColor} />
                  <RechartsTooltip 
                    formatter={(value: any) => `$${value}`}
                    contentStyle={{ 
                      backgroundColor: secondaryColor,
                      border: `1px solid ${primaryColor}`,
                      borderRadius: 8
                    }}
                  />
                  <Bar dataKey="revenue" fill={primaryColor} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </motion.div>
        </Grid>

        <Grid item xs={12} md={4}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Paper 
              sx={{ 
                p: 3, 
                height: '100%',
                background: cardBackground,
                border: borderStyle,
                boxShadow: shadowStyle,
              }}
            >
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: textColor }}>
                Distribución de Servicios
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={serviceDistribution.map((item, index) => ({
                      ...item,
                      color: index === 0 ? primaryColor : 
                             index === 1 ? accentColor : 
                             index === 2 ? secondaryColor : 
                             `${primaryColor}60`
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name} ${entry.value}%`}
                    outerRadius={80}
                    fill={primaryColor}
                    dataKey="value"
                  >
                    {serviceDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={
                          index === 0 ? primaryColor : 
                          index === 1 ? accentColor : 
                          index === 2 ? secondaryColor : 
                          `${primaryColor}60`
                        } 
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: secondaryColor,
                      border: `1px solid ${primaryColor}`,
                      borderRadius: 8
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </motion.div>
        </Grid>
      </Grid>

      {/* Today's Schedule and Activity */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Paper 
              sx={{ 
                p: 3, 
                height: 400, 
                overflow: 'auto',
                background: cardBackground,
                border: borderStyle,
                boxShadow: shadowStyle,
              }}
            >
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: textColor }}>
                Agenda de Hoy
              </Typography>
              {loading ? (
                <LinearProgress />
              ) : todayBookings.length === 0 ? (
                <Alert severity="info">
                  No hay {getTerm('booking')}s programados para hoy
                </Alert>
              ) : (
                <Box>
                  {todayBookings.map((booking) => (
                    <Box
                      key={booking.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        p: 2,
                        mb: 1,
                        borderRadius: 2,
                        backgroundColor: themeConfig.usesSoftColors ? '#FFF9FC' : (themeConfig.isLightBackground ? '#FAF9F7' : `${secondaryColor}50`),
                        border: getBorderStyle(themeConfig, primaryColor, accentColor),
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          backgroundColor: `${primaryColor}10`,
                          borderColor: primaryColor,
                          transform: 'translateX(5px)',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 4,
                          height: 40,
                          borderRadius: 1,
                          backgroundColor: 
                            booking.status === 'confirmed' ? accentColor :
                            booking.status === 'pending' ? `${primaryColor}60` : '#ff0000',
                          mr: 2,
                        }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: textColor }}>
                          {booking.customerName}
                        </Typography>
                        <Typography variant="body2" sx={{ color: `${textColor}99` }}>
                          {booking.serviceName} • {booking.employeeName}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {format(new Date(booking.startTime), 'HH:mm')}
                        </Typography>
                        <Chip
                          size="small"
                          icon={
                            booking.status === 'confirmed' ? <CheckCircle /> :
                            booking.status === 'cancelled' ? <Cancel /> : <AccessTime />
                          }
                          label={booking.status}
                          sx={{
                            backgroundColor: 
                              booking.status === 'confirmed' ? `${accentColor}20` :
                              booking.status === 'cancelled' ? '#ff000020' : `${primaryColor}20`,
                            color: 
                              booking.status === 'confirmed' ? accentColor :
                              booking.status === 'cancelled' ? '#ff0000' : primaryColor,
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          </motion.div>
        </Grid>

        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Paper 
              sx={{ 
                p: 3, 
                height: 400,
                background: cardBackground,
                border: borderStyle,
                boxShadow: shadowStyle,
              }}
            >
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: textColor }}>
                Actividad Reciente
              </Typography>
              <Box>
                {(() => {
                  // Generate recent activity from bookings data
                  const getRecentActivity = () => {
                    const activities = [];
                    const now = new Date();
                    
                    // Recent bookings (last 24 hours)
                    const recentBookings = bookings
                      .filter(b => {
                        const bookingTime = new Date(b.createdAt || b.startTime);
                        const hoursDiff = (now.getTime() - bookingTime.getTime()) / (1000 * 60 * 60);
                        return hoursDiff <= 24;
                      })
                      .slice(0)
                      .sort((a, b) => new Date(b.createdAt || b.startTime).getTime() - new Date(a.createdAt || a.startTime).getTime())
                      .slice(0, 5);

                    recentBookings.forEach(booking => {
                      const bookingTime = new Date(booking.createdAt || booking.startTime);
                      const hoursDiff = Math.floor((now.getTime() - bookingTime.getTime()) / (1000 * 60 * 60));
                      const minutesDiff = Math.floor((now.getTime() - bookingTime.getTime()) / (1000 * 60));
                      
                      let timeText = '';
                      if (hoursDiff >= 1) {
                        timeText = `Hace ${hoursDiff} hora${hoursDiff > 1 ? 's' : ''}`;
                      } else if (minutesDiff >= 1) {
                        timeText = `Hace ${minutesDiff} min`;
                      } else {
                        timeText = 'Ahora mismo';
                      }

                      let action = '';
                      let type = 'booking';
                      
                      if (booking.status === 'cancelled') {
                        action = 'Reserva cancelada';
                        type = 'cancel';
                      } else if (booking.status === 'completed') {
                        action = 'Servicio completado';
                        type = 'service';
                      } else {
                        // Check if this is customer's first booking
                        const customerBookings = [...bookings].filter(b => b.customerId === booking.customerId);
                        const isFirstBooking = customerBookings
                          .sort((a, b) => new Date(a.createdAt || a.startTime).getTime() - new Date(b.createdAt || b.startTime).getTime())[0]?.id === booking.id;
                        
                        if (isFirstBooking) {
                          action = 'Cliente nuevo - reserva';
                          type = 'customer';
                        } else {
                          action = 'Nueva reserva';
                          type = 'booking';
                        }
                      }

                      activities.push({
                        action,
                        user: booking.customerName || 'Cliente',
                        time: timeText,
                        type
                      });
                    });

                    // If no recent activity, show placeholder
                    if (activities.length === 0) {
                      activities.push(
                        { action: 'Sistema iniciado', user: 'Turnos Pro', time: 'Hace 1 hora', type: 'service' },
                        { action: 'Configuración actualizada', user: config?.businessName || 'Tu negocio', time: 'Hace 2 horas', type: 'service' }
                      );
                    }

                    return activities.slice(0, 5);
                  };

                  return getRecentActivity();
                })().map((activity, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      py: 1.5,
                      borderBottom: index < 4 ? '1px solid' : 'none',
                      borderColor: 'divider',
                    }}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor:
                          activity.type === 'booking' ? `${primaryColor}15` :
                          activity.type === 'payment' ? `${accentColor}15` :
                          activity.type === 'customer' ? `${secondaryColor}15` :
                          activity.type === 'service' ? `${primaryColor}10` : '#ff000015',
                        color:
                          activity.type === 'booking' ? primaryColor :
                          activity.type === 'payment' ? accentColor :
                          activity.type === 'customer' ? primaryColor :
                          activity.type === 'service' ? accentColor : '#ff0000',
                        mr: 2,
                      }}
                    >
                      {activity.type === 'booking' ? <CalendarToday fontSize="small" /> :
                       activity.type === 'payment' ? <AttachMoney fontSize="small" /> :
                       activity.type === 'customer' ? <People fontSize="small" /> :
                       activity.type === 'service' ? <Schedule fontSize="small" /> :
                       <Cancel fontSize="small" />}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {activity.action}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {activity.user}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {activity.time}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </motion.div>
        </Grid>
      </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;
