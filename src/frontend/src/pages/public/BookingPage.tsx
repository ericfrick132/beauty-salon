import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Grid,
  Card,
  CardContent,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  Avatar,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Fade,
  Zoom,
  Autocomplete,
  InputAdornment,
} from '@mui/material';
import {
  CalendarToday,
  Schedule,
  Person,
  AttachMoney,
  ArrowForward,
  ArrowBack,
  Check,
  LocationOn,
  Phone,
  Email,
  AccessTime,
  Search,
  TrendingUp,
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { motion, AnimatePresence } from 'framer-motion';
import { es } from 'date-fns/locale';
import { format, addDays, isSameDay, isAfter, isBefore, startOfDay } from 'date-fns';
import api from '../../services/api';

// Steps are computed dynamically depending on whether the service requires a deposit
const baseSteps = ['Servicio', 'Profesional', 'Fecha y Hora', 'Tus Datos'] as const;

/**
 * Tokens de la página pública de reservas.
 *
 * Esta pantalla es la vidriera del negocio, no del producto: el único color es
 * el del tenant (theme.palette.primary). Todo lo demás es papel e tinta, para
 * que funcione igual en una barbería, un centro de estética o una cancha.
 * La paleta y las tipografías son las de la landing ("Editorial Agenda").
 */
const ui = {
  paper: '#F4EFE6',
  surface: '#FAF7F0',
  ink: '#171410',
  inkSoft: '#5C5347',
  inkMute: '#8C8275',
  rule: 'rgba(23, 20, 16, 0.14)',
  ruleSoft: 'rgba(23, 20, 16, 0.08)',
  display: '"Fraunces", Georgia, serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
};

const money = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

/** Los precios llegan como number; sin formato se leen "75000" en vez de "$75.000". */
const formatPrice = (value?: number | null) =>
  typeof value === 'number' && !Number.isNaN(value) ? money.format(value) : '';

/**
 * Algunas descripciones vienen con markdown escapado desde el panel y se
 * muestran con las barras a la vista ("líquidos\. ✨Reduce"). Las limpiamos al
 * renderizar para no tener que migrar datos.
 */
const cleanText = (value?: string | null) =>
  (value || '').replace(/\\([\\`*_{}[\]()#+\-.!>])/g, '$1').trim();

/** Encabezado de cada paso. Alineado a la izquierda: el texto instructivo
 *  centrado es lo que hacía que la página se leyera como una plantilla. */
const StepHeading: React.FC<{ title: string; hint?: string }> = ({ title, hint }) => (
  <>
    <Typography
      component="h2"
      sx={{
        fontFamily: ui.display,
        fontSize: { xs: '1.6rem', md: '2rem' },
        fontWeight: 500,
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
        color: ui.ink,
        mb: 0.75,
      }}
    >
      {title}
    </Typography>
    {hint && (
      <Typography sx={{ fontSize: '0.9rem', color: ui.inkSoft, mb: 3 }}>{hint}</Typography>
    )}
  </>
);

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  category?: string;
  bookingCount?: number;
  requiresDeposit?: boolean;
}

interface Professional {
  id: string;
  name: string;
  specialties?: string[];
  avatar?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

const BookingPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [businessInfo, setBusinessInfo] = useState<any>(null);
  
  // Get next full hour rounded up
  const getInitialTime = () => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0); // Round up to next hour
    return `${nextHour.getHours().toString().padStart(2, '0')}:00`;
  };
  
  const [bookingData, setBookingData] = useState({
    serviceId: '',
    employeeId: '',
    date: new Date(),
    time: getInitialTime(),
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    notes: '',
  });
  
  const [errors, setErrors] = useState<any>({});
  // Próximos horarios libres que devuelve el backend cuando rechaza la reserva, para
  // no dejar al cliente sin salida.
  const [alternatives, setAlternatives] = useState<{ date: string; times: string[] }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<{ initPoint?: string; amount?: number } | null>(null);
  const [serviceSearchValue, setServiceSearchValue] = useState<Service | null>(null);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Sync serviceSearchValue with bookingData.serviceId
  useEffect(() => {
    if (bookingData.serviceId && services.length > 0) {
      const service = services.find(s => s.id === bookingData.serviceId);
      if (service && service !== serviceSearchValue) {
        setServiceSearchValue(service);
      }
    }
  }, [bookingData.serviceId, services]);

  useEffect(() => {
    if (bookingData.employeeId && bookingData.date && bookingData.serviceId) {
      fetchAvailableSlots();
    }
  }, [bookingData.employeeId, bookingData.date, bookingData.serviceId]);
  
  // Auto-select initial time when slots are loaded
  useEffect(() => {
    if (availableSlots.length > 0 && !bookingData.time) {
      // Find the next available slot closest to the initial time
      const initialTime = getInitialTime();
      const availableSlot = availableSlots.find(slot => slot.available && slot.time >= initialTime);
      if (availableSlot) {
        setBookingData(prev => ({ ...prev, time: availableSlot.time }));
      } else if (availableSlots[0]?.available) {
        // If no slot after initial time, pick first available
        setBookingData(prev => ({ ...prev, time: availableSlots[0].time }));
      }
    }
  }, [availableSlots]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      console.log('Fetching initial data...');
      const [servicesRes, professionalsRes, tenantRes] = await Promise.all([
        api.get('/public/services'),
        api.get('/public/employees'),
        api.get('/public/tenant-info'),
      ]);
      
      console.log('Services response:', servicesRes.data);
      console.log('Employees response:', professionalsRes.data);
      console.log('Tenant info response:', tenantRes.data);
      
      setServices(servicesRes.data || []);
      setProfessionals(professionalsRes.data || []);
      setBusinessInfo(tenantRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Set empty arrays to avoid rendering issues
      setServices([]);
      setProfessionals([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      const response = await api.get('/public/available-slots', {
        params: {
          professionalId: bookingData.employeeId,
          date: bookingData.date.toISOString().split('T')[0],
          serviceId: bookingData.serviceId,
        }
      });
      
      const slots = response.data
        .filter((time: string) => !time.startsWith('PAST:'))
        .map((time: string) => ({
          time,
          available: true,
        }));
      
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error fetching slots:', error);
      setAvailableSlots([]);
    }
  };

  const validateStep = () => {
    const newErrors: any = {};
    
    switch (activeStep) {
      case 0:
        if (!bookingData.serviceId) {
          newErrors.serviceId = 'Por favor selecciona un servicio';
        }
        break;
      case 1:
        if (!bookingData.employeeId) {
          newErrors.employeeId = 'Por favor selecciona un profesional';
        }
        break;
      case 2:
        if (!bookingData.time) {
          newErrors.time = 'Por favor selecciona un horario';
        }
        break;
      case 3:
        if (!bookingData.customerName.trim()) {
          newErrors.customerName = 'Por favor ingresa tu nombre';
        }
        if (!bookingData.customerEmail.trim()) {
          newErrors.customerEmail = 'Por favor ingresa tu email';
        } else if (!/\S+@\S+\.\S+/.test(bookingData.customerEmail)) {
          newErrors.customerEmail = 'Email inválido';
        }
        if (!bookingData.customerPhone.trim()) {
          newErrors.customerPhone = 'Por favor ingresa tu teléfono';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    setErrors({});
    // Clear search if going back to service selection
    if (activeStep === 1) {
      const service = services.find(s => s.id === bookingData.serviceId);
      setServiceSearchValue(service || null);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setSubmitting(true);
    setAlternatives([]);
    try {
      const selectedService = services.find(s => s.id === bookingData.serviceId);
      const [hours, minutes] = bookingData.time.split(':');
      const startTime = new Date(bookingData.date);
      startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + (selectedService?.durationMinutes || 60));

      const response = await api.post('/public/bookings', {
        serviceId: bookingData.serviceId,
        employeeId: bookingData.employeeId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        customerName: bookingData.customerName,
        customerEmail: bookingData.customerEmail,
        customerPhone: bookingData.customerPhone,
        notes: bookingData.notes,
      });

      setConfirmationCode(response.data.confirmationCode);
      setCreatedBookingId(response.data.bookingId);
      // El backend es la única fuente de verdad de si hay que cobrar. Antes esto además
      // exigía services.find(...)?.requiresDeposit de la lista en memoria: si esa lista
      // estaba desactualizada mostrábamos "Turno confirmado" mientras el backend había
      // dejado la reserva en pending_payment, o sea sin cobrar la seña.
      const requiresPayment = Boolean(response.data?.requiresPayment);
      const hasDepositStep = Boolean(services.find(s => s.id === bookingData.serviceId)?.requiresDeposit) || requiresPayment;

      if (requiresPayment) {
        // Ir al paso de Pago y esperar acción del usuario
        setPaymentRequired(true);
        setPaymentInfo({ initPoint: response.data.payment?.initPoint || response.data.payment?.sandboxInitPoint, amount: response.data.payment?.amount });
        setActiveStep(5);
      } else {
        // Sin pago requerido, ir al paso final
        setBookingConfirmed(true);
        const finalIndex = hasDepositStep ? 5 : 4; // Confirmación depende de si existe paso de Pago
        setActiveStep(finalIndex);
      }
    } catch (error: any) {
      console.error('Error creating booking:', error);
      const data = error.response?.data;
      setAlternatives(Array.isArray(data?.alternatives) ? data.alternatives : []);
      setErrors({ submit: data?.message || 'Error al crear la reserva. Por favor intenta nuevamente.' });
    } finally {
      setSubmitting(false);
    }
  };

  // El cliente eligió uno de los horarios alternativos: lo dejamos seleccionado y lo
  // devolvemos al paso de fecha y hora, sin perder los datos que ya cargó.
  const handlePickAlternative = (dateStr: string, time: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    setBookingData(prev => ({ ...prev, date: new Date(year, month - 1, day), time }));
    setErrors({});
    setAlternatives([]);
    setActiveStep(2);
  };

  const selectedService = services.find(s => s.id === bookingData.serviceId);
  const selectedProfessional = professionals.find(p => p.id === bookingData.employeeId);

  // Poll booking status after initiating MercadoPago until confirmed or timeout
  useEffect(() => {
    if (!paymentRequired || !createdBookingId) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 120; // ~10 minutes at 5s interval
    const intervalMs = 5000;

    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await api.get(`/bookings/${createdBookingId}`);
        const status = (res?.data?.status || res?.data?.Status || '').toString().toLowerCase();
        if (status === 'confirmed' || status === 'completed') {
          setPaymentRequired(false);
          setBookingConfirmed(true);
          setActiveStep(5);
          return; // stop polling
        }
        if (status === 'cancelled') {
          setPaymentRequired(false);
          return;
        }
      } catch {}
      attempts++;
      if (!cancelled && attempts < maxAttempts && paymentRequired) {
        timer = window.setTimeout(tick, intervalMs);
      }
    };

    let timer = window.setTimeout(tick, intervalMs);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [paymentRequired, createdBookingId]);

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Fade in timeout={500}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <StepHeading title="Elegí el servicio" hint="Buscalo por nombre o elegilo de la lista." />
              </Grid>
              
              {/* Autocomplete search */}
              <Grid item xs={12}>
                <Autocomplete
                  value={serviceSearchValue}
                  onChange={(event, newValue: Service | null) => {
                    if (newValue) {
                      console.log('Service selected from search:', newValue.name);
                      setServiceSearchValue(newValue);
                      setBookingData(prev => ({ ...prev, serviceId: newValue.id }));
                      // Auto-advance to professional selection
                      setTimeout(() => {
                        console.log('Auto-advancing to professional selection');
                        setActiveStep(1);
                      }, 300);
                    }
                  }}
                  options={services}
                  getOptionLabel={(option) => option.name}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Box sx={{ width: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body1">{option.name}</Typography>
                          {option.bookingCount && option.bookingCount > 0 && (
                            <Chip
                              icon={<TrendingUp />}
                              label="Popular"
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {option.durationMinutes} min - ${option.price}
                          </Typography>
                          {option.category && (
                            <Typography variant="caption" color="text.secondary">
                              {option.category}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Buscar servicio..."
                      variant="outlined"
                      fullWidth
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                  sx={{ mb: 3 }}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                  Servicios más populares
                </Typography>
              </Grid>

              {services.length === 0 ? (
                <Grid item xs={12}>
                  <Alert severity="info">
                    No hay servicios disponibles en este momento. Por favor, intente más tarde.
                  </Alert>
                </Grid>
              ) : (
                services.map((service) => (
                <Grid item xs={12} sm={6} md={4} key={service.id}>
                  <motion.div whileTap={{ scale: 0.99 }} style={{ height: '100%' }}>
                    <Card
                      elevation={0}
                      sx={{
                        cursor: 'pointer',
                        height: '100%',
                        bgcolor: '#fff',
                        borderRadius: 2,
                        // El borde marca la selección; no escalamos la tarjeta al pasar
                        // el mouse porque desenfoca el texto y se siente genérico.
                        border: '1px solid',
                        borderColor: bookingData.serviceId === service.id ? 'primary.main' : ui.rule,
                        ...(bookingData.serviceId === service.id && {
                          boxShadow: (t: any) => `inset 0 0 0 1px ${t.palette.primary.main}`,
                        }),
                        transition: 'border-color .18s ease, box-shadow .18s ease',
                        position: 'relative',
                        '&:hover': {
                          borderColor: 'primary.main',
                        },
                      }}
                      onClick={() => {
                        console.log('Service selected:', service.name);
                        setServiceSearchValue(service);
                        setBookingData(prev => ({ ...prev, serviceId: service.id }));
                        // Auto-advance after selection
                        setTimeout(() => {
                          console.log('Auto-advancing to professional selection');
                          setActiveStep(1);
                        }, 300);
                      }}
                    >
                      {service.bookingCount != null && service.bookingCount > 5 && (
                        <Typography
                          sx={{
                            position: 'absolute',
                            top: 14,
                            right: 16,
                            zIndex: 1,
                            fontFamily: ui.mono,
                            fontSize: '0.6rem',
                            letterSpacing: '0.16em',
                            textTransform: 'uppercase',
                            color: 'primary.main',
                          }}
                        >
                          Popular
                        </Typography>
                      )}
                      <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <Typography
                          sx={{
                            fontFamily: ui.display,
                            fontSize: '1.15rem',
                            fontWeight: 500,
                            lineHeight: 1.15,
                            letterSpacing: '-0.015em',
                            color: ui.ink,
                            pr: service.bookingCount != null && service.bookingCount > 5 ? 6 : 0,
                            // Los nombres largos rompían la altura de la fila
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            minHeight: '2.3em',
                          }}
                        >
                          {service.name}
                        </Typography>
                        <Typography
                          sx={{
                            mt: 1,
                            mb: 2.5,
                            fontSize: '0.85rem',
                            lineHeight: 1.5,
                            color: ui.inkSoft,
                            // Recortamos a 2 líneas para que la grilla no quede despareja
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            minHeight: '2.55em',
                          }}
                        >
                          {cleanText(service.description)}
                        </Typography>
                        <Box
                          sx={{
                            mt: 'auto',
                            pt: 1.5,
                            borderTop: `1px solid ${ui.ruleSoft}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            fontFamily: ui.mono,
                          }}
                        >
                          <Typography sx={{ fontFamily: ui.mono, fontSize: '0.75rem', color: ui.inkMute }}>
                            {service.durationMinutes} min
                          </Typography>
                          <Typography sx={{ fontFamily: ui.mono, fontSize: '1rem', fontWeight: 600, color: ui.ink }}>
                            {formatPrice(service.price)}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))
              )}
            </Grid>
          </Fade>
        );

      case 1:
        return (
          <Fade in timeout={500}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <StepHeading title="¿Con quién?" hint="Elegí el profesional que te va a atender." />
              </Grid>
              {professionals.map((professional) => (
                <Grid item xs={12} sm={6} md={4} key={professional.id}>
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      sx={{
                        cursor: 'pointer',
                        height: '100%',
                        border: bookingData.employeeId === professional.id ? '2px solid' : '1px solid',
                        borderColor: bookingData.employeeId === professional.id ? 'primary.main' : 'divider',
                        transition: 'all 0.3s',
                        '&:hover': {
                          boxShadow: 4,
                        },
                      }}
                      onClick={() => {
                        console.log('Professional selected:', professional.name);
                        setBookingData(prev => ({ ...prev, employeeId: professional.id }));
                        // Auto-advance to date & time selection
                        setTimeout(() => {
                          console.log('Auto-advancing to date & time selection');
                          setActiveStep(2);
                        }, 300);
                      }}
                    >
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Avatar
                          sx={{
                            width: 80,
                            height: 80,
                            margin: '0 auto 16px',
                            bgcolor: 'primary.main',
                            fontSize: '2rem',
                          }}
                        >
                          {professional.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="h6" gutterBottom>
                          {professional.name}
                        </Typography>
                        {professional.specialties && professional.specialties.length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            {professional.specialties.slice(0, 3).map((specialty, index) => (
                              <Chip
                                key={index}
                                label={specialty}
                                size="small"
                                sx={{ m: 0.5 }}
                              />
                            ))}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
              {errors.employeeId && (
                <Grid item xs={12}>
                  <Alert severity="error">
                    {errors.employeeId}
                  </Alert>
                </Grid>
              )}
            </Grid>
          </Fade>
        );

      case 2:
        return (
          <Fade in timeout={500}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <StepHeading title="Fecha y hora" hint="Elegí el día y después el horario que te quede cómodo." />
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                    <DateCalendar
                      value={bookingData.date}
                      onChange={(newDate) => {
                        if (newDate) {
                          setBookingData({ ...bookingData, date: newDate, time: '' });
                        }
                      }}
                      minDate={new Date()}
                      maxDate={addDays(new Date(), 30)}
                    />
                  </LocalizationProvider>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
                  <Typography variant="h6" gutterBottom>
                    Horarios disponibles
                  </Typography>
                  {availableSlots.length === 0 ? (
                    <Alert severity="info">
                      No hay horarios disponibles para esta fecha
                    </Alert>
                  ) : (
                    <Grid container spacing={1}>
                      {availableSlots.map((slot) => (
                        <Grid item xs={4} key={slot.time}>
                          <Button
                            fullWidth
                            variant={bookingData.time === slot.time ? 'contained' : 'outlined'}
                            onClick={() => {
                              setBookingData(prev => ({ ...prev, time: slot.time }));
                              // Auto-advance after selection
                              setTimeout(() => {
                                setActiveStep(3);
                              }, 300);
                            }}
                            disabled={!slot.available}
                            sx={{ py: 1 }}
                          >
                            {slot.time}
                          </Button>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                  {errors.time && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {errors.time}
                    </Alert>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Fade>
        );

      case 3:
        return (
          <Fade in timeout={500}>
            <Box>
              <StepHeading title="Tus datos" hint="Los usamos para confirmarte el turno y avisarte si algo cambia." />
              <Grid container spacing={2} sx={{ maxWidth: 600, margin: '0 auto' }}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nombre completo"
                    value={bookingData.customerName}
                    onChange={(e) => setBookingData({ ...bookingData, customerName: e.target.value })}
                    error={!!errors.customerName}
                    helperText={errors.customerName}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={bookingData.customerEmail}
                    onChange={(e) => setBookingData({ ...bookingData, customerEmail: e.target.value })}
                    error={!!errors.customerEmail}
                    helperText={errors.customerEmail}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Teléfono"
                    value={bookingData.customerPhone}
                    onChange={(e) => setBookingData({ ...bookingData, customerPhone: e.target.value })}
                    error={!!errors.customerPhone}
                    helperText={errors.customerPhone}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notas adicionales (opcional)"
                    multiline
                    rows={3}
                    value={bookingData.notes}
                    onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                    placeholder="¿Alguna preferencia o información que debamos saber?"
                  />
                </Grid>
              </Grid>
            </Box>
          </Fade>
        );

      case 4:
        return (
          <Fade in timeout={500}>
            <Box>
              {bookingConfirmed ? (
                // Mostrar confirmación final cuando no se requiere pago
                <Container maxWidth="sm" sx={{ py: 2 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Zoom in timeout={300}>
                      <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', margin: '0 auto 20px' }}>
                        <Check sx={{ fontSize: 30 }} />
                      </Avatar>
                    </Zoom>

                    {/* Lo primero es lo que la persona vino a saber: cuándo. */}
                    <Typography
                      component="p"
                      sx={{
                        fontFamily: ui.mono,
                        fontSize: '0.68rem',
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: ui.inkMute,
                        mb: 1.5,
                      }}
                    >
                      Turno confirmado
                    </Typography>
                    <Typography
                      component="h2"
                      sx={{
                        fontFamily: ui.display,
                        fontSize: { xs: '1.9rem', md: '2.5rem' },
                        fontWeight: 500,
                        lineHeight: 1.08,
                        letterSpacing: '-0.025em',
                        color: ui.ink,
                        textTransform: 'capitalize',
                      }}
                    >
                      {format(bookingData.date, "EEEE d 'de' MMMM", { locale: es })}
                    </Typography>
                    <Typography
                      sx={{ fontFamily: ui.mono, fontSize: '1.5rem', fontWeight: 600, color: ui.ink, mt: 0.5 }}
                    >
                      {bookingData.time}
                    </Typography>

                    <Box
                      sx={{
                        mt: 3,
                        py: 2,
                        borderTop: `1px solid ${ui.rule}`,
                        borderBottom: `1px solid ${ui.rule}`,
                      }}
                    >
                      <Typography sx={{ fontSize: '0.75rem', color: ui.inkMute, mb: 0.5 }}>
                        Código de confirmación
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: ui.mono,
                          fontSize: '1.6rem',
                          fontWeight: 600,
                          letterSpacing: '0.12em',
                          color: 'primary.main',
                        }}
                      >
                        {confirmationCode}
                      </Typography>
                    </Box>

                    <Typography sx={{ mt: 2.5, fontSize: '0.85rem', color: ui.inkSoft }}>
                      Te mandamos los detalles a {bookingData.customerEmail}
                    </Typography>

                    <Button variant="outlined" size="large" sx={{ mt: 3 }} onClick={() => window.location.reload()}>
                      Reservar otro turno
                    </Button>
                  </Box>
                </Container>
              ) : (
                <>
                  <StepHeading title="Revisá el turno" hint="Confirmá que esté todo bien antes de continuar al pago." />
                  <Paper sx={{ p: 3, maxWidth: 600, margin: '0 auto', bgcolor: 'background.default' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Schedule sx={{ mr: 1, color: 'primary.main' }} />
                          <Typography variant="subtitle2" color="text.secondary">
                            Servicio:
                          </Typography>
                        </Box>
                        <Typography variant="body1" sx={{ ml: 4 }}>
                          {selectedService?.name}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Person sx={{ mr: 1, color: 'primary.main' }} />
                          <Typography variant="subtitle2" color="text.secondary">
                            Profesional:
                          </Typography>
                        </Box>
                        <Typography variant="body1" sx={{ ml: 4 }}>
                          {selectedProfessional?.name}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <CalendarToday sx={{ mr: 1, color: 'primary.main' }} />
                          <Typography variant="subtitle2" color="text.secondary">
                            Fecha y hora:
                          </Typography>
                        </Box>
                        <Typography variant="body1" sx={{ ml: 4 }}>
                          {format(bookingData.date, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })} a las {bookingData.time}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <AccessTime sx={{ mr: 1, color: 'primary.main' }} />
                          <Typography variant="subtitle2" color="text.secondary">
                            Duración:
                          </Typography>
                        </Box>
                        <Typography variant="body1" sx={{ ml: 4 }}>
                          {selectedService?.durationMinutes} minutos
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <AttachMoney sx={{ mr: 1, color: 'primary.main' }} />
                          <Typography variant="subtitle2" color="text.secondary">
                            Precio:
                          </Typography>
                        </Box>
                        <Typography variant="h6" color="primary" sx={{ ml: 4 }}>
                          ${selectedService?.price}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Divider sx={{ my: 2 }} />
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Tus datos:
                        </Typography>
                        <Typography variant="body2">
                          {bookingData.customerName}
                        </Typography>
                        <Typography variant="body2">
                          {bookingData.customerEmail}
                        </Typography>
                        <Typography variant="body2">
                          {bookingData.customerPhone}
                        </Typography>
                        {bookingData.notes && (
                          <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                            Notas: {bookingData.notes}
                          </Typography>
                        )}
                      </Grid>
                    </Grid>
                    
                    {errors.submit && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        {errors.submit}
                        {alternatives.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                              Estos horarios sí están disponibles:
                            </Typography>
                            {alternatives.map((alt) => {
                              const [y, m, d] = alt.date.split('-').map(Number);
                              const altDate = new Date(y, m - 1, d);
                              return (
                                <Box key={alt.date} sx={{ mb: 1.5 }}>
                                  <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                                    {format(altDate, "EEEE d 'de' MMMM", { locale: es })}
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                    {alt.times.map((t) => (
                                      <Chip
                                        key={`${alt.date}-${t}`}
                                        label={t}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                        clickable
                                        onClick={() => handlePickAlternative(alt.date, t)}
                                      />
                                    ))}
                                  </Box>
                                </Box>
                              );
                            })}
                          </Box>
                        )}
                      </Alert>
                    )}
                  </Paper>
                </>
              )}
            </Box>
          </Fade>
        );

      case 5:
        // Paso de Pago y Confirmación final
        return (
          <Fade in timeout={500}>
            <Box>
              {!bookingConfirmed ? (
                <>
                  <StepHeading title="Pago de la seña" hint="Generá el pago y completalo para dejar el turno confirmado." />
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    {errors.submit && (
                      <Alert severity="error" sx={{ mb: 2 }}>{errors.submit}</Alert>
                    )}
                    {!createdBookingId ? (
                      <Button variant="contained" size="large" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? 'Generando pago...' : 'Generar pago'}
                      </Button>
                    ) : paymentRequired && paymentInfo?.initPoint ? (
                      <>
                        <Typography variant="h6" sx={{ mb: 1 }}>
                          Seña {paymentInfo.amount ? `: $${paymentInfo.amount}` : ''}
                        </Typography>
                        <Button variant="contained" size="large" onClick={() => window.location.assign(paymentInfo.initPoint!)}>
                          Pagar ahora con MercadoPago
                        </Button>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                          Se abrirá la pasarela de pago en esta pestaña
                        </Typography>
                        <Alert severity="info" sx={{ mt: 2 }}>
                          Luego de pagar, volveremos a esta pantalla y confirmaremos tu reserva automáticamente.
                        </Alert>
                      </>
                    ) : (
                      <Alert severity="success">No se requiere pago. Podés finalizar.</Alert>
                    )}
                  </Paper>
                </>
              ) : (
                <Container maxWidth="sm" sx={{ py: 2 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Zoom in timeout={300}>
                      <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', margin: '0 auto 20px' }}>
                        <Check sx={{ fontSize: 30 }} />
                      </Avatar>
                    </Zoom>

                    {/* Lo primero es lo que la persona vino a saber: cuándo. */}
                    <Typography
                      component="p"
                      sx={{
                        fontFamily: ui.mono,
                        fontSize: '0.68rem',
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: ui.inkMute,
                        mb: 1.5,
                      }}
                    >
                      Turno confirmado
                    </Typography>
                    <Typography
                      component="h2"
                      sx={{
                        fontFamily: ui.display,
                        fontSize: { xs: '1.9rem', md: '2.5rem' },
                        fontWeight: 500,
                        lineHeight: 1.08,
                        letterSpacing: '-0.025em',
                        color: ui.ink,
                        textTransform: 'capitalize',
                      }}
                    >
                      {format(bookingData.date, "EEEE d 'de' MMMM", { locale: es })}
                    </Typography>
                    <Typography
                      sx={{ fontFamily: ui.mono, fontSize: '1.5rem', fontWeight: 600, color: ui.ink, mt: 0.5 }}
                    >
                      {bookingData.time}
                    </Typography>

                    <Box
                      sx={{
                        mt: 3,
                        py: 2,
                        borderTop: `1px solid ${ui.rule}`,
                        borderBottom: `1px solid ${ui.rule}`,
                      }}
                    >
                      <Typography sx={{ fontSize: '0.75rem', color: ui.inkMute, mb: 0.5 }}>
                        Código de confirmación
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: ui.mono,
                          fontSize: '1.6rem',
                          fontWeight: 600,
                          letterSpacing: '0.12em',
                          color: 'primary.main',
                        }}
                      >
                        {confirmationCode}
                      </Typography>
                    </Box>

                    <Typography sx={{ mt: 2.5, fontSize: '0.85rem', color: ui.inkSoft }}>
                      Te mandamos los detalles a {bookingData.customerEmail}
                    </Typography>

                    <Button variant="outlined" size="large" sx={{ mt: 3 }} onClick={() => window.location.reload()}>
                      Reservar otro turno
                    </Button>
                  </Box>
                </Container>
              )}
            </Box>
          </Fade>
        );

      default:
        return null;
    }
  };

  // No early return; el contenido final se muestra como último paso del stepper

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: ui.paper, py: { xs: 3, md: 6 } }}>
      <Container maxWidth="lg">
        {/* Header: el nombre del negocio es lo primero y lo más grande de la página */}
        <Box sx={{ mb: { xs: 3, md: 5 }, textAlign: 'center' }}>
          <Typography
            component="h1"
            sx={{
              fontFamily: ui.display,
              fontWeight: 500,
              color: ui.ink,
              fontSize: { xs: '2.5rem', sm: '3.25rem', md: '4rem' },
              lineHeight: 0.98,
              letterSpacing: '-0.035em',
              fontVariationSettings: '"opsz" 120, "SOFT" 30',
            }}
          >
            {businessInfo?.businessName || 'Reservá tu turno'}
          </Typography>
        </Box>

        {/* Stepper */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 2.5 },
            mb: 3,
            bgcolor: 'transparent',
            border: `1px solid ${ui.rule}`,
            borderRadius: 2,
          }}
        >
          {(() => {
            const requiresDeposit = services.find(s => s.id === bookingData.serviceId)?.requiresDeposit;
            const steps = requiresDeposit
              ? [...baseSteps, 'Pago', 'Confirmación']
              : [...baseSteps, 'Confirmación'];
            return (
              <Stepper
                activeStep={activeStep}
                alternativeLabel
                sx={{
                  '& .MuiStepConnector-line': { borderColor: ui.rule },
                  '& .MuiStepIcon-root': { color: ui.ruleSoft, '& text': { fill: ui.inkSoft } },
                  '& .MuiStepIcon-root.Mui-active text': { fill: '#fff' },
                  '& .MuiStepLabel-label': {
                    fontSize: '0.75rem',
                    letterSpacing: '0.04em',
                    color: ui.inkMute,
                    '&.Mui-active': { color: ui.ink, fontWeight: 600 },
                    '&.Mui-completed': { color: ui.inkSoft },
                  },
                }}
              >
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            );
          })()}
        </Paper>

        {/* Content */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, md: 4 },
            minHeight: 400,
            bgcolor: ui.surface,
            border: `1px solid ${ui.rule}`,
            borderRadius: 2,
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderStepContent()}
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button
                  disabled={activeStep === 0}
                  onClick={handleBack}
                  startIcon={<ArrowBack />}
                >
                  Anterior
                </Button>
                
                {activeStep === 4 ? (
                  !createdBookingId ? (
                    <Button
                      variant="contained"
                      size="large"
                      onClick={handleSubmit}
                      disabled={submitting}
                      endIcon={submitting ? <CircularProgress size={20} /> : <Check />}
                    >
                      Confirmar Reserva
                    </Button>
                  ) : paymentRequired && !bookingConfirmed ? (
                    <Button
                      variant="contained"
                      size="large"
                      onClick={() => paymentInfo?.initPoint && window.location.assign(paymentInfo.initPoint)}
                      disabled={!paymentInfo?.initPoint}
                    >
                      Pagar ahora
                    </Button>
                  ) : null
                ) : activeStep === ((services.find(s => s.id === bookingData.serviceId)?.requiresDeposit) ? 5 : 4) ? null : (
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleNext}
                    endIcon={<ArrowForward />}
                  >
                    Siguiente
                  </Button>
                )}
              </Box>
            </>
          )}
        </Paper>

        {/* Footer Info */}
        {businessInfo && (
          <Paper sx={{ p: 3, mt: 3 }}>
            <Grid container spacing={2} justifyContent="center">
              {businessInfo.address && (
                <Grid item xs={12} sm={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">{businessInfo.address}</Typography>
                  </Box>
                </Grid>
              )}
              {businessInfo.phone && (
                <Grid item xs={12} sm={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Phone sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">{businessInfo.phone}</Typography>
                  </Box>
                </Grid>
              )}
              {businessInfo.email && (
                <Grid item xs={12} sm={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Email sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">{businessInfo.email}</Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Paper>
        )}
      </Container>
    </Box>
  );
};

export default BookingPage;
