import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Paper,
  Chip,
} from '@mui/material';
import {
  CalendarToday,
  People,
  AttachMoney,
  TrendingUp,
  Star,
  CheckCircle,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <CalendarToday sx={{ fontSize: 48, color: 'primary.main' }} />,
      title: 'Gestión de Turnos',
      description: 'Agenda intuitiva para gestionar citas de manera eficiente'
    },
    {
      icon: <People sx={{ fontSize: 48, color: 'primary.main' }} />,
      title: 'Base de Clientes',
      description: 'Mantén un registro completo de todos tus clientes'
    },
    {
      icon: <AttachMoney sx={{ fontSize: 48, color: 'primary.main' }} />,
      title: 'Control de Pagos',
      description: 'Gestiona pagos, comisiones y reportes financieros'
    },
    {
      icon: <TrendingUp sx={{ fontSize: 48, color: 'primary.main' }} />,
      title: 'Reportes',
      description: 'Analiza el rendimiento de tu negocio con reportes detallados'
    }
  ];

  const handleGetStarted = () => {
    navigate('/register');
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 50%, #2c3e50 100%)',
    }}>
      {/* Hero Section */}
      <Container maxWidth="lg">
        <Box sx={{ pt: 8, pb: 6, textAlign: 'center' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Typography 
              variant="h2" 
              component="h1" 
              sx={{ 
                color: 'white', 
                fontWeight: 'bold', 
                mb: 2,
                fontSize: { xs: '2.5rem', md: '3.5rem' }
              }}
            >
              Turnos Pro
            </Typography>
            <Typography 
              variant="h5" 
              sx={{ 
                color: 'rgba(255,255,255,0.9)', 
                mb: 4, 
                maxWidth: 600, 
                mx: 'auto' 
              }}
            >
              La plataforma completa para gestionar tu negocio de servicios
            </Typography>
            
            <Box sx={{ mb: 4 }}>
              <Chip 
                label="✨ 7 días gratis" 
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  color: 'white', 
                  fontSize: '1.1rem',
                  py: 2,
                  px: 1
                }} 
              />
            </Box>

            <Button
              variant="contained"
              size="large"
              onClick={handleGetStarted}
              sx={{
                bgcolor: '#ffffff',
                color: '#2c3e50',
                py: 2,
                px: 4,
                fontSize: '1.2rem',
                fontWeight: 'bold',
                '&:hover': {
                  bgcolor: '#f8f9fa',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
                },
                borderRadius: 3,
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                transition: 'all 0.3s ease'
              }}
            >
              Comenzar Gratis
            </Button>
          </motion.div>
        </Box>

        {/* Video Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <Paper 
            elevation={8} 
            sx={{ 
              p: 2, 
              borderRadius: 3, 
              mb: 8,
              background: 'rgba(255,255,255,0.98)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
          >
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: 0,
                paddingBottom: '56.25%', // 16:9 aspect ratio
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: 'grey.900'
              }}
            >
              <iframe
                src="https://www.loom.com/embed/YOUR_LOOM_VIDEO_ID"
                frameBorder="0"
                allowFullScreen
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%'
                }}
              />
              {/* Placeholder for video */}
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: 'white',
                  textAlign: 'center'
                }}
              >
                <Typography variant="h6" sx={{ mb: 1 }}>
                  📹 Video Demostración
                </Typography>
                <Typography variant="body2">
                  Reemplazar con URL real del video de Loom
                </Typography>
              </Box>
            </Box>
          </Paper>
        </motion.div>

        {/* Features Section */}
        <Box sx={{ mb: 8 }}>
          <Typography 
            variant="h3" 
            sx={{ 
              color: 'white', 
              textAlign: 'center', 
              mb: 6,
              fontWeight: 'bold'
            }}
          >
            Todo lo que necesitas
          </Typography>
          
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card 
                    sx={{ 
                      height: '100%',
                      textAlign: 'center',
                      p: 3,
                      background: 'rgba(255,255,255,0.98)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        transition: 'all 0.3s ease-in-out',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
                        background: 'rgba(255,255,255,1)',
                      }
                    }}
                  >
                    <CardContent>
                      <Box sx={{ mb: 2 }}>
                        {feature.icon}
                      </Box>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Benefits Section */}
        <Box sx={{ mb: 8 }}>
          <Paper 
            sx={{ 
              p: 6, 
              borderRadius: 3,
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Typography 
              variant="h4" 
              sx={{ 
                textAlign: 'center', 
                mb: 4,
                color: 'primary.main',
                fontWeight: 'bold'
              }}
            >
              ¿Por qué elegir Turnos Pro?
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CheckCircle sx={{ color: 'success.main', mr: 2 }} />
                  <Typography variant="body1">
                    <strong>Fácil de usar:</strong> Interfaz intuitiva sin complicaciones
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CheckCircle sx={{ color: 'success.main', mr: 2 }} />
                  <Typography variant="body1">
                    <strong>Multi-negocio:</strong> Peluquerías, barberías y más
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CheckCircle sx={{ color: 'success.main', mr: 2 }} />
                  <Typography variant="body1">
                    <strong>Gestión completa:</strong> Clientes, servicios, empleados
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CheckCircle sx={{ color: 'success.main', mr: 2 }} />
                  <Typography variant="body1">
                    <strong>Pagos integrados:</strong> MercadoPago y métodos tradicionales
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CheckCircle sx={{ color: 'success.main', mr: 2 }} />
                  <Typography variant="body1">
                    <strong>Reportes detallados:</strong> Analiza el crecimiento de tu negocio
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CheckCircle sx={{ color: 'success.main', mr: 2 }} />
                  <Typography variant="body1">
                    <strong>Soporte 24/7:</strong> Estamos aquí para ayudarte
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Box>

        {/* CTA Section */}
        <Box sx={{ textAlign: 'center', pb: 8 }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <Typography 
              variant="h4" 
              sx={{ 
                color: 'white', 
                mb: 3,
                fontWeight: 'bold'
              }}
            >
              ¿Listo para transformar tu negocio?
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'rgba(255,255,255,0.8)', 
                mb: 4
              }}
            >
              Comienza tu prueba gratuita de 7 días hoy mismo
            </Typography>
            
            <Button
              variant="contained"
              size="large"
              onClick={handleGetStarted}
              sx={{
                bgcolor: '#ffffff',
                color: '#2c3e50',
                py: 2.5,
                px: 5,
                fontSize: '1.3rem',
                fontWeight: 'bold',
                borderRadius: 3,
                boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                '&:hover': {
                  bgcolor: '#f8f9fa',
                  transform: 'translateY(-3px)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                },
                transition: 'all 0.3s ease'
              }}
            >
              <Star sx={{ mr: 1 }} />
              Crear Mi Cuenta Gratis
            </Button>
          </motion.div>
        </Box>
      </Container>
    </Box>
  );
};

export default LandingPage;