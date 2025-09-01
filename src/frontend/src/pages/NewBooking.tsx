import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Stepper,
  Step,
  StepLabel,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Alert,
  Chip,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  Person,
  Schedule,
  Check,
  Search,
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTenant } from '../contexts/TenantContext';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchCustomers, fetchEmployees, fetchServices, createBooking } from '../store/slices/bookingSlice';
import api from '../services/api';
import { es } from 'date-fns/locale';

const steps = ['Seleccionar Servicio', 'Elegir Profesional', 'Fecha y Hora', 'Datos del Cliente', 'Confirmar'];

const NewBooking: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { getTerm } = useTenant();
  const { services, employees, customers, loading } = useAppSelector(state => state.booking);

  const [activeStep, setActiveStep] = useState(0);
  const [bookingData, setBookingData] = useState({
    serviceId: '',
    professionalId: '',
    customerId: '',
    date: new Date(),
    time: new Date(),
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    notes: '',
  });
  const [errors, setErrors] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [newCustomer, setNewCustomer] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    dispatch(fetchServices());
    dispatch(fetchEmployees());
    dispatch(fetchCustomers());
  }, [dispatch]);

  useEffect(() => {
    if (bookingData.professionalId && bookingData.date && bookingData.serviceId) {
      fetchAvailableSlots();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingData.professionalId, bookingData.date, bookingData.serviceId]);

  const fetchAvailableSlots = async () => {
    try {
      const response = await api.get('/bookings/available-slots', {
        params: {
          employeeId: bookingData.professionalId,
          date: bookingData.date.getFullYear() + '-' + 
                String(bookingData.date.getMonth() + 1).padStart(2, '0') + '-' + 
                String(bookingData.date.getDate()).padStart(2, '0'),
          serviceId: bookingData.serviceId,
        }
      });
      setAvailableSlots(response.data);
    } catch (error) {
      console.error('Error fetching available slots:', error);
    }
  };

  const validateStep = () => {
    const newErrors: any = {};
    
    switch (activeStep) {
      case 0:
        if (!bookingData.serviceId) newErrors.serviceId = 'Seleccione un servicio';
        break;
      case 1:
        if (!bookingData.professionalId) newErrors.professionalId = 'Seleccione un profesional';
        break;
      case 2:
        if (!bookingData.date) newErrors.date = 'Seleccione una fecha';
        if (!bookingData.time) newErrors.time = 'Seleccione una hora';
        break;
      case 3:
        if (newCustomer) {
          if (!bookingData.customerName) newErrors.customerName = 'Ingrese el nombre del cliente';
          if (!bookingData.customerEmail) newErrors.customerEmail = 'Ingrese el email del cliente';
          if (!bookingData.customerPhone) newErrors.customerPhone = 'Ingrese el teléfono del cliente';
        } else {
          if (!bookingData.customerId) newErrors.customerId = 'Seleccione un cliente';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    
    setSubmitting(true);
    try {
      const selectedService = services.find(s => s.id === bookingData.serviceId);
      const startTime = new Date(bookingData.date);
      startTime.setHours(bookingData.time.getHours(), bookingData.time.getMinutes(), 0, 0);
      
      // Show warning for past bookings but allow them
      const now = new Date();
      if (startTime < now) {
        const confirmPastBooking = window.confirm(
          '⚠️ Estás creando una reserva en el pasado.\n\n¿Estás seguro de que quieres continuar?\n\n(Esto puede ser útil para registrar una cita que ya ocurrió)'
        );
        if (!confirmPastBooking) {
          setSubmitting(false);
          return;
        }
      }
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + (selectedService?.durationMinutes || 60));

      let customerId = bookingData.customerId;
      
      if (newCustomer) {
        // Split the name into first and last name
        const nameParts = bookingData.customerName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const customerResponse = await api.post('/customers', {
          firstName: firstName,
          lastName: lastName,
          email: bookingData.customerEmail,
          phone: bookingData.customerPhone,
        });
        customerId = customerResponse.data.id;
      }

      await dispatch(createBooking({
        serviceId: bookingData.serviceId,
        employeeId: bookingData.professionalId,
        customerId: customerId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        notes: bookingData.notes,
        status: 'confirmed',
      })).unwrap();

      navigate('/calendar');
    } catch (error) {
      console.error('Error creating booking:', error);
      setErrors({ submit: 'Error al crear la reserva. Intente nuevamente.' });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedService = services.find(s => s.id === bookingData.serviceId);
  const selectedEmployee = employees.find((p: any) => p.id === bookingData.professionalId);
  const selectedCustomer = customers.find(c => c.id === bookingData.customerId);

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        const filteredServices = services.filter(service => 
          service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (service.description && service.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        
        return (
          <>
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                placeholder="Buscar servicios..."
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
            </Box>
            <Grid container spacing={2}>
              {filteredServices.map((service) => (
                <Grid item xs={12} sm={6} md={4} key={service.id}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border: bookingData.serviceId === service.id ? '2px solid' : '1px solid',
                      borderColor: bookingData.serviceId === service.id ? 'primary.main' : 'grey.300',
                      transition: 'all 0.3s',
                    }}
                    onClick={() => {
                      console.log('Service selected:', service.name);
                      setBookingData({ ...bookingData, serviceId: service.id });
                      // Auto-advance to next step after a short delay
                      setTimeout(() => {
                        console.log('Auto-advancing to professional selection');
                        setActiveStep(1);
                      }, 300);
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {service.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {service.description}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip
                          icon={<Schedule />}
                          label={`${service.durationMinutes} min`}
                          size="small"
                        />
                        <Typography variant="h6" color="primary">
                          ${service.price}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
          </>
        );

      case 1:
        return (
          <Grid container spacing={2}>
            {employees.map((employee: any) => (
              <Grid item xs={12} sm={6} md={4} key={employee.id}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border: bookingData.professionalId === employee.id ? '2px solid' : '1px solid',
                      borderColor: bookingData.professionalId === employee.id ? 'primary.main' : 'grey.300',
                    }}
                    onClick={() => {
                      console.log('Professional selected:', employee.name);
                      setBookingData({ ...bookingData, professionalId: employee.id });
                      // Auto-advance to next step after a short delay
                      setTimeout(() => {
                        console.log('Auto-advancing to date & time selection');
                        setActiveStep(2);
                      }, 300);
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Person sx={{ mr: 1 }} />
                        <Typography variant="h6">
                          {employee.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {employee.specialties?.split(',').join(', ')}
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        );

      case 2:
        const isToday = bookingData.date.toDateString() === new Date().toDateString();
        const minTime = isToday ? new Date() : undefined;
        
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                <DatePicker
                  label="Fecha"
                  value={bookingData.date}
                  onChange={(newValue) => newValue && setBookingData({ ...bookingData, date: newValue })}
                  minDate={new Date()}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.date,
                      helperText: errors.date,
                    },
                  }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                <TimePicker
                  label="Hora"
                  value={bookingData.time}
                  onChange={(newValue) => newValue && setBookingData({ ...bookingData, time: newValue })}
                  minTime={minTime}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.time || !!errors.datetime,
                      helperText: errors.time || errors.datetime,
                    },
                  }}
                />
              </LocalizationProvider>
            </Grid>
            {availableSlots.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Horarios disponibles:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {availableSlots.map((slot) => {
                    const isPast = slot.startsWith('PAST:');
                    const timeString = isPast ? slot.replace('PAST:', '') : slot;
                    const [hours, minutes] = timeString.split(':');
                    const isSelected = bookingData.time.getHours() === parseInt(hours) &&
                                     bookingData.time.getMinutes() === parseInt(minutes);
                    
                    return (
                      <Chip
                        key={slot}
                        label={timeString}
                        onClick={() => {
                          if (isPast) {
                            const confirmPast = window.confirm(
                              '⚠️ Estás seleccionando un horario en el pasado.\n\n¿Estás seguro de que quieres continuar?\n\n(Esto puede ser útil para registrar una cita que ya ocurrió)'
                            );
                            if (!confirmPast) return;
                          }
                          
                          const newTime = new Date();
                          newTime.setHours(parseInt(hours), parseInt(minutes));
                          setBookingData({ ...bookingData, time: newTime });
                        }}
                        color={isSelected ? 'primary' : (isPast ? 'warning' : 'default')}
                        sx={isPast ? { 
                          opacity: 0.7,
                          '&:hover': { opacity: 1 },
                          backgroundColor: 'warning.light',
                          color: 'warning.contrastText'
                        } : {}}
                      />
                    );
                  })}
                </Box>
              </Grid>
            )}
          </Grid>
        );

      case 3:
        return (
          <Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Button
                variant={!newCustomer ? 'contained' : 'outlined'}
                onClick={() => setNewCustomer(false)}
              >
                Cliente Existente
              </Button>
              <Button
                variant={newCustomer ? 'contained' : 'outlined'}
                onClick={() => setNewCustomer(true)}
              >
                Nuevo Cliente
              </Button>
            </Box>

            {!newCustomer ? (
              <FormControl fullWidth error={!!errors.customerId}>
                <InputLabel>Seleccionar Cliente</InputLabel>
                <Select
                  value={bookingData.customerId}
                  onChange={(e) => setBookingData({ ...bookingData, customerId: e.target.value })}
                  label="Seleccionar Cliente"
                >
                  {customers.map((customer) => (
                    <MenuItem key={customer.id} value={customer.id}>
                      {customer.name} - {customer.email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nombre del Cliente"
                    value={bookingData.customerName}
                    onChange={(e) => setBookingData({ ...bookingData, customerName: e.target.value })}
                    error={!!errors.customerName}
                    helperText={errors.customerName}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
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
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Teléfono"
                    value={bookingData.customerPhone}
                    onChange={(e) => setBookingData({ ...bookingData, customerPhone: e.target.value })}
                    error={!!errors.customerPhone}
                    helperText={errors.customerPhone}
                  />
                </Grid>
              </Grid>
            )}

            <TextField
              fullWidth
              label="Notas adicionales"
              multiline
              rows={3}
              value={bookingData.notes}
              onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
              sx={{ mt: 2 }}
            />
          </Box>
        );

      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Resumen de la Reserva
            </Typography>
            <Paper sx={{ p: 3, bgcolor: 'background.default' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Servicio:
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedService?.name} - ${selectedService?.price}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {getTerm('professional')}:
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedEmployee?.name}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Fecha:
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {bookingData.date.toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Hora:
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {bookingData.time.toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Cliente:
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {newCustomer
                      ? `${bookingData.customerName} - ${bookingData.customerEmail}`
                      : `${selectedCustomer?.name} - ${selectedCustomer?.email}`}
                  </Typography>
                </Grid>
                {bookingData.notes && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Notas:
                    </Typography>
                    <Typography variant="body1">
                      {bookingData.notes}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>
            {errors.submit && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {errors.submit}
              </Alert>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => navigate('/calendar')} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Nuevo {getTerm('booking')}
          </Typography>
        </Box>

        <Paper sx={{ p: 3 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {renderStepContent()}

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
                    onClick={handleSubmit}
                    disabled={submitting}
                    endIcon={submitting ? <CircularProgress size={20} /> : <Check />}
                  >
                    Confirmar Reserva
                  </Button>
                ) : (
                  <Button
                    variant="contained"
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
      </motion.div>
    </Container>
  );
};

export default NewBooking;