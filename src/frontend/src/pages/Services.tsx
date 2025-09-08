import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  RadioGroup,
  Radio,
} from '@mui/material';
import {
  ArrowBack,
  Add,
  Edit,
  Delete,
  AttachMoney,
  Schedule,
  Category,
  Search,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTenant } from '../contexts/TenantContext';
import api from '../services/api';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  category?: { id: string; name: string } | null;
  isActive: boolean;
  createdAt: string;
  requiresDeposit?: boolean;
  depositPercentage?: number;
  depositFixedAmount?: number;
  depositPolicy?: string;
  depositAdvanceDays?: number;
}

const Services: React.FC = () => {
  const navigate = useNavigate();
  const { config } = useTenant();
  
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration: '',
    category: '',
    isActive: true,
    requiresDeposit: false,
    depositType: 'percentage',
    depositPercentage: '',
    depositFixedAmount: '',
    depositPolicy: 'AllCustomers',
    depositAdvanceDays: '',
  });
  const [errors, setErrors] = useState<any>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);

  // Categories are dynamically extracted from services below

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const response = await api.get('/services');
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description,
        price: service.price.toString(),
        duration: service.durationMinutes.toString(),
        category: service.category?.name || '',
        isActive: service.isActive,
        requiresDeposit: service.requiresDeposit || false,
        depositType: service.depositPercentage ? 'percentage' : 'fixed',
        depositPercentage: service.depositPercentage?.toString() || '',
        depositFixedAmount: service.depositFixedAmount?.toString() || '',
        depositPolicy: service.depositPolicy || 'AllCustomers',
        depositAdvanceDays: service.depositAdvanceDays?.toString() || '',
      });
    } else {
      setEditingService(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        duration: '',
        category: '',
        isActive: true,
        requiresDeposit: false,
        depositType: 'percentage',
        depositPercentage: '',
        depositFixedAmount: '',
        depositPolicy: 'AllCustomers',
        depositAdvanceDays: '',
      });
    }
    setErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingService(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      duration: '',
      category: '',
      isActive: true,
      requiresDeposit: false,
      depositType: 'percentage',
      depositPercentage: '',
      depositFixedAmount: '',
      depositPolicy: 'AllCustomers',
      depositAdvanceDays: '',
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: any = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es requerida';
    }
    
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'El precio debe ser mayor a 0';
    }
    
    if (!formData.duration || parseInt(formData.duration) <= 0) {
      newErrors.duration = 'La duración debe ser mayor a 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveService = async () => {
    if (!validateForm()) return;

    try {
      const serviceData: any = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        durationMinutes: parseInt(formData.duration),
        isActive: formData.isActive,
        // Deposit/Seña configuration
        requiresDeposit: formData.requiresDeposit,
        depositPercentage: formData.requiresDeposit && formData.depositType === 'percentage' && formData.depositPercentage !== ''
          ? parseFloat(formData.depositPercentage as any)
          : null,
        depositFixedAmount: formData.requiresDeposit && formData.depositType === 'fixed' && formData.depositFixedAmount !== ''
          ? parseFloat(formData.depositFixedAmount as any)
          : null,
        depositPolicy: formData.requiresDeposit ? formData.depositPolicy : 'AllCustomers',
        depositAdvanceDays: formData.requiresDeposit && formData.depositPolicy === 'AdvanceBookingOnly' && formData.depositAdvanceDays !== ''
          ? parseInt(formData.depositAdvanceDays as any)
          : null,
      };

      if (editingService) {
        await api.put(`/services/${editingService.id}`, serviceData);
      } else {
        await api.post('/services', serviceData);
      }
      fetchServices();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving service:', error);
      setErrors({ submit: 'Error al guardar el servicio' });
    }
  };

  const handleDeleteService = async () => {
    if (!serviceToDelete) return;

    try {
      await api.delete(`/services/${serviceToDelete.id}`);
      fetchServices();
      setDeleteConfirmOpen(false);
      setServiceToDelete(null);
    } catch (error) {
      console.error('Error deleting service:', error);
    }
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          service.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || service.category?.name === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const uniqueCategories = Array.from(new Set(services.map(s => s.category?.name).filter(Boolean)));

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
              Gestionar Servicios
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Nuevo Servicio
          </Button>
        </Box>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
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
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Categoría</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  label="Categoría"
                >
                  <MenuItem value="all">Todas las categorías</MenuItem>
                  {uniqueCategories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={3}>
          {loading ? (
            <Grid item xs={12}>
              <Typography align="center">Cargando servicios...</Typography>
            </Grid>
          ) : filteredServices.length === 0 ? (
            <Grid item xs={12}>
              <Paper sx={{ p: 4 }}>
                <Typography align="center" color="text.secondary">
                  No se encontraron servicios
                </Typography>
              </Paper>
            </Grid>
          ) : (
            filteredServices.map((service) => (
              <Grid item xs={12} sm={6} md={4} key={service.id}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      opacity: service.isActive ? 1 : 0.6,
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" component="h2" gutterBottom sx={{ mb: 0 }}>
                          {service.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          {typeof service.requiresDeposit !== 'undefined' && (
                            <Chip
                              size="small"
                              color={service.requiresDeposit ? 'warning' : 'default'}
                              variant={service.requiresDeposit ? 'filled' : 'outlined'}
                              label={service.requiresDeposit
                                ? (service.depositFixedAmount
                                  ? `Seña $${service.depositFixedAmount}`
                                  : (service.depositPercentage
                                    ? `Seña ${service.depositPercentage}%`
                                    : 'Requiere seña'))
                                : 'Sin seña'}
                            />
                          )}
                          {!service.isActive && (
                            <Chip label="Inactivo" size="small" color="default" />
                          )}
                        </Box>
                      </Box>
                      
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        paragraph
                        sx={{ minHeight: 48 }}
                      >
                        {service.description}
                      </Typography>

                      {service.category && (
                        <Chip
                          icon={<Category />}
                          label={service.category.name}
                          size="small"
                          sx={{ mb: 2 }}
                        />
                      )}

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 'auto' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <AttachMoney sx={{ fontSize: 20, mr: 0.5 }} />
                          <Typography variant="h6" color="primary">
                            {service.price}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Schedule sx={{ fontSize: 20, mr: 0.5 }} />
                          <Typography variant="body2" color="text.secondary">
                            {service.durationMinutes} min
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                    <CardActions>
                      <Button
                        size="small"
                        startIcon={<Edit />}
                        onClick={() => handleOpenDialog(service)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<Delete />}
                        onClick={() => {
                          setServiceToDelete(service);
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        Eliminar
                      </Button>
                    </CardActions>
                  </Card>
                </motion.div>
              </Grid>
            ))
          )}
        </Grid>

        {/* Dialog para crear/editar servicio */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingService ? 'Editar' : 'Nuevo'} Servicio
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nombre del servicio"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  error={!!errors.name}
                  helperText={errors.name}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Descripción"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  error={!!errors.description}
                  helperText={errors.description}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Precio"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  error={!!errors.price}
                  helperText={errors.price}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Duración"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  error={!!errors.duration}
                  helperText={errors.duration}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">minutos</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Categoría</InputLabel>
                  <Select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    label="Categoría"
                  >
                    <MenuItem value="">Sin categoría</MenuItem>
                    {uniqueCategories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                  }
                  label="Servicio activo"
                />
              </Grid>

              {/* Deposit Configuration Section */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  Configuración de Seña
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.requiresDeposit}
                      onChange={(e) => setFormData({ ...formData, requiresDeposit: e.target.checked })}
                    />
                  }
                  label="Requiere seña para reservar"
                />
              </Grid>

              {formData.requiresDeposit && (
                <>
                  <Grid item xs={12}>
                    <FormControl component="fieldset">
                      <Typography variant="body2" sx={{ mb: 1 }}>Tipo de seña:</Typography>
                      <RadioGroup
                        row
                        value={formData.depositType}
                        onChange={(e) => setFormData({ ...formData, depositType: e.target.value })}
                      >
                        <FormControlLabel value="percentage" control={<Radio />} label="Porcentaje" />
                        <FormControlLabel value="fixed" control={<Radio />} label="Monto fijo" />
                      </RadioGroup>
                    </FormControl>
                  </Grid>

                  {formData.depositType === 'percentage' ? (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Porcentaje de seña"
                        type="number"
                        value={formData.depositPercentage}
                        onChange={(e) => setFormData({ ...formData, depositPercentage: e.target.value })}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">%</InputAdornment>,
                        }}
                        helperText="Porcentaje del precio total del servicio"
                      />
                    </Grid>
                  ) : (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Monto fijo de seña"
                        type="number"
                        value={formData.depositFixedAmount}
                        onChange={(e) => setFormData({ ...formData, depositFixedAmount: e.target.value })}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        }}
                        helperText="Monto fijo a cobrar como seña"
                      />
                    </Grid>
                  )}

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Política de seña</InputLabel>
                      <Select
                        value={formData.depositPolicy}
                        onChange={(e) => setFormData({ ...formData, depositPolicy: e.target.value })}
                        label="Política de seña"
                      >
                        <MenuItem value="AllCustomers">Todos los clientes</MenuItem>
                        <MenuItem value="NewCustomersOnly">Solo clientes nuevos</MenuItem>
                        <MenuItem value="AdvanceBookingOnly">Por anticipación</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {formData.depositPolicy === 'AdvanceBookingOnly' && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Días de anticipación"
                        type="number"
                        value={formData.depositAdvanceDays}
                        onChange={(e) => setFormData({ ...formData, depositAdvanceDays: e.target.value })}
                        helperText="Días de anticipación para requerir seña"
                      />
                    </Grid>
                  )}
                </>
              )}
            </Grid>
            {errors.submit && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {errors.submit}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button onClick={handleSaveService} variant="contained">
              {editingService ? 'Guardar' : 'Crear'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog de confirmación para eliminar */}
        <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogContent>
            <Typography>
              ¿Está seguro que desea eliminar el servicio "{serviceToDelete?.name}"?
              Esta acción no se puede deshacer.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={handleDeleteService} color="error" variant="contained">
              Eliminar
            </Button>
          </DialogActions>
        </Dialog>
      </motion.div>
    </Container>
  );
};

export default Services;
