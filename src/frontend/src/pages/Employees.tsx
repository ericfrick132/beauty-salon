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
  Button,
  TextField,
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
  InputAdornment,
  Switch,
  FormControlLabel,
  Avatar,
  Divider,
} from '@mui/material';
import {
  ArrowBack,
  Add,
  Edit,
  Delete,
  Person,
  AttachMoney,
  TrendingUp,
  AccountBalance,
  Phone,
  Email,
  Percent,
  CheckCircle,
  Cancel,
  Block,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTenant } from '../contexts/TenantContext';
import api from '../services/api';
import { format } from 'date-fns';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

interface Employee {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  employeeType: string;
  commissionPercentage: number;
  serviceCommissionPercentage?: number;
  productCommissionPercentage?: number;
  fixedSalary: number;
  paymentMethod: string;
  specialties?: string;
  workingHours?: string;
  canPerformServices: boolean;
  isActive: boolean;
  createdAt: string;
  totalEarnings?: number;
  pendingCommissions?: number;
  lastPayment?: string;
}

interface Commission {
  employeeId: string;
  employeeName: string;
  period: string;
  totalServices: number;
  totalRevenue: number;
  commissionPercentage: number;
  commissionAmount: number;
  fixedSalary: number;
  totalEarnings: number;
  isPaid: boolean;
}

const Employees: React.FC = () => {
  const navigate = useNavigate();
  const { getTerm } = useTenant();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openCommissionDialog, setOpenCommissionDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    employeeType: 'employee',
    commissionPercentage: 0,
    serviceCommissionPercentage: 0,
    productCommissionPercentage: 0,
    fixedSalary: 0,
    paymentMethod: 'percentage',
    specialties: '',
    workingHours: '',
    canPerformServices: true,
    isActive: true,
  });
  
  const [errors, setErrors] = useState<any>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [blocksDialogOpen, setBlocksDialogOpen] = useState(false);
  const [blocksEmployee, setBlocksEmployee] = useState<Employee | null>(null);
  const [blocks, setBlocks] = useState<{ id: string; startTime: string; endTime: string; reason?: string }[]>([]);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleEmployee, setScheduleEmployee] = useState<Employee | null>(null);
  const [scheduleForm, setScheduleForm] = useState<Array<{ day: number; start: string; end: string }>>([
    { day: 1, start: '09:00', end: '18:00' },
    { day: 2, start: '09:00', end: '18:00' },
    { day: 3, start: '09:00', end: '18:00' },
    { day: 4, start: '09:00', end: '18:00' },
    { day: 5, start: '09:00', end: '18:00' },
    { day: 6, start: '', end: '' },
    { day: 0, start: '', end: '' },
  ]);
  const [breakForm, setBreakForm] = useState<{ start: string; end: string; daysOfWeek: number[]; from: string; until: string }>(() => {
    const today = new Date();
    const iso = today.toISOString().slice(0,10);
    return { start: '13:00', end: '14:00', daysOfWeek: [1,2,3,4,5], from: iso, until: '' };
  });

  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    totalPendingCommissions: 0,
    totalPaidThisMonth: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [employeesRes, statsRes] = await Promise.all([
        api.get('/employees'),
        api.get('/employees/stats'),
      ]);
      
      console.log('Employees API response:', employeesRes.data);
      console.log('Stats API response:', statsRes.data);
      
      // The API returns the array directly, not wrapped in a data property
      setEmployees(Array.isArray(employeesRes.data) ? employeesRes.data : []);
      setStats(statsRes.data || {
        totalEmployees: 0,
        activeEmployees: 0,
        totalPendingCommissions: 0,
        totalPaidThisMonth: 0,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      // Set empty data on error
      setEmployees([]);
      setStats({
        totalEmployees: 0,
        activeEmployees: 0,
        totalPendingCommissions: 0,
        totalPaidThisMonth: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCommissions = async (employeeId: string) => {
    try {
      const response = await api.get(`/employees/${employeeId}/commissions`);
      setCommissions(response.data);
    } catch (error) {
      console.error('Error fetching commissions:', error);
    }
  };

  const handleOpenDialog = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        name: employee.name,
        email: employee.email || '',
        phone: employee.phone || '',
        employeeType: employee.employeeType,
        commissionPercentage: employee.commissionPercentage,
        serviceCommissionPercentage: employee.serviceCommissionPercentage ?? employee.commissionPercentage,
        productCommissionPercentage: employee.productCommissionPercentage ?? employee.commissionPercentage,
        fixedSalary: employee.fixedSalary,
        paymentMethod: employee.paymentMethod,
        specialties: employee.specialties || '',
        workingHours: employee.workingHours || '',
        canPerformServices: employee.canPerformServices,
        isActive: employee.isActive,
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        employeeType: 'employee',
        commissionPercentage: 0,
        serviceCommissionPercentage: 0,
        productCommissionPercentage: 0,
        fixedSalary: 0,
        paymentMethod: 'percentage',
        specialties: '',
        workingHours: '',
        canPerformServices: true,
        isActive: true,
      });
    }
    setErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingEmployee(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      employeeType: 'employee',
      commissionPercentage: 0,
      serviceCommissionPercentage: 0,
      productCommissionPercentage: 0,
      fixedSalary: 0,
      paymentMethod: 'percentage',
      specialties: '',
      workingHours: '',
      canPerformServices: true,
      isActive: true,
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: any = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    
    if (formData.paymentMethod === 'percentage' || formData.paymentMethod === 'mixed') {
      [
        { key: 'commissionPercentage', value: formData.commissionPercentage },
        { key: 'serviceCommissionPercentage', value: formData.serviceCommissionPercentage },
        { key: 'productCommissionPercentage', value: formData.productCommissionPercentage },
      ].forEach(field => {
        if (field.value < 0 || field.value > 100) {
          newErrors[field.key] = 'La comisión debe estar entre 0 y 100';
        }
      });
    }
    
    if (formData.paymentMethod === 'fixed' || formData.paymentMethod === 'mixed') {
      if (formData.fixedSalary < 0) {
        newErrors.fixedSalary = 'El salario no puede ser negativo';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveEmployee = async () => {
    if (!validateForm()) return;

    try {
      // Prepare data according to backend DTO structure
      const payload = {
        ...formData,
        // Ensure correct data types
        commissionPercentage: Number(formData.commissionPercentage),
        serviceCommissionPercentage: Number(formData.serviceCommissionPercentage),
        productCommissionPercentage: Number(formData.productCommissionPercentage),
        fixedSalary: Number(formData.fixedSalary),
        // Convert empty specialties and workingHours to null if needed
        specialties: formData.specialties || null,
        workingHours: formData.workingHours || null,
      };

      if (editingEmployee) {
        await api.put(`/employees/${editingEmployee.id}`, payload);
      } else {
        await api.post('/employees', payload);
      }
      fetchData();
      handleCloseDialog();
    } catch (error: any) {
      console.error('Error saving employee:', error);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        setErrors({ submit: 'Error al guardar el empleado' });
      }
    }
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    try {
      await api.delete(`/employees/${employeeToDelete.id}`);
      fetchData();
      setDeleteConfirmOpen(false);
      setEmployeeToDelete(null);
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  };

  const handleViewCommissions = (employee: Employee) => {
    setSelectedEmployee(employee);
    fetchCommissions(employee.id);
    setOpenCommissionDialog(true);
  };

  const handlePayCommission = async (commissionId: string) => {
    try {
      await api.post(`/employees/commissions/${commissionId}/pay`);
      if (selectedEmployee) {
        fetchCommissions(selectedEmployee.id);
      }
    } catch (error) {
      console.error('Error paying commission:', error);
    }
  };

  const getEmployeeTypeLabel = (type: string) => {
    switch (type) {
      case 'employee': return 'Empleado';
      case 'contractor': return 'Contratista';
      default: return type;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'percentage': return 'Porcentaje';
      case 'fixed': return 'Salario Fijo';
      case 'mixed': return 'Mixto';
      default: return method;
    }
  };

  // Blocks dialog helpers
  const openBlocksDialog = async (employee: Employee) => {
    setBlocksEmployee(employee);
    setBlocksDialogOpen(true);
    await loadBlocks(employee.id);
  };

  const openScheduleDialog = async (employee: Employee) => {
    setScheduleEmployee(employee);
    setScheduleDialogOpen(true);
    try {
      const res = await api.get(`/employees/${employee.id}/schedule`);
      const list = Array.isArray(res.data) ? res.data : [];
      const base = [1,2,3,4,5,6,0].map(d => ({ day: d, start: '', end: '' }));
      list.forEach((item: any) => {
        const idx = base.findIndex(x => x.day === item.dayOfWeek);
        if (idx >= 0) {
          base[idx].start = (item.start || item.startTime || '').toString().substring(0,5);
          base[idx].end = (item.end || item.endTime || '').toString().substring(0,5);
        }
      });
      setScheduleForm(base);
    } catch (e) {
      console.error('Error loading schedule', e);
    }
  };

  const loadBlocks = async (employeeId: string) => {
    try {
      const from = new Date();
      const to = new Date();
      to.setDate(to.getDate() + 30);
      const res = await api.get(`/employees/${employeeId}/blocks`, { params: { from: from.toISOString(), to: to.toISOString() } });
      setBlocks(res.data || []);
    } catch (e) {
      console.error('Error loading blocks', e);
      setBlocks([]);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
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
              Gestión de Empleados
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Nuevo Empleado
          </Button>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Person sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography color="text.secondary" variant="subtitle2">
                    Total Empleados
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  {stats.totalEmployees}
                </Typography>
                <Typography variant="body2" color="success.main">
                  {stats.activeEmployees} activos
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AttachMoney sx={{ mr: 1, color: 'warning.main' }} />
                  <Typography color="text.secondary" variant="subtitle2">
                    Comisiones Pendientes
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  ${stats.totalPendingCommissions.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AccountBalance sx={{ mr: 1, color: 'success.main' }} />
                  <Typography color="text.secondary" variant="subtitle2">
                    Pagado Este Mes
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  ${stats.totalPaidThisMonth.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Percent sx={{ mr: 1, color: 'info.main' }} />
                  <Typography color="text.secondary" variant="subtitle2">
                    Comisión Promedio
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  {employees.length > 0 
                    ? (employees.reduce((acc, e) => acc + (e.commissionPercentage || 0), 0) / employees.length).toFixed(0)
                    : 0}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Employees Table */}
        <Paper sx={{ p: 2 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Contacto</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Método de Pago</TableCell>
                  <TableCell>Comisión</TableCell>
                  <TableCell>Salario Fijo</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Pendiente</TableCell>
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
                ) : employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      No se encontraron empleados
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                            {employee.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography variant="body1">
                            {employee.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          {employee.email && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <Email sx={{ mr: 0.5, fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2">{employee.email}</Typography>
                            </Box>
                          )}
                          {employee.phone && (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Phone sx={{ mr: 0.5, fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2">{employee.phone}</Typography>
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getEmployeeTypeLabel(employee.employeeType)}
                          size="small"
                          color={employee.employeeType === 'employee' ? 'primary' : 'secondary'}
                        />
                      </TableCell>
                      <TableCell>
                        {getPaymentMethodLabel(employee.paymentMethod)}
                      </TableCell>
                      <TableCell>
                        {employee.paymentMethod !== 'fixed' && (
                          <Chip
                            icon={<Percent />}
                            label={`${employee.commissionPercentage}%`}
                            size="small"
                            color="info"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {employee.paymentMethod !== 'percentage' && employee.fixedSalary > 0 ? (
                          <Typography variant="body2">
                            ${employee.fixedSalary.toLocaleString()}
                          </Typography>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={employee.isActive ? <CheckCircle /> : <Cancel />}
                          label={employee.isActive ? 'Activo' : 'Inactivo'}
                          size="small"
                          color={employee.isActive ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        {employee.pendingCommissions ? (
                          <Typography variant="body2" color="warning.main" sx={{ fontWeight: 600 }}>
                            ${employee.pendingCommissions.toLocaleString()}
                          </Typography>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Ver comisiones">
                          <IconButton
                            size="small"
                            onClick={() => handleViewCommissions(employee)}
                            color="primary"
                          >
                            <TrendingUp />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Horarios">
                          <IconButton
                            size="small"
                            onClick={() => openScheduleDialog(employee)}
                          >
                            <ScheduleIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Bloquear horarios">
                          <IconButton
                            size="small"
                            onClick={() => openBlocksDialog(employee)}
                            color="secondary"
                          >
                            <Block />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(employee)}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEmployeeToDelete(employee);
                              setDeleteConfirmOpen(true);
                            }}
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Employee Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingEmployee ? 'Editar' : 'Nuevo'} Empleado
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nombre"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  error={!!errors.name}
                  helperText={errors.name}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  error={!!errors.email}
                  helperText={errors.email}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Teléfono"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Empleado</InputLabel>
                  <Select
                    value={formData.employeeType}
                    onChange={(e) => setFormData({ ...formData, employeeType: e.target.value })}
                    label="Tipo de Empleado"
                  >
                    <MenuItem value="employee">Empleado</MenuItem>
                    <MenuItem value="contractor">Contratista</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Método de Pago</InputLabel>
                  <Select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    label="Método de Pago"
                  >
                    <MenuItem value="percentage">Solo Porcentaje</MenuItem>
                    <MenuItem value="fixed">Solo Salario Fijo</MenuItem>
                    <MenuItem value="mixed">Mixto (Fijo + Comisión)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {(formData.paymentMethod === 'percentage' || formData.paymentMethod === 'mixed') && (
                <>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Comisión base"
                      type="number"
                      value={formData.commissionPercentage}
                      onChange={(e) => setFormData({ ...formData, commissionPercentage: parseFloat(e.target.value) || 0 })}
                      error={!!errors.commissionPercentage}
                      helperText={errors.commissionPercentage || 'Por defecto para reportes'}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Comisión servicios"
                      type="number"
                      value={formData.serviceCommissionPercentage}
                      onChange={(e) => setFormData({ ...formData, serviceCommissionPercentage: parseFloat(e.target.value) || 0 })}
                      error={!!errors.serviceCommissionPercentage}
                      helperText={errors.serviceCommissionPercentage}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Comisión productos"
                      type="number"
                      value={formData.productCommissionPercentage}
                      onChange={(e) => setFormData({ ...formData, productCommissionPercentage: parseFloat(e.target.value) || 0 })}
                      error={!!errors.productCommissionPercentage}
                      helperText={errors.productCommissionPercentage}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                    />
                  </Grid>
                </>
              )}
              {(formData.paymentMethod === 'fixed' || formData.paymentMethod === 'mixed') && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Salario Fijo"
                    type="number"
                    value={formData.fixedSalary}
                    onChange={(e) => setFormData({ ...formData, fixedSalary: parseFloat(e.target.value) || 0 })}
                    error={!!errors.fixedSalary}
                    helperText={errors.fixedSalary}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                  }
                  label="Empleado activo"
                />
              </Grid>
            </Grid>
            {errors.submit && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {errors.submit}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button onClick={handleSaveEmployee} variant="contained">
              {editingEmployee ? 'Guardar' : 'Crear'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Blocks Dialog */}
        <Dialog open={blocksDialogOpen} onClose={() => setBlocksDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Bloquear horarios - {blocksEmployee?.name}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ my: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Seleccione en el calendario un rango para bloquear. Rango mínimo 15 minutos.
              </Typography>
              {/* Simple calendar using FullCalendar-like selection is heavy here; use two datetime inputs for MVP */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="datetime-local"
                    label="Inicio"
                    InputLabelProps={{ shrink: true }}
                    value={(new Date()).toISOString().slice(0,16)}
                    onChange={() => {}}
                    disabled
                    helperText="Use los botones rápidos o ingrese abajo"
                  />
                </Grid>
              </Grid>
            </Box>
            {/* Quick creator */}
            <QuickBlockCreator 
              employeeId={blocksEmployee?.id || ''} 
              onCreated={async () => { if (blocksEmployee) await loadBlocks(blocksEmployee.id); }} 
            />
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Bloqueos próximos</Typography>
            {blocks.length === 0 ? (
              <Alert severity="info">No hay bloqueos próximos</Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Inicio</TableCell>
                      <TableCell>Fin</TableCell>
                      <TableCell>Motivo</TableCell>
                      <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {blocks.map(b => (
                      <TableRow key={b.id}>
                        <TableCell>{format(new Date(b.startTime), 'dd/MM/yyyy HH:mm')}</TableCell>
                        <TableCell>{format(new Date(b.endTime), 'dd/MM/yyyy HH:mm')}</TableCell>
                        <TableCell>{b.reason || '-'}</TableCell>
                        <TableCell align="right">
                          <Button size="small" color="error" onClick={async () => {
                            try {
                              if (!blocksEmployee) return;
                              await api.delete(`/employees/${blocksEmployee.id}/blocks/${b.id}`);
                              await loadBlocks(blocksEmployee.id);
                            } catch (e) {
                              console.error('Error deleting block', e);
                            }
                          }}>Eliminar</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBlocksDialogOpen(false)}>Cerrar</Button>
          </DialogActions>
        </Dialog>

        {/* Schedule Dialog */}
        <Dialog open={scheduleDialogOpen} onClose={() => setScheduleDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Horarios de {scheduleEmployee?.name}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {scheduleForm.map((row, idx) => (
                <React.Fragment key={row.day}>
                  <Grid item xs={4}>
                    <Typography sx={{ mt: 1 }}>{['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][row.day]}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <TextField fullWidth type="time" label="Entrada" value={row.start} onChange={(e)=>{
                      const arr = [...scheduleForm];
                      arr[idx] = { ...row, start: e.target.value };
                      setScheduleForm(arr);
                    }} InputLabelProps={{ shrink: true }} />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField fullWidth type="time" label="Salida" value={row.end} onChange={(e)=>{
                      const arr = [...scheduleForm];
                      arr[idx] = { ...row, end: e.target.value };
                      setScheduleForm(arr);
                    }} InputLabelProps={{ shrink: true }} />
                  </Grid>
                </React.Fragment>
              ))}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle1">Descanso fijo (opcional)</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Crea bloqueos recurrentes (p. ej. almuerzo) aplicados a los días seleccionados.
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth type="time" label="Desde" value={breakForm.start} onChange={(e)=> setBreakForm({ ...breakForm, start: e.target.value })} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth type="time" label="Hasta" value={breakForm.end} onChange={(e)=> setBreakForm({ ...breakForm, end: e.target.value })} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2">Días de semana</Typography>
                <Box>
                  {[1,2,3,4,5,6,0].map(d => (
                    <FormControlLabel key={d} control={<Switch size="small" checked={breakForm.daysOfWeek.includes(d)} onChange={(e)=>{
                      const set = new Set(breakForm.daysOfWeek);
                      if (e.target.checked) set.add(d); else set.delete(d);
                      setBreakForm({...breakForm, daysOfWeek: Array.from(set)});
                    }} />} label={['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d]} />
                  ))}
                </Box>
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth type="date" label="Aplicar desde" value={breakForm.from} onChange={(e)=> setBreakForm({ ...breakForm, from: e.target.value })} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth type="date" label="Hasta" value={breakForm.until} onChange={(e)=> setBreakForm({ ...breakForm, until: e.target.value })} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12}>
                <Button variant="outlined" onClick={async ()=>{
                  try {
                    if (!scheduleEmployee) return;
                    const startDate = breakForm.from || new Date().toISOString().slice(0,10);
                    const endDate = breakForm.until || startDate;
                    await api.post(`/employees/${scheduleEmployee.id}/blocks/recurring`, {
                      startDate,
                      endDate,
                      startTimeOfDay: breakForm.start,
                      endTimeOfDay: breakForm.end,
                      daysOfWeek: breakForm.daysOfWeek,
                      reason: 'Descanso fijo',
                    });
                    // Feedback simple
                    alert('Descanso aplicado');
                  } catch (e) {
                    console.error('Error applying break', e);
                  }
                }}>Aplicar descanso</Button>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={()=> setScheduleDialogOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={async ()=>{
              try {
                if (!scheduleEmployee) return;
                const payload = scheduleForm.map(r => ({ dayOfWeek: r.day, start: r.start || null, end: r.end || null }));
                await api.put(`/employees/${scheduleEmployee.id}/schedule`, payload);
                setScheduleDialogOpen(false);
              } catch (e) {
                console.error('Error saving schedule', e);
              }
            }}>Guardar</Button>
          </DialogActions>
        </Dialog>

        {/* Commissions Dialog */}
        <Dialog 
          open={openCommissionDialog} 
          onClose={() => setOpenCommissionDialog(false)} 
          maxWidth="md" 
          fullWidth
        >
          <DialogTitle>
            Comisiones de {selectedEmployee?.name}
          </DialogTitle>
          <DialogContent>
            {commissions.length === 0 ? (
              <Alert severity="info">No hay comisiones registradas</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Período</TableCell>
                      <TableCell>Servicios</TableCell>
                      <TableCell>Ingresos</TableCell>
                      <TableCell>Comisión %</TableCell>
                      <TableCell>Comisión $</TableCell>
                      <TableCell>Salario Fijo</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {commissions.map((commission, index) => (
                      <TableRow key={index}>
                        <TableCell>{commission.period}</TableCell>
                        <TableCell>{commission.totalServices}</TableCell>
                        <TableCell>${commission.totalRevenue.toFixed(2)}</TableCell>
                        <TableCell>{commission.commissionPercentage}%</TableCell>
                        <TableCell>${commission.commissionAmount.toFixed(2)}</TableCell>
                        <TableCell>${commission.fixedSalary.toFixed(2)}</TableCell>
                        <TableCell>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            ${commission.totalEarnings.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {commission.isPaid ? (
                            <Chip label="Pagado" color="success" size="small" />
                          ) : (
                            <Button
                              variant="contained"
                              size="small"
                              color="warning"
                              onClick={() => handlePayCommission(commission.employeeId)}
                            >
                              Pagar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCommissionDialog(false)}>Cerrar</Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogContent>
            <Typography>
              ¿Está seguro que desea eliminar a {employeeToDelete?.name}?
              Esta acción no se puede deshacer.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={handleDeleteEmployee} color="error" variant="contained">
              Eliminar
            </Button>
          </DialogActions>
        </Dialog>
      </motion.div>
    </Container>
  );
};

export default Employees;

// Quick creator component for blocks (inputs + quick buttons)
const QuickBlockCreator: React.FC<{ employeeId: string; onCreated: () => void }> = ({ employeeId, onCreated }) => {
  const [start, setStart] = useState<string>(() => new Date().toISOString().slice(0,16));
  const [end, setEnd] = useState<string>(() => new Date(Date.now() + 60*60*1000).toISOString().slice(0,16));
  const [reason, setReason] = useState<string>('Bloqueo');
  const [saving, setSaving] = useState(false);
  const [forceOverride, setForceOverride] = useState(false);

  const create = async () => {
    if (!employeeId) return;
    setSaving(true);
    try {
      await api.post(`/employees/${employeeId}/blocks`, {
        startTime: new Date(start).toISOString(),
        endTime: new Date(end).toISOString(),
        reason,
        forceOverride,
      });
      await onCreated();
    } catch (e: any) {
      console.error('Error creating block', e);
      alert(e?.response?.data?.message || 'Error creando bloqueo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth type="datetime-local" label="Inicio" value={start} onChange={(e) => setStart(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth type="datetime-local" label="Fin" value={end} onChange={(e) => setEnd(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="Motivo (opcional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        </Grid>
        <Grid item xs={12}>
          <Button variant="contained" onClick={create} disabled={saving || !employeeId}>Bloquear</Button>
          <Button sx={{ ml: 1 }} onClick={() => {
            const now = new Date();
            const later = new Date(now.getTime() + 30*60*1000);
            setStart(now.toISOString().slice(0,16));
            setEnd(later.toISOString().slice(0,16));
          }}>+30 min</Button>
          <Button sx={{ ml: 1 }} onClick={() => {
            const now = new Date();
            const later = new Date(now.getTime() + 60*60*1000);
            setStart(now.toISOString().slice(0,16));
            setEnd(later.toISOString().slice(0,16));
          }}>+1 hora</Button>
          <FormControlLabel sx={{ ml: 2 }} control={<Switch checked={forceOverride} onChange={(e)=> setForceOverride(e.target.checked)} />} label="Forzar sobre reservas" />
        </Grid>
      </Grid>
    </Box>
  );
};
