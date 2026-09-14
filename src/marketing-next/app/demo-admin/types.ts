import type { Booking, Customer, PayMethod } from './data';

export type ScreenId = 'dashboard' | 'calendar' | 'customers' | 'services' | 'payments' | 'reports' | 'bot' | 'agent';

export type Demo = {
  today: Date;
  customers: Customer[];
  bookings: Booking[];
  botEnabled: boolean;
  isMobile: boolean;
  go: (s: ScreenId) => void;
  toast: (msg: string, opts?: { cta?: boolean }) => void;
  register: () => void;
  locked: (label: string) => void;
  addBooking: (b: Omit<Booking, 'id'>) => Booking;
  updateBooking: (id: number, patch: Partial<Booking>) => void;
  registerPayment: (id: number, method: PayMethod) => void;
  addCustomer: (c: Omit<Customer, 'id'>) => Customer;
  setBotEnabled: (v: boolean) => void;
};
