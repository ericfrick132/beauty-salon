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
  Grid,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Switch,
  FormControlLabel,
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
  Payment,
  LocalAtm,
  CreditCard,
  AccountBalance,
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
import api from '../../services/api';

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
    hasPayment?: boolean;
    isPaymentSuccessful?: boolean;
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
  const [newMenuAnchor, setNewMenuAnchor] = useState<null | HTMLElement>(null);
  const [blockDialog, setBlockDialog] = useState<{ open: boolean; start?: string; end?: string; employeeId?: string }>(
    { open: false }
  );
  const [blockForm, setBlockForm] = useState({ 
    reason: '', 
    repeat: true, 
    daysOfWeek: [1,2,3,4,5] as number[], 
    until: '',
    // recurring
    startTimeOfDay: '09:00',
    endTimeOfDay: '10:00',
    // single
    singleDate: '',
    singleStart: '09:00',
    singleEnd: '10:00',
    forceOverride: false,
  });

  const pad2 = (n: number) => n.toString().padStart(2, '0');
  const toHHMM = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const roundTo15min = (d: Date) => {
    const ms = d.getTime();
    const minutes = d.getMinutes();
    const floored = minutes - (minutes % 15);
    d.setMinutes(floored, 0, 0);
    return d;
  };
  const roundHHMMTo15 = (hhmm: string) => {
    if (!hhmm) return hhmm;
    const [h, m] = hhmm.split(':').map(n => parseInt(n || '0', 10));
    const floored = m - (m % 15);
    return `${pad2(h)}:${pad2(floored)}`;
  };

  useEffect(() => {
    if (!blockDialog.open) return;
    const now = new Date();
    const s = blockDialog.start ? new Date(blockDialog.start) : now;
    const e = blockDialog.end ? new Date(blockDialog.end) : new Date(s.getTime() + 30*60*1000);
    roundTo15min(s);
    roundTo15min(e);
    const yyyy = s.getFullYear();
    const mm = pad2(s.getMonth() + 1);
    const dd = pad2(s.getDate());
    const dateStr = `${yyyy}-${mm}-${dd}`;
    setBlockForm(f => ({
      ...f,
      startTimeOfDay: toHHMM(s),
      endTimeOfDay: toHHMM(e),
      singleDate: dateStr,
      singleStart: toHHMM(s),
      singleEnd: toHHMM(e),
    }));
  }, [blockDialog.open]);
  
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

  // Payment Modal State
  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean;
    booking: BookingEvent | null;
  }>({ open: false, booking: null });
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<Array<{ id: string; start: string; end: string; employeeId: string }>>([]);
  const [viewRange, setViewRange] = useState<{ start: string; end: string } | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    bookingId: '',
    employeeId: '',
    amount: 0,
    tipAmount: 0,
    paymentMethod: 'cash',
    transactionId: '',
    notes: '',
  });
  
  const [paymentErrors, setPaymentErrors] = useState<any>({});

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

  // Scroll near current time on first render
  const initialScrollTime = React.useMemo(() => {
    const now = new Date();
    const hh = Math.max(0, now.getHours() - 1).toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}:00`;
  }, []);

  const paymentMethods = [
    { value: 'cash', label: 'Efectivo', icon: <LocalAtm /> },
    { value: 'card', label: 'Tarjeta', icon: <CreditCard /> },
    { value: 'transfer', label: 'Transferencia', icon: <AccountBalance /> },
    { value: 'mercadopago', label: 'MercadoPago', icon: <Payment /> },
  ];

  useEffect(() => {
    dispatch(fetchBookings());
    fetchEmployees();
  }, [dispatch]);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

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
        notes: booking.notes,
        hasPayment: booking.hasPayment || false,
        isPaymentSuccessful: booking.isPaymentSuccessful || false
      }
    }));

  const blockEvents = blocks.map(b => ({
    id: `block-${b.id}`,
    title: 'Bloqueado',
    start: b.start,
    end: b.end,
    display: 'background' as const,
    backgroundColor: '#9e9e9e',
    borderColor: '#9e9e9e',
    extendedProps: { isBlock: true, employeeId: b.employeeId }
  }));

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.changeView(view);
    }
  };

  // Fetch blocks for selected employee (or all) within current view range
  useEffect(() => {
    const loadBlocks = async () => {
      if (!viewRange) return;
      try {
        if (!selectedEmployee || selectedEmployee === 'all') {
          // Fetch for all employees in parallel
          const promises = employees.map(emp => api.get(`/employees/${emp.id}/blocks`, { params: { from: viewRange.start, to: viewRange.end } }).then(r => r.data).catch(() => []));
          const results = await Promise.all(promises);
          const flattened = results.flat();
          const items = Array.isArray(flattened) ? flattened : [];
          setBlocks(items.map((i: any) => ({ id: i.id, start: i.startTime, end: i.endTime, employeeId: i.employeeId })));
        } else {
          const res = await api.get(`/employees/${selectedEmployee}/blocks`, {
            params: { from: viewRange.start, to: viewRange.end }
          });
          const items = Array.isArray(res.data) ? res.data : [];
          setBlocks(items.map((i: any) => ({ id: i.id, start: i.startTime, end: i.endTime, employeeId: i.employeeId })));
        }
      } catch (e) {
        console.error('Error fetching blocks', e);
        setBlocks([]);
      }
    };
    loadBlocks();
  }, [selectedEmployee, viewRange, employees]);

  const handleEventClick = (info: EventClickArg) => {
    const event = info.event;
    // If it's a time block, allow quick delete
    if ((event.extendedProps as any)?.isBlock) {
      const originalId = event.id.startsWith('block-') ? event.id.substring(6) : event.id;
      const empId = (event.extendedProps as any)?.employeeId;
      if (window.confirm('¿Desea eliminar este bloqueo?')) {
        (async () => {
          try {
            if (empId && originalId) {
              await api.delete(`/employees/${empId}/blocks/${originalId}`);
              // Refresh blocks in current view
              if (viewRange) {
                if (selectedEmployee && selectedEmployee !== 'all') {
                  const res = await api.get(`/employees/${selectedEmployee}/blocks`, { params: { from: viewRange.start, to: viewRange.end } });
                  const items = Array.isArray(res.data) ? res.data : [];
                  setBlocks(items.map((i: any) => ({ id: i.id, start: i.startTime, end: i.endTime, employeeId: i.employeeId })));
                } else {
                  // reload for all employees
                  const promises = employees.map(emp => api.get(`/employees/${emp.id}/blocks`, { params: { from: viewRange.start, to: viewRange.end } }).then(r => r.data).catch(() => []));
                  const results = await Promise.all(promises);
                  const flattened = results.flat();
                  const items = Array.isArray(flattened) ? flattened : [];
                  setBlocks(items.map((i: any) => ({ id: i.id, start: i.startTime, end: i.endTime, employeeId: i.employeeId })));
                }
              }
            }
          } catch (e) {
            console.error('Error deleting block from calendar', e);
          }
        })();
      }
      return;
    }
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
    const start = selectInfo.startStr;
    const end = selectInfo.endStr;
    // default to currently filtered employee, else all
    const defEmp = selectedEmployee && selectedEmployee !== 'all' ? selectedEmployee : 'all';
    setBlockDialog({ open: true, start, end, employeeId: defEmp });
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

  // Payment functions
  const handleOpenPaymentDialog = (booking: BookingEvent) => {
    setPaymentDialog({ open: true, booking });
    setPaymentForm({
      bookingId: booking.id,
      employeeId: '',
      amount: booking.extendedProps?.price || 0,
      tipAmount: 0,
      paymentMethod: 'cash',
      transactionId: '',
      notes: '',
    });
    setPaymentErrors({});
  };

  const handleClosePaymentDialog = () => {
    setPaymentDialog({ open: false, booking: null });
    setPaymentForm({
      bookingId: '',
      employeeId: '',
      amount: 0,
      tipAmount: 0,
      paymentMethod: 'cash',
      transactionId: '',
      notes: '',
    });
    setPaymentErrors({});
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
    
    setPaymentErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSavePayment = async () => {
    if (!validatePaymentForm()) return;

    try {
      // Convert empty strings to null for Guid fields
      const paymentData = {
        ...paymentForm,
        employeeId: paymentForm.employeeId === '' ? null : paymentForm.employeeId,
        transactionId: paymentForm.transactionId === '' ? null : paymentForm.transactionId,
        notes: paymentForm.notes === '' ? null : paymentForm.notes
      };

      await api.post('/payments', paymentData);
      dispatch(fetchBookings()); // Refresh calendar
      handleClosePaymentDialog();
      setEventDialog({ open: false, event: null, mode: 'view' });
    } catch (error) {
      console.error('Error saving payment:', error);
      setPaymentErrors({ submit: 'Error al registrar el pago' });
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
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <Button variant="contained" startIcon={<Add />} onClick={(e)=> setNewMenuAnchor(e.currentTarget)}>Nuevo</Button>
          <Menu anchorEl={newMenuAnchor} open={Boolean(newMenuAnchor)} onClose={()=> setNewMenuAnchor(null)}>
            <MenuItem onClick={()=> { setNewMenuAnchor(null); window.location.href = '/new-booking'; }}>Nueva Reserva</MenuItem>
            <MenuItem onClick={()=> { 
              setNewMenuAnchor(null);
              const now = new Date();
              const end = new Date(now.getTime() + 30*60*1000);
              setBlockDialog({ open: true, start: now.toISOString(), end: end.toISOString() });
            }}>Bloquear horario</MenuItem>
          </Menu>
        </Box>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={currentView}
          events={[...calendarEvents, ...blockEvents]}
          locale="es"
          height="100%"
          headerToolbar={false}
          nowIndicator={true}
          businessHours={{
            startTime: '09:00',
            endTime: '18:00',
          }}
          slotMinTime="08:00"
          slotMaxTime="19:00"
          scrollTime={initialScrollTime}
          editable={true}
          selectable={true}
          selectMirror={true}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          select={handleDateSelect}
          datesSet={(arg) => {
            setViewRange({ start: arg.start.toISOString(), end: arg.end.toISOString() });
          }}
          eventOverlap={(still, moving) => {
            const a: any = still;
            const b: any = moving;
            if (a.extendedProps?.isBlock || b.extendedProps?.isBlock) return false;
            return true;
          }}
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

      {/* Block dialog */}
      <Dialog open={blockDialog.open} onClose={() => setBlockDialog({ open: false })}>
        <DialogTitle>Bloquear horario</DialogTitle>
        <DialogContent sx={{ minWidth: 400 }}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Empleado</InputLabel>
                <Select
                  label="Empleado"
                  value={blockDialog.employeeId || 'all'}
                  onChange={(e)=> setBlockDialog({ ...blockDialog, employeeId: e.target.value as string })}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  {employees.map((emp) => (
                    <MenuItem key={emp.id} value={emp.id}>{emp.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {blockForm.repeat ? (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="time"
                    label="Hora inicio"
                    value={blockForm.startTimeOfDay}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ step: 900 }}
                    onChange={(e)=> setBlockForm({ ...blockForm, startTimeOfDay: roundHHMMTo15(e.target.value) })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="time"
                    label="Hora fin"
                    value={blockForm.endTimeOfDay}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ step: 900 }}
                    onChange={(e)=> setBlockForm({ ...blockForm, endTimeOfDay: roundHHMMTo15(e.target.value) })}
                  />
                </Grid>
              </>
            ) : (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Fecha"
                    value={blockForm.singleDate}
                    InputLabelProps={{ shrink: true }}
                    onChange={(e)=> setBlockForm({ ...blockForm, singleDate: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="time"
                    label="Hora inicio"
                    value={blockForm.singleStart}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ step: 900 }}
                    onChange={(e)=> setBlockForm({ ...blockForm, singleStart: roundHHMMTo15(e.target.value) })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="time"
                    label="Hora fin"
                    value={blockForm.singleEnd}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ step: 900 }}
                    onChange={(e)=> setBlockForm({ ...blockForm, singleEnd: roundHHMMTo15(e.target.value) })}
                  />
                </Grid>
              </>
            )}
            <Grid item xs={12}>
              <TextField fullWidth label="Motivo (opcional)" value={blockForm.reason} onChange={(e)=>setBlockForm({...blockForm, reason: e.target.value})} />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel 
                control={<Switch checked={blockForm.forceOverride} onChange={(e)=> setBlockForm({...blockForm, forceOverride: e.target.checked})} />} 
                label="Forzar sobre reservas (las cancela)" 
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" sx={{ mb: 1 }}>Tipo de bloqueo</Typography>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={blockForm.repeat ? 'recurring' : 'single'}
                onChange={(e, val) => {
                  if (!val) return; // ignore deselect
                  setBlockForm({
                    ...blockForm,
                    repeat: val === 'recurring'
                  });
                }}
              >
                <ToggleButton value="recurring">Repetición</ToggleButton>
                <ToggleButton value="single">Puntual (vacaciones/salida)</ToggleButton>
              </ToggleButtonGroup>
            </Grid>
            {blockForm.repeat && (
              <>
                <Grid item xs={12}>
                  <Typography variant="body2">Días de semana</Typography>
                  <Box>
                    {[0,1,2,3,4,5,6].map(d => (
                      <FormControlLabel key={d} control={<Switch size="small" checked={blockForm.daysOfWeek.includes(d)} onChange={(e)=>{
                        const set = new Set(blockForm.daysOfWeek);
                        if (e.target.checked) set.add(d); else set.delete(d);
                        setBlockForm({...blockForm, daysOfWeek: Array.from(set)});
                      }} />} label={['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d]} />
                    ))}
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth type="date" label="Repetir hasta" InputLabelProps={{ shrink: true }} value={blockForm.until} onChange={(e)=> setBlockForm({...blockForm, until: e.target.value})} />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> setBlockDialog({ open: false })}>Cancelar</Button>
          <Button variant="contained" onClick={async ()=>{
            try {
              const target = blockDialog.employeeId || 'all';
              const targetIds = target === 'all' ? employees.map(e => e.id) : [target];
              if (blockForm.repeat) {
                const todayIso = new Date().toISOString().split('T')[0];
                const startDate = (blockDialog.start||'').split('T')[0] || blockForm.singleDate || todayIso;
                const startTimeOfDay = blockForm.startTimeOfDay || '09:00';
                const endTimeOfDay = blockForm.endTimeOfDay || '10:00';
                for (const id of targetIds) {
                  const payload: any = {
                    startDate,
                    startTimeOfDay,
                    endTimeOfDay,
                    daysOfWeek: blockForm.daysOfWeek,
                    reason: blockForm.reason,
                    forceOverride: blockForm.forceOverride,
                  };
                  if (blockForm.until) payload.endDate = blockForm.until;
                  await api.post(`/employees/${id}/blocks/recurring`, payload);
                }
              } else {
                if (!blockForm.singleDate || !blockForm.singleStart || !blockForm.singleEnd) {
                  alert('Complete fecha y horarios');
                  return;
                }
                const startISO = new Date(`${blockForm.singleDate}T${blockForm.singleStart}`).toISOString();
                const endISO = new Date(`${blockForm.singleDate}T${blockForm.singleEnd}`).toISOString();
                if (new Date(endISO) <= new Date(startISO)) {
                  alert('La hora fin debe ser mayor a la hora inicio');
                  return;
                }
                for (const id of targetIds) {
                  await api.post(`/employees/${id}/blocks`, {
                    startTime: startISO,
                    endTime: endISO,
                    reason: blockForm.reason,
                    forceOverride: blockForm.forceOverride,
                  });
                }
              }
              setBlockDialog({ open: false });
              setBlockForm({ 
                reason: '', 
                repeat: true, 
                daysOfWeek: [1,2,3,4,5], 
                until: '',
                startTimeOfDay: '09:00',
                endTimeOfDay: '10:00',
                singleDate: '',
                singleStart: '09:00',
                singleEnd: '10:00',
                forceOverride: false,
              });
              // refresh
              if (viewRange) {
                // if a specific employee is selected in filter, refresh his blocks; else clear (we don't render all at once)
                if (selectedEmployee && selectedEmployee !== 'all') {
                  const res = await api.get(`/employees/${selectedEmployee}/blocks`, { params: { from: viewRange.start, to: viewRange.end } });
                  const items = Array.isArray(res.data) ? res.data : [];
                  setBlocks(items.map((i: any) => ({ id: i.id, start: i.startTime, end: i.endTime, employeeId: i.employeeId })));
                } else {
                  setBlocks([]);
                }
              }
            } catch (e: any) {
              console.error('Error creating block', e);
              alert(e?.response?.data?.message || 'Error creando bloqueo');
            }
          }}>Guardar</Button>
        </DialogActions>
      </Dialog>

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
              {employees.map((emp) => (
                <MenuItem key={emp.id} value={emp.id}>{emp.name}</MenuItem>
              ))}
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
              {/* Payment button - only show for non-cancelled bookings without successful payment */}
              {eventDialog.event?.extendedProps?.status !== 'cancelled' && 
               !eventDialog.event?.extendedProps?.isPaymentSuccessful && (
                <Button
                  color="success"
                  startIcon={<Payment />}
                  onClick={() => handleOpenPaymentDialog(eventDialog.event!)}
                >
                  Registrar Pago
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

      {/* Payment Dialog */}
      <Dialog open={paymentDialog.open} onClose={handleClosePaymentDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Registrar Pago
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {paymentDialog.booking && (
              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="subtitle2">
                    <strong>Cliente:</strong> {paymentDialog.booking.extendedProps?.customerName}
                  </Typography>
                  <Typography variant="subtitle2">
                    <strong>Servicio:</strong> {paymentDialog.booking.extendedProps?.serviceName}
                  </Typography>
                  <Typography variant="subtitle2">
                    <strong>Profesional:</strong> {paymentDialog.booking.extendedProps?.employeeName}
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
                error={!!paymentErrors.amount}
                helperText={paymentErrors.amount}
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
                  error={!!paymentErrors.transactionId}
                  helperText={paymentErrors.transactionId}
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

          {paymentErrors.submit && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {paymentErrors.submit}
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
    </Box>
  );
};

export default CalendarView;
