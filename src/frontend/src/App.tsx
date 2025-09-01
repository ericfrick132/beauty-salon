import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { store } from './store';
import { TenantProvider } from './contexts/TenantContext';
import { createTurnosProTheme } from './theme/theme';
import { TenantConfig, ThemeConfiguration } from './types';
import { tenantApi } from './services/api';
import api from './services/api';
import LoadingScreen from './components/common/LoadingScreen';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import SuperAdminLogin from './pages/SuperAdminLogin';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import NewBooking from './pages/NewBooking';
import Calendar from './pages/Calendar';
import Customers from './pages/Customers';
import NewCustomer from './pages/NewCustomer';
import Services from './pages/Services';
import Reports from './pages/Reports';
import BookingPage from './pages/public/BookingPage';
import InvitationPage from './pages/public/InvitationPage';
import LandingPage from './pages/LandingPage';
import SelfRegistration from './pages/SelfRegistration';
import Payments from './pages/Payments';
import Employees from './pages/Employees';
import FinancialReports from './pages/FinancialReports';
import Payroll from './pages/Payroll';
import ThemeSettings from './pages/ThemeSettings';
import MercadoPagoSettings from './pages/MercadoPagoSettings';
import SubscriptionPlans from './pages/SubscriptionPlans';
import SubscriptionManagement from './pages/SubscriptionManagement';
import PlatformSubscriptionStatus from './pages/PlatformSubscriptionStatus';
import TenantsManagement from './pages/TenantsManagement';
import { AdminLayout } from './components/layouts/AdminLayout';
import SubscriptionVerification from './components/SubscriptionVerification';

function App() {
  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTenantConfiguration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isMainDomain = () => {
    const hostname = window.location.hostname;
    return hostname === 'turnos-pro.com' || hostname === 'localhost' || hostname === '127.0.0.1';
  };

  const loadTenantConfiguration = async () => {
    try {
      // Verificar si es una ruta de super admin
      if (window.location.pathname.startsWith('/super-admin')) {
        setLoading(false);
        return;
      }

      // Check if we're on the main domain (for landing page)
      if (isMainDomain() && (window.location.pathname === '/' || window.location.pathname === '/register')) {
        // We're on the main domain, no tenant config needed
        setLoading(false);
        return;
      }

      const config = await tenantApi.getConfig();
      
      // Only try to load theme configuration if user is authenticated
      const authToken = localStorage.getItem('authToken');
      if (authToken && !window.location.pathname.startsWith('/login')) {
        try {
          const themeResponse = await api.get('/ThemeConfiguration');
          if (themeResponse.data?.data) {
            config.theme = themeResponse.data.data;
          }
        } catch (themeError) {
          console.log('Theme endpoint not available, using tenant config theme');
        }
      }
      
      setTenantConfig(config);
      applyTheme(config.theme);
      document.title = config.businessName || 'Turnos Pro';
      
      // Cambiar favicon basado en el vertical
      const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (favicon) {
        favicon.href = `/assets/${config.vertical}/favicon.ico`;
      }
      
    } catch (error) {
      console.error('Failed to load tenant configuration:', error);
      console.log('Current hostname:', window.location.hostname);
      
      // If we're on main domain and API fails, still allow access to landing/register
      if (isMainDomain() && (window.location.pathname === '/' || window.location.pathname === '/register')) {
        setLoading(false);
        return;
      }
      
      // Detectar el vertical basado en el hostname si la API falla
      let detectedVertical: 'barbershop' | 'beautysalon' | 'aesthetics' = 'barbershop';
      let defaultTheme: ThemeConfiguration = {
        primaryColor: '#1976d2',
        secondaryColor: '#ffffff',
        accentColor: '#ffc107',
        backgroundColor: '#ffffff',
        surfaceColor: '#f5f5f5',
        errorColor: '#f44336',
        warningColor: '#ff9800',
        infoColor: '#2196f3',
        successColor: '#4caf50',
        textPrimaryColor: '#000000',
        textSecondaryColor: '#666666',
        borderColor: '#e0e0e0',
        fontFamily: 'Inter, Arial, sans-serif',
        borderRadius: 8,
        useShadows: true,
        autoContrastText: true
      };

      if (window.location.hostname.includes('beautysalon') || 
          window.location.hostname.includes('beauty') ||
          window.location.hostname.includes('salon')) {
        detectedVertical = 'beautysalon';
        defaultTheme.primaryColor = '#C8A2C8';       // Rosa malva
        defaultTheme.secondaryColor = '#FFF8F0';     // Blanco crema  
        defaultTheme.accentColor = '#E6C9A8';        // Dorado champagne
        defaultTheme.fontFamily = 'Playfair Display, serif';
      } else if (window.location.hostname.includes('aesthetics') || 
                 window.location.hostname.includes('spa')) {
        detectedVertical = 'aesthetics';
        defaultTheme.primaryColor = '#9370DB';
        defaultTheme.secondaryColor = '#F5F5DC';
        defaultTheme.accentColor = '#40E0D0';
        defaultTheme.fontFamily = 'Lora, serif';
      }

      setTenantConfig({
        tenantId: '',
        businessName: detectedVertical === 'beautysalon' ? 'Salón de Belleza' : 
                     detectedVertical === 'aesthetics' ? 'Centro de Estética' : 'Turnos Pro',
        vertical: detectedVertical,
        timezone: '-3',
        theme: defaultTheme,
        features: {
          onlinePayment: true,
          smsReminders: true,
          loyaltyProgram: false,
          multiLocation: false
        },
        terminology: {
          employee: detectedVertical === 'beautysalon' ? 'Estilista' : 
                       detectedVertical === 'aesthetics' ? 'Esteticista' : 'Empleado',
          customer: 'Cliente',
          service: 'Servicio',
          booking: detectedVertical === 'beautysalon' ? 'Cita' : 
                  detectedVertical === 'aesthetics' ? 'Reserva' : 'Turno'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (theme: TenantConfig['theme']) => {
    const root = document.documentElement;
    
    // Colores principales
    root.style.setProperty('--color-primary', theme.primaryColor);
    root.style.setProperty('--color-secondary', theme.secondaryColor);
    root.style.setProperty('--color-accent', theme.accentColor);
    
    // Colores de fondo
    root.style.setProperty('--color-background', theme.backgroundColor || '#ffffff');
    root.style.setProperty('--color-surface', theme.surfaceColor || '#f5f5f5');
    
    // Colores de estado
    root.style.setProperty('--color-error', theme.errorColor || '#f44336');
    root.style.setProperty('--color-warning', theme.warningColor || '#ff9800');
    root.style.setProperty('--color-info', theme.infoColor || '#2196f3');
    root.style.setProperty('--color-success', theme.successColor || '#4caf50');
    
    // Colores de texto
    root.style.setProperty('--color-text-primary', theme.textPrimaryColor || '#000000');
    root.style.setProperty('--color-text-secondary', theme.textSecondaryColor || '#666666');
    
    // Colores de borde
    root.style.setProperty('--color-border', theme.borderColor || '#e0e0e0');
    
    // Fuentes
    if (theme.fontFamily) {
      const fontName = theme.fontFamily.split(',')[0].trim();
      if (fontName !== 'Roboto' && fontName !== 'Inter') {
        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(' ', '+')}&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      root.style.setProperty('--font-family', theme.fontFamily);
    }
    
    // Radio de borde
    root.style.setProperty('--border-radius', `${theme.borderRadius || 8}px`);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Provider store={store}>
      <TenantProvider config={tenantConfig}>
        <ThemeProvider theme={createTurnosProTheme(tenantConfig || undefined)}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
            <CssBaseline />
            <Router>
              <SubscriptionVerification />
              <Routes>
                {/* Rutas Super Admin */}
                <Route path="/super-admin/login" element={<SuperAdminLogin />} />
                <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
                <Route path="/super-admin/tenants" element={<TenantsManagement />} />
                
                {/* Main Domain Routes - Landing Page */}
                {isMainDomain() ? (
                  <>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/register" element={<SelfRegistration />} />
                    <Route path="/invitation/:token" element={<InvitationPage />} />
                  </>
                ) : (
                  <>
                    {/* Tenant Subdomain Routes */}
                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route path="/book" element={<BookingPage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/invitation/:token" element={<InvitationPage />} />
                    <Route path="/subscription/plans" element={<SubscriptionPlans />} />
                  </>
                )}
                
                {/* Rutas Admin con Layout */}
                <Route element={<AdminLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/bookings/new" element={<NewBooking />} />
                  <Route path="/new-booking" element={<NewBooking />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/customers/new" element={<NewCustomer />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/payments" element={<Payments />} />
                  <Route path="/employees" element={<Employees />} />
                  <Route path="/professionals" element={<Employees />} />
                  <Route path="/payroll" element={<Payroll />} />
                  <Route path="/financial-reports" element={<FinancialReports />} />
                  <Route path="/theme-settings" element={<ThemeSettings />} />
                  <Route path="/mercadopago-settings" element={<MercadoPagoSettings />} />
                  <Route path="/subscription" element={<SubscriptionManagement />} />
                  <Route path="/platform-subscription" element={<PlatformSubscriptionStatus />} />
                </Route>
              </Routes>
            </Router>
          </LocalizationProvider>
        </ThemeProvider>
      </TenantProvider>
    </Provider>
  );
}

export default App;