import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  ButtonGroup,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Alert,
  Toolbar,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Today,
  ViewWeek,
  ViewDay,
  ViewModule,
  FilterList,
  Add,
  Edit,
  Delete,
  Check,
  Close,
} from '@mui/icons-material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { DateSelectArg, EventClickArg, EventDropArg } from '@fullcalendar/core';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

import { useTenant } from '../../contexts/TenantContext';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchBookings, updateBooking, deleteBooking } from '../../store/slices/bookingSlice';
import { EventImpl } from '@fullcalendar/core/internal';

interface BookingEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps?: {
    bookingId: string;
    customerName: string;
    customerPhone: string;
    employeeName: string;
    serviceName: string;
    status: string;
    price: number;
    notes?: string;
  };
}

const CalendarView: React.FC = () => {
  const { config, getTerm } = useTenant();
  const dispatch = useAppDispatch();
  const { bookings, loading } = useAppSelector(state => state.booking);
  
  const calendarRef = useRef<FullCalendar>(null);
  const [currentView, setCurrentView] = useState('timeGridWeek');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
  
  // Event dialogs
  const [eventDialog, setEventDialog] = useState<{
    open: boolean;
    event: BookingEvent | null;
    mode: 'view' | 'edit' | 'delete';
  }>({ open: false, event: null, mode: 'view' });
  
  const [rescheduleDialog, setRescheduleDialog] = useState<{
    open: boolean;
    event: BookingEvent | null;
    newStart?: string;
    newEnd?: string;
  }>({ open: false, event: null });

  // Colores del tema
  const primaryColor = config?.theme?.primaryColor || '#1976d2';
  const accentColor = config?.theme?.accentColor || '#ffc107';
  
  const statusColors = {
    'pending': '#ff9800',
    'confirmed': '#4caf50',
    'completed': '#2196f3',
    'cancelled': '#f44336',
    'no_show': '#9e9e9e'
  };

  useEffect(() => {
    dispatch(fetchBookings());
  }, [dispatch]);

  // Convertir bookings a eventos de calendario
  const calendarEvents: BookingEvent[] = bookings
    .filter(booking => {
      if (selectedEmployee !== 'all' && booking.employeeId !== selectedEmployee) return false;
      if (selectedStatus !== 'all' && booking.status !== selectedStatus) return false;
      return true;
    })
    .map(booking => ({
      id: booking.id,
      title: `${booking.customerName} - ${booking.serviceName}`,
      start: booking.startTime,
      end: booking.endTime,
      backgroundColor: statusColors[booking.status as keyof typeof statusColors] || primaryColor,
      borderColor: statusColors[booking.status as keyof typeof statusColors] || primaryColor,
      textColor: '#ffffff',
      extendedProps: {
        bookingId: booking.id,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        employeeName: booking.employeeName,
        serviceName: booking.serviceName,
        status: booking.status,
        price: booking.price || 0,
        notes: booking.notes
      }
    }));

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.changeView(view);
    }
  };

  const handleEventClick = (info: EventClickArg) => {
    const event = info.event;
    const bookingEvent: BookingEvent = {
      id: event.id,
      title: event.title,
      start: event.start?.toISOString() || '',
      end: event.end?.toISOString() || '',
      extendedProps: event.extendedProps as BookingEvent['extendedProps']
    };
    
    setEventDialog({ open: true, event: bookingEvent, mode: 'view' });
  };

  const handleEventDrop = async (info: EventDropArg) => {
    const { event } = info;
    const bookingId = event.id;
    const newStart = event.start?.toISOString();
    const newEnd = event.end?.toISOString();

    if (!newStart || !newEnd) {
      info.revert();
      return;
    }

    try {
      await dispatch(updateBooking({
        id: bookingId,
        updates: {
          startTime: newStart,
          endTime: newEnd
        }
      })).unwrap();
      
      // Refresh calendar
      dispatch(fetchBookings());
    } catch (error) {
      console.error('Error rescheduling booking:', error);
      info.revert();
    }
  };

  const handleEventResize = async (info: any) => {
    const { event } = info;
    const bookingId = event.id;
    const newStart = event.start?.toISOString();
    const newEnd = event.end?.toISOString();

    if (!newStart || !newEnd) {
      info.revert();
      return;
    }

    try {
      await dispatch(updateBooking({
        id: bookingId,
        updates: {
          startTime: newStart,
          endTime: newEnd
        }
      })).unwrap();
      
      dispatch(fetchBookings());
    } catch (error) {
      console.error('Error resizing booking:', error);
      info.revert();
    }
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    // TODO: Abrir dialog para crear nueva cita
    console.log('Date selected:', selectInfo);
  };

  const handleStatusChange = async (bookingId: string, newStatus: string, reason?: string) => {
    try {
      // TODO: Usar el nuevo endpoint de cambio de estado
      await dispatch(updateBooking({
        id: bookingId,
        updates: { status: newStatus as 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' }
      })).unwrap();
      
      dispatch(fetchBookings());
      setEventDialog({ open: false, event: null, mode: 'view' });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      await dispatch(deleteBooking(bookingId)).unwrap();
      dispatch(fetchBookings());
      setEventDialog({ open: false, event: null, mode: 'view' });
    } catch (error) {
      console.error('Error deleting booking:', error);
    }
  };

  const getStatusChipColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'completed': return 'primary';
      case 'cancelled': return 'error';
      case 'pending': return 'warning';
      case 'no_show': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Toolbar sx={{ px: '0 !important' }}>
          <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Calendario de {getTerm('booking')}s
          </Typography>
          
          {/* Navigation */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ButtonGroup size="small">
              <IconButton 
                onClick={() => calendarRef.current?.getApi().prev()}
                size="small"
              >
                <ChevronLeft />
              </IconButton>
              <Button 
                onClick={() => calendarRef.current?.getApi().today()}
                startIcon={<Today />}
                size="small"
              >
                Hoy
              </Button>
              <IconButton 
                onClick={() => calendarRef.current?.getApi().next()}
                size="small"
              >
                <ChevronRight />
              </IconButton>
            </ButtonGroup>

            {/* View Buttons */}
            <ButtonGroup size="small">
              <Button
                variant={currentView === 'dayGridMonth' ? 'contained' : 'outlined'}
                onClick={() => handleViewChange('dayGridMonth')}
                startIcon={<ViewModule />}
              >
                Mes
              </Button>
              <Button
                variant={currentView === 'timeGridWeek' ? 'contained' : 'outlined'}
                onClick={() => handleViewChange('timeGridWeek')}
                startIcon={<ViewWeek />}
              >
                Semana
              </Button>
              <Button
                variant={currentView === 'timeGridDay' ? 'contained' : 'outlined'}
                onClick={() => handleViewChange('timeGridDay')}
                startIcon={<ViewDay />}
              >
                Día
              </Button>
            </ButtonGroup>

            {/* Filters */}
            <IconButton 
              onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
              size="small"
            >
              <FilterList />
            </IconButton>
          </Box>
        </Toolbar>
      </Paper>

      {/* Calendar */}
      <Paper sx={{ flex: 1, p: 2 }}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={currentView}
          events={calendarEvents}
          locale="es"
          height="100%"
          headerToolbar={false}
          businessHours={{
            startTime: '09:00',
            endTime: '18:00',
          }}
          slotMinTime="08:00"
          slotMaxTime="19:00"
          editable={true}
          selectable={true}
          selectMirror={true}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          select={handleDateSelect}
          allDaySlot={false}
          slotDuration="00:30:00"
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }}
          dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
          eventDisplay="block"
        />
      </Paper>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={() => setFilterMenuAnchor(null)}
      >
        <MenuItem>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Empleado</InputLabel>
            <Select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              label="Empleado"
            >
              <MenuItem value="all">Todos</MenuItem>
              {/* TODO: Cargar empleados dinámicamente */}
            </Select>
          </FormControl>
        </MenuItem>
        <MenuItem>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Estado</InputLabel>
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              label="Estado"
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="pending">Pendiente</MenuItem>
              <MenuItem value="confirmed">Confirmado</MenuItem>
              <MenuItem value="completed">Completado</MenuItem>
              <MenuItem value="cancelled">Cancelado</MenuItem>
              <MenuItem value="no_show">No Show</MenuItem>
            </Select>
          </FormControl>
        </MenuItem>
      </Menu>

      {/* Event Detail Dialog */}
      <Dialog
        open={eventDialog.open}
        onClose={() => setEventDialog({ open: false, event: null, mode: 'view' })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {eventDialog.mode === 'view' && 'Detalles de la Cita'}
          {eventDialog.mode === 'edit' && 'Editar Cita'}
          {eventDialog.mode === 'delete' && 'Eliminar Cita'}
        </DialogTitle>
        <DialogContent>
          {eventDialog.event && (
            <Box sx={{ py: 2 }}>
              <Box sx={{ display: 'grid', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Cliente:
                  </Typography>
                  <Typography variant="body1">
                    {eventDialog.event.extendedProps?.customerName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {eventDialog.event.extendedProps?.customerPhone}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    {getTerm('professional')}:
                  </Typography>
                  <Typography variant="body1">
                    {eventDialog.event.extendedProps?.employeeName}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Servicio:
                  </Typography>
                  <Typography variant="body1">
                    {eventDialog.event.extendedProps?.serviceName}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Fecha y Hora:
                  </Typography>
                  <Typography variant="body1">
                    {format(parseISO(eventDialog.event.start), 'EEEE, d MMMM yyyy - HH:mm', { locale: es })}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Estado:
                  </Typography>
                  <Chip 
                    label={eventDialog.event.extendedProps?.status}
                    color={getStatusChipColor(eventDialog.event.extendedProps?.status || '')}
                    size="small"
                  />
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Precio:
                  </Typography>
                  <Typography variant="body1">
                    ${eventDialog.event.extendedProps?.price}
                  </Typography>
                </Box>

                {eventDialog.event.extendedProps?.notes && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Notas:
                    </Typography>
                    <Typography variant="body1">
                      {eventDialog.event.extendedProps.notes}
                    </Typography>
                  </Box>
                )}
              </Box>

              {eventDialog.mode === 'delete' && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  ¿Estás seguro de que deseas eliminar esta cita? Esta acción no se puede deshacer.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {eventDialog.mode === 'view' && (
            <>
              <Button onClick={() => setEventDialog({ ...eventDialog, mode: 'edit' })}>
                Editar
              </Button>
              <Button 
                color="error"
                onClick={() => setEventDialog({ ...eventDialog, mode: 'delete' })}
              >
                Eliminar
              </Button>
              {eventDialog.event?.extendedProps?.status === 'pending' && (
                <Button
                  color="success"
                  startIcon={<Check />}
                  onClick={() => handleStatusChange(eventDialog.event!.id, 'confirmed')}
                >
                  Confirmar
                </Button>
              )}
              {eventDialog.event?.extendedProps?.status === 'confirmed' && (
                <Button
                  color="primary"
                  startIcon={<Check />}
                  onClick={() => handleStatusChange(eventDialog.event!.id, 'completed')}
                >
                  Completar
                </Button>
              )}
              <Button onClick={() => setEventDialog({ open: false, event: null, mode: 'view' })}>
                Cerrar
              </Button>
            </>
          )}
          
          {eventDialog.mode === 'delete' && (
            <>
              <Button onClick={() => setEventDialog({ ...eventDialog, mode: 'view' })}>
                Cancelar
              </Button>
              <Button
                color="error"
                onClick={() => eventDialog.event && handleDeleteBooking(eventDialog.event.id)}
              >
                Eliminar
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CalendarView;