import axios from 'axios';
import { TenantConfig, Booking, Customer, Employee, Service } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor para agregar token si existe y tenant subdomain
api.interceptors.request.use(
  (config) => {
    // Check for super admin token first, then regular token
    const superAdminToken = localStorage.getItem('superAdminToken');
    const token = localStorage.getItem('authToken');
    
    if (superAdminToken) {
      config.headers.Authorization = `Bearer ${superAdminToken}`;
    } else if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Only add tenant subdomain if not super admin route
    if (!config.url?.includes('/super-admin') && !config.url?.includes('/admin') && !config.url?.includes('/invitation')) {
      // Extraer subdomain del hostname
      // Formato esperado: subdomain.turnos-pro.com o subdomain.localhost:3000
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      // Need at least 3 parts for a subdomain (sub.domain.tld) or 2 for local (sub.localhost)
      const isLocalhost = parts[parts.length - 1] === 'localhost';
      const hasSubdomain = isLocalhost ? parts.length >= 2 : parts.length >= 3;
      if (hasSubdomain) {
        const subdomain = parts[0];
        if (subdomain && subdomain !== 'www') {
          config.headers['X-Tenant-Subdomain'] = subdomain;
        }
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor para manejo de errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 402) {
      // Emitir un evento global para que el frontend reaccione. Ojo: CARD_REQUIRED no es
      // "se te venció la suscripción", es una cuenta nueva sin tarjeta — el listener lo
      // manda al checkout en vez de abrir el modal de vencimiento.
      try {
        const event = new CustomEvent('subscription-required', {
          detail: error.response?.data || null,
        });
        window.dispatchEvent(event);
      } catch {}
    }
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;

      if (currentPath.includes('/super-admin') && currentPath !== '/super-admin/login') {
        // Super admin token expired — redirect to super admin login
        localStorage.removeItem('superAdminToken');
        localStorage.removeItem('superAdminUser');
        window.location.href = '/super-admin/login';
      } else if (currentPath !== '/login' && !currentPath.includes('/super-admin')) {
        // Regular token expired — redirect to tenant login
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(res => res.data),
  
  logout: () =>
    api.post('/auth/logout').then(res => res.data),
  
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    api.post('/auth/register', data).then(res => res.data),
  
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }).then(res => res.data),
  
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, newPassword: password }).then(res => res.data),

  changePassword: (newPassword: string) =>
    api.post('/auth/change-password', { newPassword }).then(res => res.data),
};

// Super Admin API
export const superAdminApi = {
  login: (email: string, password: string) =>
    api.post('/super-admin/auth/login', { email, password }).then(res => res.data),
  
  getTenants: (params?: { page?: number; pageSize?: number }) =>
    api.get('/super-admin/tenants', { params }).then(res => res.data),
  
  getInvitations: () =>
    api.get('/invitation').then(res => res.data),
  
  createInvitation: (data: any) =>
    api.post('/invitation', data).then(res => res.data),
  
  cancelInvitation: (invitationId: string) =>
    api.post(`/invitation/${invitationId}/cancel`).then(res => res.data),
  
  resendInvitation: (invitationId: string) =>
    api.post(`/invitation/${invitationId}/resend`).then(res => res.data),
  
  getTenantTheme: (tenantId: string) =>
    api.get(`/api/admin/tenanttheme/${tenantId}`).then(res => res.data),
  
  saveTenantTheme: (tenantId: string, theme: any) =>
    api.post(`/api/admin/tenanttheme/${tenantId}`, theme).then(res => res.data),
  
  resetTenantTheme: (tenantId: string) =>
    api.post(`/api/admin/tenanttheme/${tenantId}/reset`).then(res => res.data),
};

// Tenant API
export const tenantApi = {
  getConfig: (): Promise<TenantConfig> => 
    api.get('/tenant/config').then(res => res.data),
  
  getInfo: () => 
    api.get('/tenant/info').then(res => res.data),
};

// Bookings API
export const bookingApi = {
  getBookings: (params?: {
    date?: string;
    employeeId?: string;
    status?: string;
  }): Promise<Booking[]> =>
    api.get('/bookings', { params }).then(res => res.data),

  getBooking: (id: string): Promise<Booking> =>
    api.get(`/bookings/${id}`).then(res => res.data),

  createBooking: (booking: Partial<Booking>) =>
    api.post('/bookings', booking).then(res => res.data),

  updateBooking: (id: string, booking: Partial<Booking>) =>
    api.put(`/bookings/${id}`, booking).then(res => res.data),

  deleteBooking: (id: string) =>
    api.delete(`/bookings/${id}`).then(res => res.data),

  getEmployees: (): Promise<Employee[]> =>
    api.get('/employees').then(res => res.data),

  getServices: (): Promise<Service[]> =>
    api.get('/services').then(res => res.data),

  getCustomers: (): Promise<any[]> =>
    api.get('/customers').then(res => res.data),

  getAvailableSlots: (params: {
    date: Date;
    employeeId: string;
    serviceId: string;
  }): Promise<string[]> =>
    api.get('/bookings/available-slots', { 
      params: {
        ...params,
        date: params.date.toISOString().split('T')[0]
      }
    }).then(res => res.data),
};

// Customers API
export const customerApi = {
  getCustomers: (): Promise<Customer[]> =>
    api.get('/customers').then(res => res.data),

  getCustomer: (id: string): Promise<Customer> =>
    api.get(`/customers/${id}`).then(res => res.data),

  createCustomer: (customer: Partial<Customer>) =>
    api.post('/customers', customer).then(res => res.data),

  updateCustomer: (id: string, customer: Partial<Customer>) =>
    api.put(`/customers/${id}`, customer).then(res => res.data),

  deleteCustomer: (id: string) =>
    api.delete(`/customers/${id}`).then(res => res.data),
};

// Employees API
export const employeeApi = {
  getEmployees: (): Promise<Employee[]> =>
    api.get('/employees').then(res => res.data),

  getEmployee: (id: string): Promise<Employee> =>
    api.get(`/employees/${id}`).then(res => res.data),

  createEmployee: (employee: Partial<Employee>) =>
    api.post('/employees', employee).then(res => res.data),

  updateEmployee: (id: string, employee: Partial<Employee>) =>
    api.put(`/employees/${id}`, employee).then(res => res.data),

  deleteEmployee: (id: string) =>
    api.delete(`/employees/${id}`).then(res => res.data),

  // Employee time blocks
  getBlocks: (employeeId: string, params?: { from?: string; to?: string }) =>
    api.get(`/employees/${employeeId}/blocks`, { params }).then(res => res.data),
  createBlock: (employeeId: string, data: { startTime: string; endTime: string; reason?: string }) =>
    api.post(`/employees/${employeeId}/blocks`, data).then(res => res.data),
  createRecurringBlocks: (employeeId: string, data: { startDate: string; endDate?: string; startTimeOfDay: string; endTimeOfDay: string; daysOfWeek: number[]; reason?: string; forceOverride?: boolean }) =>
    api.post(`/employees/${employeeId}/blocks/recurring`, data).then(res => res.data),
  updateBlock: (employeeId: string, blockId: string, data: { startTime: string; endTime: string; reason?: string; forceOverride?: boolean }) =>
    api.put(`/employees/${employeeId}/blocks/${blockId}`, data).then(res => res.data),
  deleteBlock: (employeeId: string, blockId: string) =>
    api.delete(`/employees/${employeeId}/blocks/${blockId}`).then(res => res.data),
  excludeOccurrence: (employeeId: string, blockId: string, date: string) =>
    api.delete(`/employees/${employeeId}/blocks/${blockId}/occurrence`, { params: { date } }).then(res => res.data),
};

// Services API
export const serviceApi = {
  getServices: (): Promise<Service[]> =>
    api.get('/services').then(res => res.data),

  getService: (id: string): Promise<Service> =>
    api.get(`/services/${id}`).then(res => res.data),

  createService: (service: Partial<Service>) =>
    api.post('/services', service).then(res => res.data),

  updateService: (id: string, service: Partial<Service>) =>
    api.put(`/services/${id}`, service).then(res => res.data),

  deleteService: (id: string) =>
    api.delete(`/services/${id}`).then(res => res.data),
};

export const serviceCategoryApi = {
  list: () => api.get('/services/categories').then(res => res.data),
  create: (data: { name: string; description?: string; isActive?: boolean }) =>
    api.post('/services/categories', data).then(res => res.data),
  update: (id: string, data: { name: string; description?: string; isActive?: boolean }) =>
    api.put(`/services/categories/${id}`, data).then(res => res.data),
  remove: (id: string) =>
    api.delete(`/services/categories/${id}`).then(res => res.data),
};

// Invitation API (public endpoints)
export const invitationApi = {
  getInvitation: (token: string) =>
    api.get(`/invitation/${token}`).then(res => res.data),
  
  acceptInvitation: (data: any) =>
    api.post('/invitation/accept', data).then(res => res.data),
};

// Self Registration API (public endpoints)
export const selfRegistrationApi = {
  register: (data: any) =>
    api.post('/self-registration', data).then(res => res.data),

  checkSubdomain: (subdomain: string) =>
    api.get(`/self-registration/check-subdomain/${subdomain}`).then(res => res.data),

  getVerticals: () =>
    api.get('/verticals').then(res => res.data),
};

// New Registration API (email confirmation flow)
export const registrationApi = {
  // Alta/login passwordless por código de email (paso 1 manda el código, paso 2 lo verifica).
  // start: con email (formulario) o con state (reenvío desde la página). Devuelve { state } para
  // identificar la transacción sin exponer el email en la URL (/register?s=...).
  emailStart: (data: { email?: string; state?: string; businessName?: string; phone?: string; [attribution: string]: string | undefined }) =>
    api.post('/registration/email/start', data).then(res => res.data),

  emailState: (state: string) =>
    api.get(`/registration/email/state/${encodeURIComponent(state)}`).then(res => res.data),

  emailVerify: (data: { state?: string; email?: string; code: string; [attribution: string]: string | undefined }) =>
    api.post('/registration/email/verify', data).then(res => res.data),

  start: (data: { email: string; password: string; confirmPassword: string }) =>
    api.post('/registration/start', data).then(res => res.data),

  verify: (token: string) =>
    api.get(`/registration/verify/${token}`).then(res => res.data),

  complete: (data: {
    rememberToken: string;
    subdomain: string;
    businessName: string;
    businessAddress?: string;
    phone?: string;
    website?: string;
    mobile: string;
    planCode?: string;
    promoCode?: string;
  }) => api.post('/registration/complete', data).then(res => res.data),

  checkSubdomain: (subdomain: string) =>
    api.get(`/registration/check-subdomain/${subdomain}`).then(res => res.data),

  // Validate a promo/coupon code for a given plan. Mirrors GymHero's checkoutService.validateCoupon.
  validateCoupon: (code: string, planCode: string) =>
    api
      .get('/registration/validate-coupon', { params: { code, planCode } })
      .then(res => res.data),

  googleRegister: (data: {
    idToken: string;
    subdomain: string;
    businessName: string;
    businessAddress?: string;
    mobile?: string;
    planCode?: string;
    promoCode?: string;
  }) => api.post('/registration/google-register', data).then(res => res.data),

  googleLogin: (idToken: string) =>
    api.post('/auth/google-login', { idToken }).then(res => res.data),
};

// Templates API
export const templatesApi = {
  getTemplates: () =>
    api.get('/templates').then(res => res.data),

  applyTemplate: (verticalCode: string) =>
    api.post('/tenant/apply-template', { verticalCode }).then(res => res.data),

  hasVertical: () =>
    api.get('/tenant/has-vertical').then(res => res.data),
};

export default api;

export const inventoryApi = {
  getProducts: (includeInactive = false) => api.get('/inventory/products', { params: { includeInactive } }).then(res => res.data),
  createProduct: (data: any) => api.post('/inventory/products', data).then(res => res.data),
  updateProduct: (id: string, data: any) => api.put(`/inventory/products/${id}`, data).then(res => res.data),
  deleteProduct: (id: string) => api.delete(`/inventory/products/${id}`).then(res => res.data),
  updateProductPrice: (id: string, data: { costPrice: number; salePrice: number; reason?: string }) =>
    api.patch(`/inventory/products/${id}/price`, data).then(res => res.data),
  updateStock: (id: string, data: { quantity: number; movementType: string; reason?: string; notes?: string; unitCost?: number }) =>
    api.post(`/inventory/stock/${id}`, data).then(res => res.data),
};

export const productCategoryApi = {
  list: (includeInactive = false) => api.get('/inventory/categories', { params: { includeInactive } }).then(res => res.data),
  create: (data: { name: string; description?: string; displayOrder?: number; isActive?: boolean }) =>
    api.post('/inventory/categories', data).then(res => res.data),
  update: (id: string, data: { name: string; description?: string; displayOrder?: number; isActive?: boolean }) =>
    api.put(`/inventory/categories/${id}`, data).then(res => res.data),
  remove: (id: string) => api.delete(`/inventory/categories/${id}`).then(res => res.data),
};
// Messaging API
export const messagingApi = {
  getPackages: () => api.get('/messaging/packages').then(res => res.data),
  purchase: (packageId: string) => api.post('/messaging/purchase', { packageId }).then(res => res.data),
  getBalance: () => api.get('/messaging/balance').then(res => res.data),
  getSettings: () => api.get('/messaging/settings').then(res => res.data),
  updateSettings: (data: {
    whatsappRemindersEnabled: boolean;
    reminderAdvanceMinutes: number;
    reminderTemplate?: string;
    confirmationBotEnabled?: boolean;
    confirmationAdvanceMinutes?: number;
    confirmationTemplate?: string;
  }) =>
    api.put('/messaging/settings', data).then(res => res.data),
  getConfirmationBotStats: () => api.get('/messaging/confirmation-bot/stats').then(res => res.data),
  sendDueReminders: () => api.post('/messaging/send-due-reminders').then(res => res.data),
  getHistory: (page = 1, pageSize = 50, status?: string) =>
    api.get('/messaging/history', { params: { page, pageSize, status } }).then(res => res.data),
  getStats: () => api.get('/messaging/stats').then(res => res.data),
};

// Feature add-ons (cobro modular de features)
export interface FeatureAddonStatus {
  code: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  currency: string;
  active: boolean;
  paidUntil?: string;
  hasPendingPurchase: boolean;
}

// ---- Asistente de WhatsApp por menú (add-on menu_bot) ----
export interface MenuBotSettings {
  cancellationCutoffHours: number;
  minBookingAdvanceMinutes: number;
  daysToOffer: number;
  infoText: string | null;
}

export interface MenuBotStatus {
  addonActive: boolean;
  enabled: boolean;
  active: boolean;
  whatsAppConnected: boolean;
  connectedPhone: string | null;
  blockedReason: string | null;
  settings: MenuBotSettings;
  stats: { conversations: number; messages: number; bookingsCreated: number; bookingsCancelled: number };
  recent: { phone: string; contactName: string | null; step: string; lastMessageAt: string; bookingsCreated: number }[];
}

export const menuBotApi = {
  status: (): Promise<MenuBotStatus> => api.get('/menu-bot/status').then(res => res.data),
  updateSettings: (data: Partial<MenuBotSettings> & { enabled?: boolean }): Promise<{ message: string }> =>
    api.put('/menu-bot/settings', data).then(res => res.data),
  preview: (text: string): Promise<{ reply: string | null }> =>
    api.post('/menu-bot/preview', { text }).then(res => res.data),
};

// ---- Add-ons por negocio (super admin) ----
export interface SuperAdminTenantAddon {
  code: string;
  name: string;
  active: boolean;
  paidUntil?: string | null;
  source?: string | null;
}

export interface SuperAdminAddonsRow {
  tenantId: string;
  businessName: string;
  subdomain: string;
  status: string;
  addons: SuperAdminTenantAddon[];
  monthlyTotal: number;
}

export const superAdminAddonsApi = {
  tenants: (): Promise<SuperAdminAddonsRow[]> => api.get('/super-admin/feature-addons/tenants').then(res => res.data),
  grant: (tenantId: string, code: string, months: number) =>
    api.post('/super-admin/feature-addons/grant', { tenantId, code, months }).then(res => res.data),
  revoke: (tenantId: string, code: string) =>
    api.post('/super-admin/feature-addons/revoke', { tenantId, code, months: 1 }).then(res => res.data),
};

// ---- Detección de transferencias (add-on transfer_detection) ----
export interface TransferDetectionStatus {
  addonActive: boolean;
  enabled: boolean;
  active: boolean;
  startedAt: string | null;
  lastRunAt: string | null;
  mercadoPagoConnected: boolean;
  whatsAppConnected: boolean;
  blockedReason: string | null;
  detectedLast30: number;
  pending: number;
  pendingAmount: number;
  applied: number;
  appliedAmount: number;
  ignored: number;
  mappings: number;
  minutesSaved: number;
}

export interface TransferBookingCandidate {
  bookingId: string;
  serviceName: string;
  employeeName: string | null;
  startTime: string;
  endTime: string;
  customerName: string | null;
  customerPhone: string | null;
  totalPrice: number;
  amountPaid: number;
  outstanding: number;
  depositRequired: number | null;
  depositOutstanding: number | null;
  status: string;
  amountMatches: boolean;
}

export interface PendingIncomingPayment {
  id: string;
  mpPaymentId: string;
  dateApproved: string;
  amount: number;
  payerName: string | null;
  payerEmail: string | null;
  payerDni: string | null;
  paymentMethodId: string | null;
  description: string | null;
  matchType: string | null;
  suggestedBooking: TransferBookingCandidate | null;
}

export interface IncomingPaymentHistoryItem {
  id: string;
  mpPaymentId: string;
  dateApproved: string;
  amount: number;
  payerName: string | null;
  status: number; // 1 pendiente, 2 aplicado, 3 descartado
  matchType: string | null;
  bookingId: string | null;
  bookingLabel: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

export interface PayerCustomerMapping {
  id: string;
  payerKey: string;
  payerLabel: string | null;
  customerId: string;
  customerName: string;
  createdAt: string;
}

export const transferDetectionApi = {
  status: (): Promise<TransferDetectionStatus> => api.get('/transfer-detection/status').then(res => res.data),
  pending: (): Promise<PendingIncomingPayment[]> => api.get('/transfer-detection/pending').then(res => res.data),
  candidates: (id: string): Promise<TransferBookingCandidate[]> => api.get(`/transfer-detection/pending/${id}/candidates`).then(res => res.data),
  history: (days = 30): Promise<IncomingPaymentHistoryItem[]> => api.get('/transfer-detection/history', { params: { days } }).then(res => res.data),
  resolve: (id: string, bookingId: string, remember: boolean): Promise<{ message: string }> =>
    api.post(`/transfer-detection/pending/${id}/resolve`, { bookingId, remember }).then(res => res.data),
  ignore: (id: string): Promise<{ message: string }> => api.post(`/transfer-detection/pending/${id}/ignore`).then(res => res.data),
  mappings: (): Promise<PayerCustomerMapping[]> => api.get('/transfer-detection/mappings').then(res => res.data),
  deleteMapping: (id: string) => api.delete(`/transfer-detection/mappings/${id}`).then(res => res.data),
  run: (days = 3): Promise<{ message: string }> => api.post('/transfer-detection/run', null, { params: { days } }).then(res => res.data),
  setEnabled: (enabled: boolean): Promise<{ message: string }> => api.put('/transfer-detection/enabled', { enabled }).then(res => res.data),
};

export const featureAddonsApi = {
  list: (): Promise<FeatureAddonStatus[]> => api.get('/feature-addons').then(res => res.data),
  purchase: (code: string) => api.post('/feature-addons/purchase', { code }).then(res => res.data),
};

// WhatsApp Connection API
export const whatsappApi = {
  connect: () => api.post('/whatsapp/connect').then(res => res.data),
  getStatus: () => api.get('/whatsapp/status').then(res => res.data),
  refreshQr: () => api.post('/whatsapp/refresh-qr').then(res => res.data),
  disconnect: () => api.post('/whatsapp/disconnect').then(res => res.data),
  sendTest: (phone: string, message: string) =>
    api.post('/whatsapp/send-test', { phone, message }).then(res => res.data),
};

// Admin packages API (super admin)
export const messagePackagesAdminApi = {
  list: () => api.get('/admin/message-packages').then(res => res.data),
  create: (data: { name: string; quantity: number; price: number; currency: string; isActive: boolean }) =>
    api.post('/admin/message-packages', data).then(res => res.data),
  update: (id: string, data: { name: string; quantity: number; price: number; currency: string; isActive: boolean }) =>
    api.put(`/admin/message-packages/${id}`, data).then(res => res.data),
  remove: (id: string) => api.delete(`/admin/message-packages/${id}`).then(res => res.data),
};
