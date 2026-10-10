import type { WhatsAppInboundEvent } from '../../services/api';

export type ActivityTone = 'ok' | 'warn' | 'error' | 'pending';

/** Texto para el negocio: qué pasó con el mensaje y, si no respondió, qué hacer. */
export function describeInboundEvent(e: WhatsAppInboundEvent, whoAnswers = 'el negocio'): { label: string; hint?: string; tone: ActivityTone } {
  if (e.status === 'replied' && e.reason === 'confirmation') return { label: 'Respondido por el bot de confirmación', tone: 'ok' };
  if (e.status === 'replied' && e.reason === 'ai_agent') return { label: 'Respondido por el agente IA', tone: 'ok' };
  if (e.status === 'replied' && e.reason === 'receipt') return { label: 'Comprobante recibido: se verifica con Mercado Pago', tone: 'ok' };
  if (e.status === 'replied') return { label: 'Respondido', tone: 'ok' };
  if (e.status === 'queued') return { label: 'Procesando…', tone: 'pending' };

  const reasons: Record<string, { label: string; hint?: string }> = {
    from_me: {
      label: 'No se responde: salió de tu mismo WhatsApp',
      hint: 'Los mensajes que mandás desde el celular conectado (incluido "mensaje a vos mismo") no se contestan. Probalo escribiendo desde otro celular.',
    },
    no_text: { label: 'No se responde: no es un mensaje de texto', hint: 'Por ahora el asistente sólo lee texto (no audios, fotos ni stickers).' },
    lid: { label: 'No se responde: WhatsApp ocultó el número', hint: 'El contacto escribió con un número oculto (Linked ID) y no hay adónde contestar.' },
    disabled: { label: 'No se responde: el asistente está apagado', hint: 'Prendé el asistente más arriba.' },
    no_plan: { label: 'No se responde: el asistente no está contratado' },
    no_tenant: { label: 'No se responde: la línea no está asociada a tu negocio' },
    no_reply: { label: `Sin respuesta: pidieron hablar con ${whoAnswers}`, hint: 'El asistente queda en pausa 4 horas o hasta que escriban "menu".' },
    confirmation_missing: { label: 'Sin respuesta: el turno de la confirmación ya no existe' },
    confirmation_expired: { label: 'Sin respuesta: el turno ya pasó' },
    confirmation_reprompt_limit: { label: 'Sin respuesta: no se entendió la confirmación', hint: 'Ya se repreguntó dos veces; conviene contactar al cliente.' },
    send_failed: { label: 'No se pudo enviar la respuesta', hint: 'Verificá que tu WhatsApp siga conectado.' },
    ai_error: { label: 'Error del agente IA', hint: 'Si se repite, escribinos.' },
    no_ai_key: { label: 'El agente IA no está configurado', hint: 'Escribinos y lo resolvemos.' },
    error: { label: 'Error procesando el mensaje', hint: 'Escribinos y lo resolvemos.' },
  };
  const known = e.reason ? reasons[e.reason] : undefined;
  return {
    label: known?.label ?? (e.status === 'failed' ? 'Error' : 'No se respondió'),
    hint: known?.hint,
    tone: e.status === 'failed' ? 'error' : 'warn',
  };
}

export function formatEventTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/** "+54 9 11 7897-3440"-ish para mostrar; un @lid no es teléfono. */
export function formatSender(e: Pick<WhatsAppInboundEvent, 'phone' | 'contactName'>): string {
  const name = e.contactName?.trim();
  if (!e.phone) return name || 'Desconocido';
  const phone = e.phone.endsWith('@lid') ? 'número oculto' : `+${e.phone}`;
  return name ? `${name} · ${phone}` : phone;
}
