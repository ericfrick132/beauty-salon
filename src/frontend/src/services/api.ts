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
      // Extraer subdomain del hostname para desarrollo local
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      if (parts.length >= 2 && parts[0] !== 'www') {
        // Formato: subdomain.localhost o subdomain.domain.com
        const subdomain = parts[0];
        if (subdomain && subdomain !== 'localhost') {
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
    if (error.response?.status === 401) {
      // Only redirect to login if we're not already on the login page or super admin pages
      const currentPath = window.location.pathname;
      const isOnLoginPage = currentPath === '/login' || currentPath.includes('/super-admin');
      
      if (!isOnLoginPage) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('superAdminToken');
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
    api.post('/auth/reset-password', { token, password }).then(res => res.data),
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

export default api;
// Messaging API
export const messagingApi = {
  getPackages: () => api.get('/messaging/packages').then(res => res.data),
  purchase: (packageId: string) => api.post('/messaging/purchase', { packageId }).then(res => res.data),
  getBalance: () => api.get('/messaging/balance').then(res => res.data),
  getSettings: () => api.get('/messaging/settings').then(res => res.data),
  updateSettings: (data: { whatsappRemindersEnabled: boolean; reminderAdvanceMinutes: number; reminderTemplate: string }) =>
    api.put('/messaging/settings', data).then(res => res.data),
  sendDueReminders: () => api.post('/messaging/send-due-reminders').then(res => res.data),
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
