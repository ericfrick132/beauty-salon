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

const steps = ['Servicio', 'Profesional', 'Fecha y Hora', 'Tus Datos', 'Confirmación'];

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  category?: string;
  bookingCount?: number;
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
    professionalId: '',
    date: new Date(),
    time: getInitialTime(),
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    notes: '',
  });
  
  const [errors, setErrors] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [serviceSearchValue, setServiceSearchValue] = useState<Service | null>(null);

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
    if (bookingData.professionalId && bookingData.date && bookingData.serviceId) {
      fetchAvailableSlots();
    }
  }, [bookingData.professionalId, bookingData.date, bookingData.serviceId]);
  
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
          professionalId: bookingData.professionalId,
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
        if (!bookingData.professionalId) {
          newErrors.professionalId = 'Por favor selecciona un profesional';
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
    try {
      const selectedService = services.find(s => s.id === bookingData.serviceId);
      const [hours, minutes] = bookingData.time.split(':');
      const startTime = new Date(bookingData.date);
      startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + (selectedService?.durationMinutes || 60));

      const response = await api.post('/public/bookings', {
        serviceId: bookingData.serviceId,
        professionalId: bookingData.professionalId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        customerName: bookingData.customerName,
        customerEmail: bookingData.customerEmail,
        customerPhone: bookingData.customerPhone,
        notes: bookingData.notes,
      });

      setConfirmationCode(response.data.confirmationCode);
      setBookingConfirmed(true);
    } catch (error: any) {
      console.error('Error creating booking:', error);
      setErrors({ submit: error.response?.data?.message || 'Error al crear la reserva. Por favor intenta nuevamente.' });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedService = services.find(s => s.id === bookingData.serviceId);
  const selectedProfessional = professionals.find(p => p.id === bookingData.professionalId);

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Fade in timeout={500}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h5" gutterBottom align="center">
                  Selecciona el servicio que deseas
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
                  Busca o elige entre nuestra variedad de servicios profesionales
                </Typography>
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
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      sx={{
                        cursor: 'pointer',
                        height: '100%',
                        border: bookingData.serviceId === service.id ? '2px solid' : '1px solid',
                        borderColor: bookingData.serviceId === service.id ? 'primary.main' : 'divider',
                        transition: 'all 0.3s',
                        position: 'relative',
                        '&:hover': {
                          boxShadow: 4,
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
                      {service.bookingCount && service.bookingCount > 5 && (
                        <Chip
                          icon={<TrendingUp />}
                          label="Popular"
                          size="small"
                          color="primary"
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            zIndex: 1,
                          }}
                        />
                      )}
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {service.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                          {service.description}
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Schedule sx={{ fontSize: 18, mr: 0.5, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {service.durationMinutes} min
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <AttachMoney sx={{ fontSize: 18, color: 'primary.main' }} />
                            <Typography variant="h6" color="primary">
                              {service.price}
                            </Typography>
                          </Box>
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
                <Typography variant="h5" gutterBottom align="center">
                  ¿Con quién te gustaría agendar?
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
                  Selecciona el profesional de tu preferencia
                </Typography>
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
                        border: bookingData.professionalId === professional.id ? '2px solid' : '1px solid',
                        borderColor: bookingData.professionalId === professional.id ? 'primary.main' : 'divider',
                        transition: 'all 0.3s',
                        '&:hover': {
                          boxShadow: 4,
                        },
                      }}
                      onClick={() => {
                        console.log('Professional selected:', professional.name);
                        setBookingData(prev => ({ ...prev, professionalId: professional.id }));
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
            </Grid>
          </Fade>
        );

      case 2:
        return (
          <Fade in timeout={500}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h5" gutterBottom align="center">
                  Selecciona fecha y hora
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
                  Elige el momento que mejor se adapte a tu agenda
                </Typography>
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
              <Typography variant="h5" gutterBottom align="center">
                Completa tus datos
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
                Necesitamos esta información para confirmar tu reserva
              </Typography>
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
              <Typography variant="h5" gutterBottom align="center">
                Confirma tu reserva
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
                Revisa los detalles de tu reserva antes de confirmar
              </Typography>
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
                  </Alert>
                )}
              </Paper>
            </Box>
          </Fade>
        );

      default:
        return null;
    }
  };

  if (bookingConfirmed) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Zoom in timeout={300}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: 'success.main',
                  margin: '0 auto 24px',
                }}
              >
                <Check sx={{ fontSize: 48 }} />
              </Avatar>
            </Zoom>
            
            <Typography variant="h4" gutterBottom color="success.main">
              ¡Reserva Confirmada!
            </Typography>
            
            <Typography variant="body1" color="text.secondary" paragraph>
              Tu reserva ha sido confirmada exitosamente.
            </Typography>
            
            <Paper sx={{ p: 2, bgcolor: 'grey.100', mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Código de confirmación:
              </Typography>
              <Typography variant="h4" color="primary" sx={{ fontFamily: 'monospace' }}>
                {confirmationCode}
              </Typography>
            </Paper>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              Hemos enviado los detalles de tu reserva a {bookingData.customerEmail}
            </Alert>
            
            <Typography variant="body2" color="text.secondary" paragraph>
              Te esperamos el {format(bookingData.date, "EEEE d 'de' MMMM", { locale: es })} a las {bookingData.time}
            </Typography>
            
            <Button
              variant="contained"
              size="large"
              onClick={() => window.location.reload()}
              sx={{ mt: 2 }}
            >
              Hacer otra reserva
            </Button>
          </Paper>
        </motion.div>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
          <Typography variant="h3" gutterBottom sx={{ fontWeight: 600 }}>
            {businessInfo?.businessName || 'Reserva tu cita'}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Agenda tu cita en simples pasos
          </Typography>
        </Paper>

        {/* Stepper */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {/* Content */}
        <Paper sx={{ p: 4, minHeight: 400 }}>
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
                
                {activeStep === steps.length - 1 ? (
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleSubmit}
                    disabled={submitting}
                    endIcon={submitting ? <CircularProgress size={20} /> : <Check />}
                  >
                    Confirmar Reserva
                  </Button>
                ) : (
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