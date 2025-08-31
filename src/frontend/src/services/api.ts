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
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Extraer subdomain del hostname para desarrollo local
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length >= 2 && parts[0] !== 'localhost' && parts[0] !== 'www') {
      // Formato: subdomain.localhost o subdomain.domain.com
      config.headers['X-Tenant-Subdomain'] = parts[0];
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
      localStorage.removeItem('authToken');
      window.location.href = '/login';
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


export default api;