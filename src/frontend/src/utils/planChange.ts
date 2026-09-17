/**
 * Respuesta de POST /preapproval/create y POST /subscription/subscribe cuando el negocio ya tenía el
 * débito automático autorizado: el backend no crea otra suscripción en Mercado Pago (cobraría las dos),
 * cambia el monto de la misma. No hay initPoint ni paymentUrl: se confirma y se refresca el estado.
 */
export interface PlanChangedResponse {
  success: true;
  planChanged: true;
  planName: string;
  amount: number;
  currency?: string | null;
  nextPaymentDate?: string | null;
}

export const isPlanChanged = (data: any): data is PlanChangedResponse => data?.planChanged === true;

export const planChangedMessage = (data: PlanChangedResponse): string => {
  const amount = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: data.currency || 'ARS',
    maximumFractionDigits: 0,
  }).format(data.amount);
  return `Listo, pasaste a ${data.planName}. Desde el próximo débito se cobra ${amount}.`;
};
