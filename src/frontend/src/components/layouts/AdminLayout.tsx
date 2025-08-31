import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useMediaQuery,
  useTheme,
  Badge,
  Tooltip,
  Collapse,
  ListItemAvatar,
  Button,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Menu as MenuIcon,
  Dashboard,
  CalendarToday,
  People,
  Payment,
  Assessment,
  Settings,
  Logout,
  AccountCircle,
  Notifications,
  ChevronLeft,
  AttachMoney,
  Group,
  Schedule,
  ExpandLess,
  ExpandMore,
  AddCircle,
  Visibility,
  ManageAccounts,
  BarChart,
  Home,
  Book,
  Palette,
  AccountBalance,
  CreditCard,
  Star,
  Business,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { useTenant } from '../../contexts/TenantContext';
import { 
  getThemeConfig, 
  getCardShadow, 
  getBorderStyle, 
  getTextColor,
  getHeaderTextColor,
  getCardBackground 
} from '../../utils/themeUtils';

const drawerWidth = 280;
const mobileDrawerWidth = 260;

// Styled components
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
  backdropFilter: 'blur(10px)',
  boxShadow: 'none',
  zIndex: theme.zIndex.drawer + 1,
  color: theme.palette.text.primary,
}));

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  width: drawerWidth,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: drawerWidth,
    backgroundColor: theme.palette.background.paper,
    borderRight: `1px solid ${theme.palette.divider}`,
    backgroundImage: 'none',
    color: theme.palette.text.primary,
    [theme.breakpoints.down('sm')]: {
      width: mobileDrawerWidth,
    },
  },
}));

const DrawerHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 2),
  ...theme.mixins.toolbar,
  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
  color: theme.palette.primary.contrastText,
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)`,
    animation: 'shimmer 3s ease-in-out infinite',
  },
  '@keyframes shimmer': {
    '0%': { transform: 'translateX(-100%)' },
    '100%': { transform: 'translateX(100%)' },
  },
}));

const MainContent = styled(Box)<{ open: boolean }>(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.default,
  minHeight: '100vh',
  marginLeft: open ? 0 : `-${drawerWidth}px`,
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
    marginLeft: 0,
  },
  [theme.breakpoints.up('md')]: {
    marginLeft: 0,
  },
}));

const StyledListItemButton = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== 'active' && prop !== 'primaryColor' && prop !== 'accentColor' && prop !== 'isLightTheme',
})<{ active?: boolean; primaryColor?: string; accentColor?: string; isLightTheme?: boolean }>(({ theme, active, primaryColor = '#1976d2', accentColor = '#ffc107', isLightTheme = false }) => ({
  margin: theme.spacing(0.5, 1),
  borderRadius: '12px',
  color: active ? (isLightTheme ? '#6B5B73' : primaryColor) : (isLightTheme ? '#9D8DA5' : `${primaryColor}cc`),
  transition: 'all 0.3s ease',
  backgroundColor: active ? (isLightTheme ? `${primaryColor}10` : `${primaryColor}15`) : 'transparent',
  borderLeft: active ? (isLightTheme ? `3px solid ${primaryColor}` : `4px solid ${accentColor}`) : (isLightTheme ? '3px solid transparent' : '4px solid transparent'),
  '&:hover': {
    backgroundColor: isLightTheme ? `${primaryColor}08` : `${primaryColor}10`,
    color: isLightTheme ? '#6B5B73' : primaryColor,
    transform: 'translateX(4px)',
    borderLeft: isLightTheme ? `3px solid ${primaryColor}` : `4px solid ${accentColor}`,
  },
  '& .MuiListItemIcon-root': {
    color: active ? theme.palette.primary.main : theme.palette.text.secondary,
    minWidth: 40,
  },
  '& .MuiListItemText-primary': {
    color: active ? theme.palette.primary.main : 'inherit',
    fontWeight: active ? 600 : 400,
  },
}));

const UserAvatar = styled(Avatar, {
  shouldForwardProp: (prop) => prop !== 'primaryColor' && prop !== 'accentColor' && prop !== 'isLightTheme',
})<{ primaryColor?: string; accentColor?: string; isLightTheme?: boolean }>(({ theme, primaryColor = '#1976d2', accentColor = '#ffc107', isLightTheme = false }) => ({
  background: isLightTheme 
    ? `linear-gradient(135deg, ${primaryColor}80 0%, ${accentColor}60 100%)`
    : `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`,
  color: '#ffffff',
  border: isLightTheme ? `1px solid ${primaryColor}40` : `2px solid ${accentColor}`,
  width: 40,
  height: 40,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'scale(1.1)',
    boxShadow: theme.shadows[4],
  },
}));

const NotificationBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
  },
}));

interface MenuItemType {
  text: string;
  icon: React.ReactNode;
  path?: string;
  children?: MenuItemType[];
}

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const { config, getTerm } = useTenant();
  const user = useAppSelector(state => state.auth.user);
  
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [notificationMenuAnchor, setNotificationMenuAnchor] = useState<null | HTMLElement>(null);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [notifications, setNotifications] = useState(3); // Mock notifications
  const [notificationList] = useState([
    { id: 1, title: 'Nueva reserva', message: 'Juan Pérez ha reservado para mañana', time: 'Hace 5 min', read: false },
    { id: 2, title: 'Cancelación', message: 'María García canceló su turno', time: 'Hace 1 hora', read: false },
    { id: 3, title: 'Recordatorio', message: 'Tienes 3 turnos pendientes hoy', time: 'Hace 2 horas', read: true },
  ])
  
  // Colores específicos del vertical
  const primaryColor = config?.theme?.primaryColor || '#1976d2';
  const secondaryColor = config?.theme?.secondaryColor || '#ffffff';
  const accentColor = config?.theme?.accentColor || '#ffc107';
  const verticalGradient = `linear-gradient(135deg, ${primaryColor}20 0%, ${primaryColor}10 100%)`;
  
  // Obtener configuración del tema
  const themeConfig = getThemeConfig(config?.vertical);
  const textColor = getTextColor(themeConfig, primaryColor);
  const headerTextColor = getHeaderTextColor(themeConfig);
  const isLightTheme = themeConfig.isLightBackground;

  const menuItems: MenuItemType[] = [
    { text: 'Panel General', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Calendario', icon: <CalendarToday />, path: '/calendar' },
    {
      text: 'Servicios',
      icon: <Schedule />,
      children: [
        { text: 'Gestionar Servicios', icon: <ManageAccounts />, path: '/services' },
        { text: `${getTerm('professional')}s`, icon: <Group />, path: '/professionals' },
      ],
    },
    {
      text: getTerm('booking') + 's',
      icon: <Book />,
      children: [
        { text: `Nueva ${getTerm('booking')}`, icon: <AddCircle />, path: '/new-booking' },
      ],
    },
    {
      text: 'Clientes',
      icon: <People />,
      children: [
        { text: `Ver ${getTerm('customer')}s`, icon: <Visibility />, path: '/customers' },
        { text: `Nuevo ${getTerm('customer')}`, icon: <AddCircle />, path: '/customers/new' },
      ],
    },
    
    {
      text: 'Facturación',
      icon: <AttachMoney />,
      children: [
        { text: 'Registrar Pagos', icon: <Payment />, path: '/payments' },
        { text: 'Gestión Empleados', icon: <Group />, path: '/employees' },
        { text: 'Sueldos y Comisiones', icon: <AccountBalance />, path: '/payroll' },
        { text: 'Reportes Financieros', icon: <BarChart />, path: '/financial-reports' },
      ],
    },
    { text: 'Reportes', icon: <Assessment />, path: '/reports' },
    { 
      text: 'Suscripción',
      icon: <Business />,
      children: [
        { text: 'Ver Planes', icon: <CreditCard />, path: '/subscription/plans' },
        { text: 'Mi Suscripción', icon: <Star />, path: '/subscription' },
        { text: 'Estado de la Plataforma', icon: <AccountBalance />, path: '/platform-subscription' },
      ]
    },
    { 
      text: 'Configuración', 
      icon: <Settings />,
      children: [
        { text: 'MercadoPago', icon: <AccountBalance />, path: '/mercadopago-settings' },
        { text: 'Personalizar Tema', icon: <Palette />, path: '/theme-settings' },
        { text: 'Configuración General', icon: <Settings />, path: '/settings' },
      ]
    },
  ];

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleNotificationMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationMenuAnchor(event.currentTarget);
  };

  const handleNotificationMenuClose = () => {
    setNotificationMenuAnchor(null);
  };

  const handleMarkAllRead = () => {
    setNotifications(0);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
    handleUserMenuClose();
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  const handleSubmenuToggle = (text: string) => {
    setOpenSubmenu(openSubmenu === text ? null : text);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2);
  };

  const getCurrentPageTitle = () => {
    const findMenuItem = (items: MenuItemType[]): string => {
      for (const item of items) {
        if (item.path === location.pathname) {
          return item.text;
        }
        if (item.children) {
          const childResult = findMenuItem(item.children);
          if (childResult) return childResult;
        }
      }
      return '';
    };
    return findMenuItem(menuItems) || config?.businessName || 'Turnos Pro';
  };

  const drawer = (
    <Box>
      <Box 
        sx={{ 
          display: 'flex',
          alignItems: 'center',
          padding: theme.spacing(2, 2),
          ...theme.mixins.toolbar,
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`,
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: config?.vertical === 'beautysalon' ? '0 2px 10px rgba(0,0,0,0.05)' : `0 4px 20px ${primaryColor}30`,
        }}
      >
        <CalendarToday sx={{ mr: 1, fontSize: { xs: 24, sm: 32 }, color: '#ffffff' }} />
        <Typography 
          variant="h6" 
          component="div" 
          fontWeight="bold"
          sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, color: '#ffffff' }}
        >
          {config?.businessName || 'Turnos Pro'}
        </Typography>
        {isMobile && (
          <IconButton
            onClick={handleDrawerToggle}
            sx={{ 
              ml: 'auto', 
              color: '#ffffff',
              '&:hover': {
                backgroundColor: config?.vertical === 'beautysalon' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.2)',
              }
            }}
          >
            <ChevronLeft />
          </IconButton>
        )}
      </Box>
      
      <Box sx={{ p: { xs: 1, sm: 2 } }}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              p: { xs: 1.5, sm: 2 },
              borderRadius: '12px',
              backgroundColor: config?.vertical === 'beautysalon' ? '#FFF9FC' : `${secondaryColor}50`,
              border: config?.vertical === 'beautysalon' ? `1px solid ${primaryColor}15` : `2px solid ${primaryColor}20`,
              mb: 2,
              flexDirection: { xs: 'column', sm: 'row' },
              textAlign: { xs: 'center', sm: 'left' },
            }}
          >
            <UserAvatar sx={{ mb: { xs: 1, sm: 0 } }} primaryColor={primaryColor} accentColor={accentColor} isLightTheme={config?.vertical === 'beautysalon'}>
              {getInitials(user?.firstName)}
            </UserAvatar>
            <Box sx={{ ml: { xs: 0, sm: 2 }, flex: 1 }}>
              <Typography 
                variant="subtitle2" 
                fontWeight={600}
                sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, color: config?.vertical === 'beautysalon' ? '#6B5B73' : primaryColor }}
              >
                {user?.firstName || 'Usuario'}
              </Typography>
              <Typography 
                variant="caption"
                sx={{ 
                  display: { xs: 'none', sm: 'block' },
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  color: config?.vertical === 'beautysalon' ? '#9D8DA5' : 'text.secondary'
                }}
              >
                {user?.email || 'admin@turnospro.com'}
              </Typography>
            </Box>
          </Box>
        </motion.div>
      </Box>

      <List sx={{ px: { xs: 0.5, sm: 1 } }}>
        {menuItems.map((item, index) => (
          <motion.div
            key={item.text}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            {item.children ? (
              <>
                <ListItem disablePadding>
                  <StyledListItemButton
                    onClick={() => handleSubmenuToggle(item.text)}
                    primaryColor={primaryColor}
                    accentColor={accentColor}
                    isLightTheme={config?.vertical === 'beautysalon'}
                    sx={{
                      mx: { xs: 0.5, sm: 1 },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: { xs: 35, sm: 40 } }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.text} />
                    {openSubmenu === item.text ? <ExpandLess /> : <ExpandMore />}
                  </StyledListItemButton>
                </ListItem>
                <Collapse in={openSubmenu === item.text} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.children.map((child) => (
                      <ListItem key={child.text} disablePadding sx={{ pl: 2 }}>
                        <StyledListItemButton
                          active={location.pathname === child.path}
                          primaryColor={primaryColor}
                          accentColor={accentColor}
                          isLightTheme={config?.vertical === 'beautysalon'}
                          onClick={() => child.path && handleNavigation(child.path)}
                          sx={{
                            mx: { xs: 0.5, sm: 1 },
                            '& .MuiListItemText-primary': {
                              fontSize: { xs: '0.8rem', sm: '0.875rem' },
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: { xs: 30, sm: 35 } }}>
                            {child.icon}
                          </ListItemIcon>
                          <ListItemText primary={child.text} />
                        </StyledListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </>
            ) : (
              <ListItem disablePadding>
                <StyledListItemButton
                  active={location.pathname === item.path}
                  primaryColor={primaryColor}
                  accentColor={accentColor}
                  isLightTheme={config?.vertical === 'beautysalon'}
                  onClick={() => item.path && handleNavigation(item.path)}
                  sx={{
                    mx: { xs: 0.5, sm: 1 },
                    '& .MuiListItemText-primary': {
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: { xs: 35, sm: 40 } }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </StyledListItemButton>
              </ListItem>
            )}
          </motion.div>
        ))}
      </List>

      <Divider sx={{ mt: 'auto', mb: 2 }} />
      
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          {config?.vertical?.toUpperCase()} Edition
        </Typography>
        <Typography variant="caption" display="block" color="text.secondary">
          v1.0.0
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: verticalGradient }}>
      <AppBar 
        position="fixed" 
        sx={{ 
          backgroundColor: isLightTheme ? '#FFFFFF' : `${secondaryColor}f5`,
          borderBottom: getBorderStyle(themeConfig, primaryColor, accentColor),
          backdropFilter: 'blur(15px)',
          boxShadow: getCardShadow(themeConfig, primaryColor),
          zIndex: theme.zIndex.drawer + 1,
          color: textColor,
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ 
              mr: 2,
              color: textColor,
              '&:hover': {
                backgroundColor: isLightTheme ? `${primaryColor}08` : `${primaryColor}10`,
              }
            }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                color: textColor,
                fontSize: { xs: '1rem', sm: '1.25rem' },
                fontWeight: 600,
              }}
            >
              {config?.businessName || getCurrentPageTitle()}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Notificaciones">
              <IconButton onClick={handleNotificationMenuOpen}>
                <Badge 
                  badgeContent={notifications} 
                  sx={{ 
                    '& .MuiBadge-badge': { 
                      backgroundColor: accentColor, 
                      color: '#ffffff' 
                    } 
                  }}
                >
                  <Notifications sx={{ color: textColor }} />
                </Badge>
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Perfil de usuario">
              <IconButton onClick={handleUserMenuOpen}>
                <Avatar 
                  sx={{ 
                    backgroundColor: themeConfig.borderStyle === 'accent' ? accentColor : primaryColor,
                    color: '#FFFFFF',
                    width: 36,
                    height: 36,
                    fontWeight: 600,
                    border: themeConfig.borderStyle === 'subtle' ? `1px solid ${accentColor}` : `2px solid ${themeConfig.borderStyle === 'accent' ? primaryColor : accentColor}`,
                  }}
                >
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={drawerOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: { xs: '85%', sm: mobileDrawerWidth, md: drawerWidth },
                maxWidth: drawerWidth,
              },
            }}
          >
            {drawer}
          </Drawer>
        ) : (
          <StyledDrawer variant="permanent" open>
            {drawer}
          </StyledDrawer>
        )}
      </Box>

      <MainContent open={drawerOpen}>
        <Toolbar />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Outlet />
        </motion.div>
      </MainContent>

      <Menu
        anchorEl={notificationMenuAnchor}
        open={Boolean(notificationMenuAnchor)}
        onClose={handleNotificationMenuClose}
        PaperProps={{
          sx: {
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '12px',
            width: 360,
            maxHeight: 400,
            mt: 1,
            overflow: 'hidden',
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Notificaciones</Typography>
          <Button size="small" onClick={handleMarkAllRead}>Marcar todas como leídas</Button>
        </Box>
        <List sx={{ p: 0, maxHeight: 300, overflow: 'auto' }}>
          {notificationList.map((notification) => (
            <ListItemButton 
              key={notification.id} 
              sx={{ 
                borderBottom: '1px solid', 
                borderColor: 'divider',
                backgroundColor: notification.read ? 'transparent' : `${primaryColor}08`,
                '&:hover': {
                  backgroundColor: `${primaryColor}10`,
                }
              }}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: notification.read ? 'grey.400' : primaryColor, width: 32, height: 32 }}>
                  <Notifications sx={{ fontSize: 18 }} />
                </Avatar>
              </ListItemAvatar>
              <ListItemText 
                primary={notification.title}
                secondary={
                  <>
                    <Typography variant="body2" color="text.secondary">{notification.message}</Typography>
                    <Typography variant="caption" color="text.disabled">{notification.time}</Typography>
                  </>
                }
              />
            </ListItemButton>
          ))}
        </List>
        <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
          <Button size="small" fullWidth>Ver todas las notificaciones</Button>
        </Box>
      </Menu>

      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        PaperProps={{
          sx: {
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '12px',
            minWidth: 200,
            mt: 1,
          },
        }}
      >
        <MenuItem onClick={() => { handleNavigation('/profile'); handleUserMenuClose(); }}>
          <ListItemIcon>
            <AccountCircle sx={{ color: 'primary.main' }} />
          </ListItemIcon>
          <ListItemText primary="Mi Perfil" />
        </MenuItem>
        <MenuItem onClick={() => { handleNavigation('/settings'); handleUserMenuClose(); }}>
          <ListItemIcon>
            <Settings sx={{ color: 'primary.main' }} />
          </ListItemIcon>
          <ListItemText primary="Configuración" />
        </MenuItem>
        <Divider sx={{ borderColor: 'divider' }} />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText primary="Cerrar Sesión" />
        </MenuItem>
      </Menu>
    </Box>
  );
};