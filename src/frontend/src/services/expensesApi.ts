import api from './api';

/**
 * Gastos del negocio que se cargan a mano (desde Plus): /api/expenses. Restan en la ganancia neta del
 * dashboard. Los sueldos fijos y las comisiones del equipo no van acá: salen solos de Equipo.
 */

export type ExpenseCategory =
  | 'alquiler'
  | 'sueldos'
  | 'servicios'
  | 'insumos'
  | 'impuestos'
  | 'marketing'
  | 'mantenimiento'
  | 'otros';

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; hint?: string }[] = [
  { value: 'alquiler', label: 'Alquiler' },
  { value: 'sueldos', label: 'Sueldos', hint: 'De quien no atiende turnos (recepción, limpieza…)' },
  { value: 'servicios', label: 'Servicios', hint: 'Luz, agua, gas, internet' },
  { value: 'insumos', label: 'Insumos' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'marketing', label: 'Publicidad' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'otros', label: 'Otros' },
];

export const expenseCategoryLabel = (c: string) => EXPENSE_CATEGORIES.find((x) => x.value === c)?.label ?? c;

export interface Expense {
  id: string;
  /** yyyy-MM-dd */
  date: string;
  category: ExpenseCategory;
  description: string | null;
  amount: number;
  isRecurring: boolean;
}

export interface ExpenseInput {
  date: string;
  category: ExpenseCategory;
  description?: string | null;
  amount: number;
  isRecurring: boolean;
}

export interface ExpenseMonth {
  allowed: boolean;
  /** yyyy-MM */
  month: string;
  total: number;
  byCategory: { category: ExpenseCategory; total: number }[];
  expenses: Expense[];
}

export const expensesApi = {
  list: (month: string) => api.get<ExpenseMonth>('/expenses', { params: { month } }).then((r) => r.data),
  create: (body: ExpenseInput) => api.post<Expense>('/expenses', body).then((r) => r.data),
  update: (id: string, body: ExpenseInput) => api.put<Expense>(`/expenses/${id}`, body).then((r) => r.data),
  remove: (id: string) => api.delete(`/expenses/${id}`),
  copyRecurring: (month: string) =>
    api.post<{ copied: number }>('/expenses/copy-recurring', null, { params: { month } }).then((r) => r.data),
};
