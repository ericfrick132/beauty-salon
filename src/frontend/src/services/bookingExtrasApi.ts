import api from './api';

/**
 * Cupones del negocio para sus clientes y campos personalizados del formulario de reserva.
 * Panel: /booking-coupons y /booking-form-fields (staff). Página pública: /public/form-fields y
 * /public/coupons/validate. Los 403 PLAN_LIMIT los muestra PlanLimitDialog (interceptor de api.ts).
 */

export type CouponDiscountType = 'percent' | 'fixed';

export interface BookingCoupon {
  id: string;
  code: string;
  description: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BookingCouponInput {
  code: string;
  description?: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  maxUses?: number | null;
  expiresAt?: string | null;
  isActive: boolean;
}

export type FormFieldType = 'text' | 'textarea' | 'number' | 'select' | 'checkbox';

export interface BookingFormField {
  id: string;
  label: string;
  fieldType: FormFieldType;
  required: boolean;
  options: string[];
  placeholder: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface BookingFormFieldInput {
  label: string;
  fieldType: FormFieldType;
  required: boolean;
  options?: string[];
  placeholder?: string | null;
  displayOrder?: number;
  isActive: boolean;
}

/** Campo tal como lo pide la página pública (ya recortado al plan del negocio). */
export interface PublicFormField {
  id: string;
  label: string;
  fieldType: FormFieldType;
  required: boolean;
  placeholder: string | null;
  options: string[];
}

export interface CouponQuote {
  valid: boolean;
  code: string | null;
  discountType: CouponDiscountType | null;
  discountValue: number;
  discountAmount: number;
  finalPrice: number;
  /** Para el cliente final cuando valid = false. */
  message: string | null;
}

export const FORM_FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'Texto corto',
  textarea: 'Texto largo',
  number: 'Número',
  select: 'Lista desplegable',
  checkbox: 'Casilla (sí/no)',
};

export const bookingCouponsApi = {
  list: (): Promise<{ allowed: boolean; coupons: BookingCoupon[] }> =>
    api.get('/booking-coupons').then((res) => res.data),
  create: (data: BookingCouponInput): Promise<BookingCoupon> => api.post('/booking-coupons', data).then((res) => res.data),
  update: (id: string, data: BookingCouponInput): Promise<BookingCoupon> =>
    api.put(`/booking-coupons/${id}`, data).then((res) => res.data),
  deactivate: (id: string): Promise<void> => api.delete(`/booking-coupons/${id}`).then(() => undefined),
};

export const bookingFormFieldsApi = {
  list: (): Promise<{ maxFields: number; fields: BookingFormField[] }> =>
    api.get('/booking-form-fields').then((res) => res.data),
  create: (data: BookingFormFieldInput): Promise<BookingFormField> =>
    api.post('/booking-form-fields', data).then((res) => res.data),
  update: (id: string, data: BookingFormFieldInput): Promise<BookingFormField> =>
    api.put(`/booking-form-fields/${id}`, data).then((res) => res.data),
  deactivate: (id: string): Promise<void> => api.delete(`/booking-form-fields/${id}`).then(() => undefined),
};

export const publicBookingExtrasApi = {
  formFields: (): Promise<PublicFormField[]> =>
    api.get('/public/form-fields').then((res) => (Array.isArray(res.data) ? res.data : [])),
  validateCoupon: (code: string, serviceId: string): Promise<CouponQuote> =>
    api.post('/public/coupons/validate', { code, serviceId }).then((res) => res.data),
};

/** Mismo criterio que el backend (NormalizeCode): mayúsculas y sin espacios. */
export const normalizeCouponCode = (code: string) => code.toUpperCase().replace(/\s+/g, '');

/** Body completo para PUT a partir de un campo existente (el PUT reemplaza todo). */
export const fieldToInput = (f: BookingFormField, patch: Partial<BookingFormFieldInput> = {}): BookingFormFieldInput => ({
  label: f.label,
  fieldType: f.fieldType,
  required: f.required,
  options: f.options,
  placeholder: f.placeholder,
  displayOrder: f.displayOrder,
  isActive: f.isActive,
  ...patch,
});
