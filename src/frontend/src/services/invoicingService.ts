import api from './api';

// Facturación electrónica (ARCA) vía el facturador compartido. Mismos tipos que PlayCrew/GymHero.

export type EmitterStatus = 'pending' | 'not_delegated' | 'no_point_of_sale' | 'choose_point_of_sale' | 'ready';
export type TaxConditionCode = 'monotributo' | 'responsable_inscripto' | 'exento';

export interface Emitter {
  externalId: string;
  cuit: string;
  businessName: string;
  taxCondition: TaxConditionCode;
  status: EmitterStatus;
  readyToInvoice: boolean;
  message: string;
  pointOfSale?: number | null;
  pointsOfSale: number[];
  voucherName: string;
  pointOfSaleSystemName: string;
  platformCuit: string;
  platformName: string;
  guideUrl: string;
  environment: 'testing' | 'production';
  checkedAt?: string | null;
  address?: string | null;
  grossIncomeNumber?: string | null;
  activityStartDate?: string | null;
  monotributoCategory?: string | null;
}

export interface InvoicingStatus {
  platformEnabled: boolean;
  /** Guía de ARCA con capturas (embebible), aunque todavía no haya emisor. */
  guideUrl?: string | null;
  cuit?: string | null;
  autoInvoice: boolean;
  autoInvoiceSince?: string | null;
  emitter?: Emitter | null;
}

export interface InvoicingSettings {
  cuit: string;
  businessName?: string;
  taxCondition?: TaxConditionCode;
  monotributoCategory?: string;
  address?: string;
  grossIncomeNumber?: string;
  activityStartDate?: string;
}

export type SaleInvoiceStatus = 'none' | 'queued' | 'processing' | 'authorized' | 'rejected' | 'error' | 'credited';

export interface SaleRow {
  key: string;
  sourceType: 'payment' | 'sale';
  sourceId: string;
  date: string;
  when: string;
  description: string;
  customerName?: string | null;
  amount: number;
  method: string;
  invoiceStatus: SaleInvoiceStatus;
  electronicInvoiceId?: string | null;
  voucherName?: string | null;
  fullNumber?: string | null;
  error?: string | null;
}

export interface InvoiceResult { queued: number; alreadyInvoiced: number; failed: number; errors: string[] }
export interface MonthAmount { month: string; invoiced: number; external: number; total: number }

export interface MonotributoSummary {
  category?: string | null;
  annualCap?: number | null;
  billedLast12Months: number;
  remaining?: number | null;
  usedPercent?: number | null;
  level: 'ok' | 'warning' | 'danger' | 'exceeded';
  monthlyAverage: number;
  projectedAnnual: number;
  categoryForBilled?: string | null;
  categoryForProjection?: string | null;
  advice: string;
  nextRecategorization: string;
  tableValidFrom?: string | null;
  months: MonthAmount[];
}

export interface VatMonth { month: string; debitoFiscal: number; creditoFiscal: number; neto: number; invoicedNet: number; invoicedTotal: number }
export interface VatSummary { current: VatMonth; previous: VatMonth; advice: string }
export interface FiscalSummary { taxCondition: TaxConditionCode; monotributo?: MonotributoSummary | null; vat?: VatSummary | null }

// Emitir contra ARCA puede tardar más que el timeout por defecto del cliente.
const slow = { timeout: 60_000 };
const data = <T,>(p: Promise<{ data: T }>) => p.then((r) => r.data);

export const invoicingService = {
  status: () => data<InvoicingStatus>(api.get('/invoicing', slow)),
  saveSettings: (body: InvoicingSettings) => data<Emitter>(api.put('/invoicing/settings', body, slow)),
  verify: () => data<Emitter>(api.post('/invoicing/verify', {}, slow)),
  setPointOfSale: (pointOfSale: number) => data<Emitter>(api.post('/invoicing/point-of-sale', { pointOfSale }, slow)),
  setAuto: (enabled: boolean) => data<{ autoInvoice: boolean }>(api.put('/invoicing/auto', { enabled }, slow)),
  sales: (from: string, to: string) => data<SaleRow[]>(api.get('/invoicing/sales', { ...slow, params: { from, to } })),
  invoice: (keys: string[]) => data<InvoiceResult>(api.post('/invoicing/invoice', { keys }, slow)),
  sync: () => data<{ synced: number }>(api.post('/invoicing/sync', {}, slow)),
  creditNote: (id: string, reason?: string) => data<{ id: string }>(api.post(`/invoicing/${id}/credit-note`, { reason }, slow)),
  summary: () => data<FiscalSummary>(api.get('/invoicing/summary', slow)),
  savePeriod: (month: string, body: { externalBilled?: number; vatCredit?: number }) => data<{ ok: boolean }>(api.put(`/invoicing/periods/${month}`, body, slow)),
  pdf: (id: string) => data<Blob>(api.get(`/invoicing/${id}/pdf`, { ...slow, responseType: 'blob' })),
};

/** Mensaje del backend ({ error }) o uno genérico. */
export function invoicingError(e: unknown, fallback = 'No se pudo completar la operación'): string {
  const d = (e as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
  return d?.error || d?.message || fallback;
}
