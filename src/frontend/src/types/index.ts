export interface ThemeConfiguration {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  errorColor: string;
  warningColor: string;
  infoColor: string;
  successColor: string;
  textPrimaryColor: string;
  textSecondaryColor: string;
  borderColor: string;
  fontFamily: string;
  borderRadius: number;
  useShadows: boolean;
  autoContrastText: boolean;
}

export interface TenantConfig {
  tenantId: string;
  businessName: string;
  vertical: 'barbershop' | 'beautysalon' | 'aesthetics';
  theme: ThemeConfiguration;
  features: {
    onlinePayment: boolean;
    smsReminders: boolean;
    loyaltyProgram: boolean;
    multiLocation: boolean;
  };
  terminology: {
    employee: string;
    customer: string;
    service: string;
    booking: string;
  };
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface Service {
  id: string;
  categoryId?: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  createdAt: string;
}

export interface Employee {
  id: string;
  userId?: string;
  name: string;
  email?: string;
  phone?: string;
  employeeType: string;
  specialties?: string;
  workingHours?: string;
  commissionPercentage: number;
  fixedSalary: number;
  paymentMethod: string;
  canPerformServices: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  birthDate?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
}

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  employeeId: string;
  employeeName: string;
  serviceId: string;
  serviceName: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  price?: number;
  notes?: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}