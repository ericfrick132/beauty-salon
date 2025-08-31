import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Paper,
  CircularProgress,
  InputAdornment,
  IconButton,
  Avatar,
  Grid
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ContentCut,
  Face,
  Spa,
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  EventAvailable,
  Stars,
  Groups,
  WorkspacePremium,
  Healing,
  LocalOffer
} from '@mui/icons-material';

import { useTenant } from '../contexts/TenantContext';
import { authApi } from '../services/api';

// Styled components con tema adaptativo
const LoginContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(2),
  position: 'relative',
  overflow: 'hidden',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1),
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.03,
    animation: 'float 20s ease-in-out infinite',
  },
  '@keyframes float': {
    '0%, 100%': {
      transform: 'translateY(0px)',
    },
    '50%': {
      transform: 'translateY(-20px)',
    },
  },
}));

const LoginCard = styled(Card)(({ theme }) => ({
  maxWidth: 480,
  width: '100%',
  backdropFilter: 'blur(20px)',
  borderRadius: '32px',
  overflow: 'hidden',
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  zIndex: 1,
  [theme.breakpoints.down('sm')]: {
    borderRadius: '24px',
  },
  '&:hover': {
    transform: 'translateY(-8px) scale(1.02)',
    [theme.breakpoints.down('sm')]: {
      transform: 'translateY(-4px) scale(1.01)',
    },
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    backgroundSize: '400% 400%',
    animation: 'gradientShift 8s ease infinite',
  },
  '@keyframes gradientShift': {
    '0%': {
      backgroundPosition: '0% 50%',
    },
    '50%': {
      backgroundPosition: '100% 50%',
    },
    '100%': {
      backgroundPosition: '0% 50%',
    },
  },
}));

const LogoSection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(5, 4),
  textAlign: 'center',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    animation: 'shine 3s ease-in-out infinite',
  },
  '@keyframes shine': {
    '0%': {
      transform: 'translateX(-100%)',
    },
    '100%': {
      transform: 'translateX(100%)',
    },
  },
}));

const FormSection = styled(CardContent)(({ theme }) => ({
  padding: theme.spacing(4, 4, 5),
}));

const FeatureCard = styled(Paper)(({ theme }) => ({
  backdropFilter: 'blur(10px)',
  borderRadius: '20px',
  padding: theme.spacing(3),
  textAlign: 'center',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-5px)',
  },
}));

const FloatingElement = styled(Box)(({ theme }) => ({
  position: 'absolute',
  borderRadius: '50%',
  animation: 'float 6s ease-in-out infinite',
  '&.element-1': {
    width: 80,
    height: 80,
    top: '10%',
    left: '10%',
    animationDelay: '0s',
  },
  '&.element-2': {
    width: 60,
    height: 60,
    top: '20%',
    right: '15%',
    animationDelay: '2s',
  },
  '&.element-3': {
    width: 100,
    height: 100,
    bottom: '15%',
    left: '5%',
    animationDelay: '4s',
  },
  '&.element-4': {
    width: 40,
    height: 40,
    bottom: '30%',
    right: '10%',
    animationDelay: '1s',
  },
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  '& .MuiOutlinedInput-root': {
    borderRadius: '16px',
    fontSize: '1.1rem',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '& fieldset': {
      borderWidth: 2,
    },
    '&:hover': {
      transform: 'translateY(-2px)',
    },
    '&.Mui-focused': {
      transform: 'translateY(-2px)',
    },
  },
  '& .MuiInputLabel-root': {
    fontWeight: 500,
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: '16px',
  padding: theme.spacing(2, 4),
  fontSize: '1.1rem',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1.5, 3),
    fontSize: '1rem',
    borderRadius: '12px',
  },
  fontWeight: 600,
  textTransform: 'none',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  marginBottom: theme.spacing(2),
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
    transition: 'left 0.5s',
  },
  '&:hover': {
    transform: 'translateY(-3px)',
    filter: 'brightness(1.1)',
    '&::before': {
      left: '100%',
    },
  },
  '&:disabled': {
    transform: 'none',
    boxShadow: 'none',
  },
}));

const Login: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { config } = useTenant();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Determinar colores y estilos según el vertical
  const getThemeStyles = () => {
    const vertical = config?.vertical || 'beautysalon';
    const primaryColor = config?.theme?.primaryColor || '#e91e63';
    const secondaryColor = config?.theme?.secondaryColor || '#ffffff';
    const accentColor = config?.theme?.accentColor || '#ffc107';
    
    switch(vertical) {
      case 'barbershop':
        return {
          primaryColor: primaryColor || '#8B4513',
          accentColor: accentColor || '#DAA520',
          backgroundGradient: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #0f0f0f 100%)',
          cardBackground: 'rgba(20, 20, 20, 0.95)',
          borderColor: 'rgba(218, 165, 32, 0.3)',
          icon: <ContentCut />,
          features: [
            { icon: <ContentCut />, title: 'Cortes Premium', description: 'Técnicas modernas y clásicas' },
            { icon: <EventAvailable />, title: 'Reserva Online', description: 'Agenda tu cita 24/7' },
            { icon: <Groups />, title: 'Barberos Expertos', description: 'Profesionales certificados' },
            { icon: <WorkspacePremium />, title: 'Experiencia VIP', description: 'Atención personalizada' }
          ]
        };
      case 'aesthetics':
        return {
          primaryColor: primaryColor || '#26a69a',
          accentColor: accentColor || '#80cbc4',
          backgroundGradient: 'linear-gradient(135deg, #f5f5f5 0%, #e0f2f1 50%, #b2dfdb 100%)',
          cardBackground: 'rgba(255, 255, 255, 0.95)',
          borderColor: 'rgba(38, 166, 154, 0.3)',
          icon: <Healing />,
          features: [
            { icon: <Healing />, title: 'Tratamientos Avanzados', description: 'Tecnología de última generación' },
            { icon: <EventAvailable />, title: 'Consultas Online', description: 'Agenda y seguimiento digital' },
            { icon: <Spa />, title: 'Profesionales Médicos', description: 'Especialistas certificados' },
            { icon: <Stars />, title: 'Resultados Garantizados', description: 'Tratamientos personalizados' }
          ]
        };
      default: // beautysalon
        return {
          primaryColor: primaryColor || '#e91e63',
          accentColor: accentColor || '#f8bbd0',
          backgroundGradient: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 50%, #f48fb1 100%)',
          cardBackground: 'rgba(255, 255, 255, 0.95)',
          borderColor: 'rgba(233, 30, 99, 0.3)',
          icon: <Face />,
          features: [
            { icon: <Face />, title: 'Belleza Integral', description: 'Servicios de cabello y maquillaje' },
            { icon: <EventAvailable />, title: 'Citas Flexibles', description: 'Horarios que se adaptan a ti' },
            { icon: <Spa />, title: 'Estilistas Profesionales', description: 'Expertos en tendencias' },
            { icon: <LocalOffer />, title: 'Ofertas Exclusivas', description: 'Programa de fidelidad' }
          ]
        };
    }
  };

  const themeStyles = getThemeStyles();
  const isDarkTheme = config?.vertical === 'barbershop';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authApi.login(formData.email, formData.password);
      
      // Guardar token
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Redirigir al dashboard
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginContainer 
      maxWidth={false} 
      sx={{ background: themeStyles.backgroundGradient }}
    >
      {/* Elementos flotantes decorativos */}
      <FloatingElement 
        className="element-1" 
        sx={{ background: `linear-gradient(135deg, ${themeStyles.primaryColor}20, ${themeStyles.accentColor}10)` }}
      />
      <FloatingElement 
        className="element-2"
        sx={{ background: `linear-gradient(135deg, ${themeStyles.accentColor}20, ${themeStyles.primaryColor}10)` }}
      />
      <FloatingElement 
        className="element-3"
        sx={{ background: `linear-gradient(135deg, ${themeStyles.primaryColor}15, ${themeStyles.accentColor}15)` }}
      />
      <FloatingElement 
        className="element-4"
        sx={{ background: `linear-gradient(135deg, ${themeStyles.accentColor}25, ${themeStyles.primaryColor}05)` }}
      />

      <Grid container spacing={{ xs: 2, sm: 3, md: 4 }} alignItems="center" sx={{ width: '100%', maxWidth: 1400 }}>
        {/* Panel izquierdo con características */}
        <Grid item xs={12} lg={7} sx={{ display: { xs: 'none', lg: 'block' } }}>
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, duration: 0.6, type: 'spring', stiffness: 200 }}
              >
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    margin: '0 auto 24px',
                    background: `linear-gradient(135deg, ${themeStyles.primaryColor}30, ${themeStyles.accentColor}20)`,
                    backdropFilter: 'blur(10px)',
                    border: `2px solid ${themeStyles.primaryColor}50`,
                  }}
                >
                  {React.cloneElement(themeStyles.icon, { 
                    sx: { fontSize: 40, color: themeStyles.primaryColor } 
                  })}
                </Avatar>
              </motion.div>
              
              <Typography 
                variant="h2" 
                component="h1" 
                fontWeight="bold" 
                sx={{ 
                  color: isDarkTheme ? '#fff' : themeStyles.primaryColor, 
                  mb: 2,
                  textShadow: isDarkTheme ? '0 4px 8px rgba(0, 0, 0, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  fontFamily: config?.theme?.fontFamily || 'inherit',
                }}
              >
                {config?.businessName || 'Turnos Pro'}
              </Typography>
              
              <Typography 
                variant="h5" 
                sx={{ 
                  color: isDarkTheme ? 'rgba(255, 255, 255, 0.9)' : themeStyles.primaryColor + '99', 
                  mb: 4,
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  fontWeight: 300
                }}
              >
                Sistema de Gestión de Reservas
              </Typography>
            </Box>

            {/* Tarjetas de características */}
            <Grid container spacing={3}>
              {themeStyles.features.map((feature, index) => (
                <Grid item md={6} key={index}>
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
                  >
                    <FeatureCard
                      sx={{
                        background: isDarkTheme ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                        border: `1px solid ${themeStyles.borderColor}`,
                        '&:hover': {
                          boxShadow: `0 20px 40px ${themeStyles.primaryColor}20`,
                          background: isDarkTheme ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                          border: `1px solid ${themeStyles.primaryColor}40`,
                        },
                      }}
                    >
                      {React.cloneElement(feature.icon, { 
                        sx: { fontSize: 40, color: themeStyles.primaryColor, mb: 2 } 
                      })}
                      <Typography 
                        variant="h6" 
                        fontWeight="bold" 
                        gutterBottom 
                        sx={{ color: isDarkTheme ? '#ffffff' : themeStyles.primaryColor }}
                      >
                        {feature.title}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary' }}
                      >
                        {feature.description}
                      </Typography>
                    </FeatureCard>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </Grid>

        {/* Panel derecho con formulario de login */}
        <Grid item xs={12} lg={5}>
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          >
            <LoginCard
              sx={{
                background: themeStyles.cardBackground,
                border: `1px solid ${themeStyles.borderColor}`,
                boxShadow: `0 32px 64px ${isDarkTheme ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.1)'}, 0 0 0 1px ${themeStyles.borderColor}`,
                '&::before': {
                  background: `linear-gradient(90deg, ${themeStyles.primaryColor}, ${themeStyles.accentColor}, ${themeStyles.primaryColor})`,
                },
                '&:hover': {
                  boxShadow: `0 40px 80px ${themeStyles.primaryColor}20, 0 0 0 1px ${themeStyles.primaryColor}40`,
                },
              }}
            >
              <LogoSection
                sx={{
                  background: `linear-gradient(135deg, ${themeStyles.primaryColor}10 0%, ${themeStyles.accentColor}10 100%)`,
                  '&::before': {
                    background: `linear-gradient(45deg, transparent 30%, ${themeStyles.primaryColor}10 50%, transparent 70%)`,
                  },
                }}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.4, duration: 0.6, type: 'spring', stiffness: 200 }}
                >
                  {React.cloneElement(themeStyles.icon, { 
                    sx: { fontSize: { xs: 36, sm: 48 }, mb: 2, color: themeStyles.primaryColor }
                  })}
                </motion.div>
                <Typography 
                  variant="h4" 
                  component="h2" 
                  fontWeight="bold" 
                  sx={{ 
                    color: isDarkTheme ? '#ffffff' : themeStyles.primaryColor, 
                    mb: 1,
                    fontSize: { xs: '1.75rem', sm: '2.125rem' },
                    fontFamily: config?.theme?.fontFamily || 'inherit',
                  }}
                >
                  ¡Bienvenido!
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: isDarkTheme ? 'rgba(255, 255, 255, 0.8)' : 'text.secondary', 
                    fontWeight: 300 
                  }}
                >
                  Accede a tu cuenta para continuar
                </Typography>
              </LogoSection>

              <FormSection>
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, x: -20, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 20, scale: 0.9 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Alert 
                        severity="error" 
                        sx={{ 
                          mb: 3, 
                          borderRadius: '16px',
                          backgroundColor: 'rgba(211, 47, 47, 0.1)',
                          border: '1px solid rgba(211, 47, 47, 0.2)',
                        }}
                      >
                        {error}
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit}>
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                  >
                    <StyledTextField
                      fullWidth
                      name="email"
                      type="email"
                      label="Correo electrónico"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="ejemplo@correo.com"
                      required
                      disabled={loading}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Email sx={{ color: themeStyles.primaryColor }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: isDarkTheme ? 'rgba(40, 40, 40, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                          backdropFilter: 'blur(10px)',
                          color: isDarkTheme ? '#ffffff' : 'inherit',
                          '& fieldset': {
                            borderColor: themeStyles.borderColor,
                          },
                          '&:hover': {
                            backgroundColor: isDarkTheme ? 'rgba(50, 50, 50, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                            boxShadow: `0 8px 25px ${themeStyles.primaryColor}20`,
                            '& fieldset': {
                              borderColor: `${themeStyles.primaryColor}50`,
                            },
                          },
                          '&.Mui-focused': {
                            backgroundColor: isDarkTheme ? 'rgba(50, 50, 50, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                            boxShadow: `0 12px 35px ${themeStyles.primaryColor}30`,
                            '& fieldset': {
                              borderColor: themeStyles.primaryColor,
                              boxShadow: `0 0 0 4px ${themeStyles.primaryColor}10`,
                            },
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                          '&.Mui-focused': {
                            color: themeStyles.primaryColor,
                          },
                        },
                      }}
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                  >
                    <StyledTextField
                      fullWidth
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      label="Contraseña"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Ingresa tu contraseña"
                      required
                      disabled={loading}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock sx={{ color: themeStyles.primaryColor }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                              sx={{ color: themeStyles.primaryColor }}
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: isDarkTheme ? 'rgba(40, 40, 40, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                          backdropFilter: 'blur(10px)',
                          color: isDarkTheme ? '#ffffff' : 'inherit',
                          '& fieldset': {
                            borderColor: themeStyles.borderColor,
                          },
                          '&:hover': {
                            backgroundColor: isDarkTheme ? 'rgba(50, 50, 50, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                            boxShadow: `0 8px 25px ${themeStyles.primaryColor}20`,
                            '& fieldset': {
                              borderColor: `${themeStyles.primaryColor}50`,
                            },
                          },
                          '&.Mui-focused': {
                            backgroundColor: isDarkTheme ? 'rgba(50, 50, 50, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                            boxShadow: `0 12px 35px ${themeStyles.primaryColor}30`,
                            '& fieldset': {
                              borderColor: themeStyles.primaryColor,
                              boxShadow: `0 0 0 4px ${themeStyles.primaryColor}10`,
                            },
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                          '&.Mui-focused': {
                            color: themeStyles.primaryColor,
                          },
                        },
                      }}
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                  >
                    <StyledButton
                      type="submit"
                      fullWidth
                      size="large"
                      disabled={loading || !formData.email.trim() || !formData.password.trim()}
                      sx={{
                        background: `linear-gradient(135deg, ${themeStyles.primaryColor} 0%, ${themeStyles.accentColor} 100%)`,
                        color: '#ffffff',
                        boxShadow: `0 12px 35px ${themeStyles.primaryColor}50`,
                        '&:hover': {
                          boxShadow: `0 12px 35px ${themeStyles.primaryColor}50`,
                          background: `linear-gradient(135deg, ${themeStyles.accentColor} 0%, ${themeStyles.primaryColor} 100%)`,
                        },
                        '&:disabled': {
                          background: 'rgba(60, 60, 60, 0.5)',
                          color: 'rgba(255, 255, 255, 0.3)',
                        },
                      }}
                    >
                      {loading ? (
                        <>
                          <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                          Iniciando sesión...
                        </>
                      ) : (
                        'Iniciar Sesión'
                      )}
                    </StyledButton>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                  >
                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: isDarkTheme ? 'rgba(255, 255, 255, 0.5)' : 'text.secondary',
                          cursor: 'pointer',
                          '&:hover': {
                            color: themeStyles.primaryColor,
                            textDecoration: 'underline',
                          }
                        }}
                      >
                        ¿Olvidaste tu contraseña?
                      </Typography>
                    </Box>
                  </motion.div>
                </form>
              </FormSection>
            </LoginCard>

            {/* Información del tenant */}
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: isDarkTheme ? 'rgba(255, 255, 255, 0.5)' : 'text.secondary'
                }}
              >
                {config?.vertical === 'barbershop' && 'Barbería Profesional'} 
                {config?.vertical === 'beautysalon' && 'Salón de Belleza'} 
                {config?.vertical === 'aesthetics' && 'Centro de Estética'} 
                {' | Powered by Turnos Pro'}
              </Typography>
            </Box>
          </motion.div>
        </Grid>
      </Grid>
    </LoginContainer>
  );
};

export default Login;