import React, { useState } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, AdminPanelSettings } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { superAdminApi } from '../services/api';

const SuperAdminLogin: React.FC = () => {
  const [formData, setFormData] = useState({
    email: 'admin@turnospro.com',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await superAdminApi.login(formData.email, formData.password);
      
      if (response.success) {
        // Guardar token de super admin
        localStorage.setItem('superAdminToken', response.token);
        localStorage.setItem('superAdminUser', JSON.stringify(response.user));
        
        // Redirigir al dashboard de super admin
        navigate('/super-admin/dashboard');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #000000 0%, #1A1A1A 50%, #000000 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card 
            sx={{ 
              backgroundColor: '#1A1A1A',
              border: '1px solid #FFFF00',
              boxShadow: '0 8px 32px rgba(255, 255, 0, 0.1)',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              {/* Header */}
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    p: 2,
                    borderRadius: 3,
                    backgroundColor: 'rgba(255, 255, 0, 0.1)',
                    mb: 2,
                  }}
                >
                  <AdminPanelSettings sx={{ fontSize: 40, color: '#FFFF00' }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#FFFF00', mb: 1 }}>
                  Super Admin
                </Typography>
                <Typography variant="body1" sx={{ color: '#CCCCCC' }}>
                  Panel de administración de Turnos Pro
                </Typography>
              </Box>

              {/* Error Alert */}
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  sx={{ mb: 3 }}
                  disabled={loading}
                />

                <TextField
                  fullWidth
                  label="Contraseña"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  sx={{ mb: 4 }}
                  disabled={loading}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    mb: 3,
                  }}
                >
                  {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </Button>
              </form>

              {/* Help Text */}
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#888888' }}>
                  Credenciales por defecto: admin@turnos-pro.com / TurnosPro2024!
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </motion.div>
      </Container>
    </Box>
  );
};

export default SuperAdminLogin;