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
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTenant } from '../contexts/TenantContext';
import api from '../services/api';
import { format } from 'date-fns';

interface Employee {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  employeeType: string;
  commissionPercentage: number;
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
      if (formData.commissionPercentage < 0 || formData.commissionPercentage > 100) {
        newErrors.commissionPercentage = 'La comisión debe estar entre 0 y 100';
      }
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
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Porcentaje de Comisión"
                    type="number"
                    value={formData.commissionPercentage}
                    onChange={(e) => setFormData({ ...formData, commissionPercentage: parseFloat(e.target.value) || 0 })}
                    error={!!errors.commissionPercentage}
                    helperText={errors.commissionPercentage}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                  />
                </Grid>
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