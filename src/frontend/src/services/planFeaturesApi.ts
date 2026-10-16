/**
 * APIs de las features de plan del panel: turnos fijos (reservas recurrentes), ficha de clientes y
 * Píxel/Analytics. Separado de api.ts para no pisar cambios en paralelo; usa la misma instancia de axios
 * (token, subdominio e interceptor de PLAN_LIMIT).
 */
import api from './api';

/** Respuesta a un campo personalizado del formulario de reserva. */
export interface CustomFieldAnswer {
  fieldId: string;
  label: string;
  value: string;
}

// ───────────── Turnos fijos ─────────────

export interface CreateBookingSeriesRequest {
  customerId: string;
  employeeId: string;
  serviceId: string;
  /** Inicio del primer turno en UTC ISO (igual que POST /bookings). */
  startTime: string;
  /** 1 a 4 semanas. */
  intervalWeeks: number;
  /** 2 a 52 turnos. */
  occurrences: number;
  notes?: string;
}

export interface SkippedOccurrence {
  startTime: string;
  reason: string;
}

export interface CreateBookingSeriesResponse {
  id: string;
  created: { id: string; startTime: string; endTime: string }[];
  skipped: SkippedOccurrence[];
}

export interface BookingSeriesItem {
  id: string;
  customerId: string;
  customerName?: string | null;
  serviceId: string;
  serviceName?: string | null;
  employeeId: string;
  employeeName?: string | null;
  firstStartTime: string;
  intervalWeeks: number;
  occurrences: number;
  notes?: string | null;
  upcomingCount: number;
  nextStartTime?: string | null;
}

export interface BookingSeriesList {
  /** Tope de series activas del plan (-1 = ilimitadas, 0 = no incluido). */
  max: number;
  canCreate: boolean;
  series: BookingSeriesItem[];
}

export const bookingSeriesApi = {
  list: (): Promise<BookingSeriesList> => api.get('/booking-series').then((r) => r.data),
  create: (body: CreateBookingSeriesRequest): Promise<CreateBookingSeriesResponse> =>
    api.post('/booking-series', body).then((r) => r.data),
  cancel: (id: string): Promise<{ cancelledBookings: number }> => api.delete(`/booking-series/${id}`).then((r) => r.data),
};

/** "cada semana" / "cada 2 semanas". */
export const frequencyLabel = (weeks: number) => (weeks <= 1 ? 'cada semana' : `cada ${weeks} semanas`);

// ───────────── Detalle de reserva (extras) ─────────────

/** Campos nuevos de GET /bookings/{id} (BookingDetailDto). */
export interface BookingDetailExtras {
  id: string;
  seriesId?: string | null;
  couponCode?: string | null;
  discountAmount?: number | null;
  customFields?: CustomFieldAnswer[];
}

export const bookingDetailApi = {
  get: (id: string): Promise<BookingDetailExtras> => api.get(`/bookings/${id}`).then((r) => r.data),
};

// ───────────── Ficha de clientes (Pro) ─────────────

export interface CustomerHistoryBooking {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  price?: number | null;
  notes?: string | null;
  couponCode?: string | null;
  discountAmount?: number | null;
  seriesId?: string | null;
  serviceId: string;
  serviceName?: string | null;
  employeeId: string;
  employeeName?: string | null;
  customFields: CustomFieldAnswer[];
}

export interface CustomerHistory {
  customer: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    dni?: string | null;
    birthDate?: string | null;
    notes?: string | null;
    tags?: string | null;
    createdAt?: string;
  };
  stats: {
    totalBookings: number;
    attended: number;
    cancelled: number;
    noShows: number;
    totalSpent: number;
    firstVisit?: string | null;
    lastVisit?: string | null;
    nextBooking?: string | null;
    avgDaysBetweenVisits?: number | null;
    favoriteService?: string | null;
    favoriteEmployee?: string | null;
  };
  bookings: CustomerHistoryBooking[];
}

export const customerHistoryApi = {
  get: (customerId: string): Promise<CustomerHistory> => api.get(`/customers/${customerId}/history`).then((r) => r.data),
};

// ───────────── Píxel y Analytics (Pro) ─────────────

export interface TrackingSettings {
  allowed: boolean;
  metaPixelId?: string | null;
  googleAnalyticsId?: string | null;
}

export const trackingSettingsApi = {
  get: (): Promise<TrackingSettings> => api.get('/tenant/tracking').then((r) => r.data),
  update: (body: { metaPixelId?: string | null; googleAnalyticsId?: string | null }): Promise<TrackingSettings> =>
    api.put('/tenant/tracking', body).then((r) => r.data),
};
