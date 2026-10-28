/**
 * Casos del simulador "Probalo" de la home (#simulador).
 *
 * REGLA: todo texto del asistente es TEXTUAL del backend (voseo, Argentina). Solo cambian los datos de
 * ejemplo, que son ficticios: negocio "Estudio Lila", clienta "Sofía Díaz", Belén y Mica, servicios
 * "Corte y brushing" ($12.000, 45 min) y "Color completo" ($38.000, 120 min), turno el miércoles 04/11
 * a las 15:30 y "hoy" = lunes 02/11. Cada mensaje lleva en `src` de dónde sale. Si cambia el texto en el
 * backend, hay que cambiarlo acá.
 *
 * Rutas de los fuentes (relativas a src/backend/BookingPro.API):
 *  - Recordatorio:          Models/Entities/TenantEntities.cs:158 (plantilla por defecto) + Services/WhatsAppReminderService.cs:150-156
 *  - Pedido de confirmación: Utilities/MessageTemplates.cs:15 + :34-36, Services/BookingConfirmationBotService.cs:157-164
 *  - Respuesta 1 / 2:        Controllers/WebhooksController.cs:688 (confirmado) y :712 (cancelado), ParseConfirmationIntent :936-981
 *  - Asistente por menú:     Services/WhatsAppMenuBotService.cs (líneas en cada mensaje)
 *  - Seña acreditada:        Services/DepositConfirmation.cs:121
 *  - Avisos al negocio:      Services/PushNotificationService.cs:95-97 (push a la app del negocio)
 *
 * Fuera a propósito: "reagendar" no existe (si el cliente pide reprogramar, el bot de confirmación lo
 * toma como cancelación: WebhooksController.cs:949), y el agente IA está discontinuado.
 */

export type SimMsg =
  | { from: 'client'; text: string; time: string }
  | { from: 'bot'; text: string; time: string; src: string; label?: string }
  /** Lo que pasa en el sistema, como pastilla centrada dentro del chat. */
  | { from: 'system'; text: string }
  /** Aviso que le llega al negocio (push en la app de TurnosPro), como nota interna dentro del chat. */
  | { from: 'note'; title: string; text: string; src: string };

export interface SimCase {
  id: string;
  group: 'antes' | 'asistente';
  title: string;
  line: string;
  messages: SimMsg[];
}

export const SIM_GROUPS: Record<SimCase['group'], { title: string; plan: string }> = {
  antes: { title: 'Antes del turno', plan: 'Desde Plus' },
  asistente: { title: 'Asistente por menú', plan: 'Add-on desde Plus' },
};

const MENU_HINT = 'Escribí *menu* para volver al inicio.';

export const SIM_CASES: SimCase[] = [
  {
    id: 'recordatorio',
    group: 'antes',
    title: 'Recordatorio del turno',
    line: 'Le llega solo antes del turno, desde el WhatsApp de tu negocio.',
    messages: [
      {
        from: 'bot',
        label: 'Recordatorio automático',
        time: '14:30',
        // TenantEntities.cs:158 (default) con los reemplazos de WhatsAppReminderService.cs:151-156 ({date} = dd/MM/yyyy)
        src: 'Models/Entities/TenantEntities.cs:158',
        text: 'Hola Sofía Díaz! Te recordamos tu turno para Corte y brushing el 04/11/2026 a las 15:30. Si no podés asistir, avisanos respondiendo este mensaje.',
      },
      { from: 'system', text: 'Sale 1 hora antes del turno (lo cambiás en la configuración)' },
    ],
  },
  {
    id: 'confirmar',
    group: 'antes',
    title: 'Confirma con un 1',
    line: 'El día antes le pide confirmar y tu agenda se actualiza sola.',
    messages: [
      {
        from: 'bot',
        label: 'Pedido de confirmación · 24 h antes',
        time: '15:30',
        src: 'Utilities/MessageTemplates.cs:15 + :35',
        text: 'Hola Sofía Díaz! Te escribimos de Estudio Lila por tu turno de Corte y brushing el 04/11/2026 a las 15:30.\n\nRespondé *1* para confirmar tu turno ✅ o *2* para cancelarlo ❌',
      },
      { from: 'client', text: '1', time: '15:42' },
      {
        from: 'bot',
        time: '15:42',
        src: 'Controllers/WebhooksController.cs:688',
        text: '¡Gracias Sofía! Tu turno del 04/11 a las 15:30 quedó confirmado. Te esperamos 😊',
      },
      { from: 'system', text: 'Turno confirmado en tu agenda' },
    ],
  },
  {
    id: 'no-puede',
    group: 'antes',
    title: 'Avisa que no puede ir',
    line: 'Si no llega, el turno se cancela y el horario vuelve a quedar libre.',
    messages: [
      {
        from: 'bot',
        label: 'Pedido de confirmación · 24 h antes',
        time: '15:30',
        src: 'Utilities/MessageTemplates.cs:15 + :35',
        text: 'Hola Sofía Díaz! Te escribimos de Estudio Lila por tu turno de Corte y brushing el 04/11/2026 a las 15:30.\n\nRespondé *1* para confirmar tu turno ✅ o *2* para cancelarlo ❌',
      },
      { from: 'client', text: 'uh no llego, perdón 🙏', time: '16:05' },
      {
        from: 'bot',
        time: '16:05',
        // "no llego" está en cancelContains (WebhooksController.cs:948)
        src: 'Controllers/WebhooksController.cs:712',
        text: 'Listo Sofía, tu turno del 04/11 a las 15:30 fue cancelado. ¡Podés reservar de nuevo cuando quieras!',
      },
      { from: 'system', text: 'Turno cancelado: el horario queda libre para otro cliente' },
    ],
  },
  {
    id: 'sacar-turno',
    group: 'asistente',
    title: 'Saca un turno por WhatsApp',
    line: 'Elige servicio, profesional, día y hora con números. Solo ve horarios libres.',
    messages: [
      { from: 'client', text: 'Hola! quiero sacar un turno', time: '23:12' },
      {
        from: 'bot',
        time: '23:12',
        src: 'Services/WhatsAppMenuBotService.cs:255-258',
        text: '💇 ¿Qué servicio querés?\n1) Color completo · $38.000 · 120 min\n2) Corte y brushing · $12.000 · 45 min\n0) Volver al menú',
      },
      { from: 'client', text: '2', time: '23:12' },
      {
        from: 'bot',
        time: '23:12',
        src: 'Services/WhatsAppMenuBotService.cs:295-298',
        text: '🙋 ¿Con quién te gustaría atenderte?\n1) Belén\n2) Mica\n3) Me da igual, el primero que haya\n0) Volver al menú',
      },
      { from: 'client', text: '1', time: '23:13' },
      {
        from: 'bot',
        time: '23:13',
        src: 'Services/WhatsAppMenuBotService.cs:324-332',
        text: '📅 ¿Para qué día?\n1) Hoy (02/11)\n2) Mañana (03/11)\n3) Miércoles (04/11)\n4) Jueves (05/11)\n5) Viernes (06/11)\n6) Sábado (07/11)\n7) Domingo (08/11)\n0) Volver al menú\n_Podés escribir el día: «jueves», «12/09», «pasado mañana»._',
      },
      { from: 'client', text: '3', time: '23:13' },
      {
        from: 'bot',
        time: '23:13',
        src: 'Services/WhatsAppMenuBotService.cs:368-376',
        text: '🕐 Horarios libres el Mié 04/11:\n1) 10:00   2) 11:30   3) 13:00\n4) 15:30   5) 17:00   6) 18:30\n\nRespondé con el número o escribí la hora («a las 16», «16:30»).\n0) Elegir otro día',
      },
      { from: 'client', text: '4', time: '23:13' },
      {
        from: 'bot',
        time: '23:13',
        src: 'Services/WhatsAppMenuBotService.cs:406',
        text: '🙋 ¿A nombre de quién reservo el turno?',
      },
      { from: 'client', text: 'Sofía Díaz', time: '23:14' },
      {
        from: 'bot',
        time: '23:14',
        src: 'Services/WhatsAppMenuBotService.cs:427-453',
        text: '📋 Confirmá tu turno:\n• Miércoles 04/11 a las 15:30\n• Corte y brushing (45 min)\n• Con Belén\n• Precio: $12.000\n• A nombre de: Sofía Díaz\n\n1) ✅ Confirmar\n2) ❌ No, volver al menú',
      },
      { from: 'client', text: '1', time: '23:14' },
      {
        from: 'bot',
        time: '23:14',
        src: 'Services/WhatsAppMenuBotService.cs:531-539 + :1020',
        text: `✅ ¡Turno confirmado!\n• Miércoles 04/11 a las 15:30\n• Corte y brushing con Belén\n• Precio: $12.000\n\nPodés cancelarlo por acá hasta 24 hs antes (escribí *cancelar*).\n${MENU_HINT}`,
      },
      {
        from: 'note',
        title: 'Nuevo turno',
        src: 'Services/PushNotificationService.cs:95-97 (vía PublicService.cs:162)',
        text: 'Sofía Díaz · Corte y brushing · mié 4/11 15:30 con Belén',
      },
    ],
  },
  {
    id: 'sena',
    group: 'asistente',
    title: 'Paga la seña con Mercado Pago',
    line: 'Al confirmar le manda el link de pago y le avisa cuando se acredita.',
    messages: [
      { from: 'system', text: 'Ya eligió servicio, profesional, día y hora' },
      {
        from: 'bot',
        time: '23:14',
        src: 'Services/WhatsAppMenuBotService.cs:427-453 (línea de seña :443-446)',
        text: '📋 Confirmá tu turno:\n• Miércoles 04/11 a las 15:30\n• Corte y brushing (45 min)\n• Con Belén\n• Precio: $12.000\n• Seña: $3.600 (al confirmar te paso el link de Mercado Pago)\n• A nombre de: Sofía Díaz\n\n1) ✅ Confirmar\n2) ❌ No, volver al menú',
      },
      { from: 'client', text: '1', time: '23:14' },
      {
        from: 'bot',
        time: '23:14',
        src: 'Services/WhatsAppMenuBotService.cs:518-527',
        text: `📅 Reservamos tu turno: Corte y brushing con Belén, Miércoles 04/11 a las 15:30.\nPara confirmarlo, aboná la seña de $3.600 acá 👇\nhttps://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=…\nApenas se acredite te aviso por acá ✅\n\nPodés cancelarlo por acá hasta 24 hs antes (escribí *cancelar*).\n${MENU_HINT}`,
      },
      { from: 'system', text: 'Sofía paga la seña con Mercado Pago' },
      {
        from: 'bot',
        time: '23:16',
        src: 'Services/DepositConfirmation.cs:121',
        text: '¡Recibimos tu seña de $3.600 ✅! Tu turno del Miércoles 04/11 a las 15:30 quedó confirmado. ¡Te esperamos!',
      },
      {
        from: 'note',
        title: 'Seña recibida ✓',
        src: 'Services/PushNotificationService.cs:95-97 (vía MercadoPagoService.cs:423)',
        text: 'Sofía Díaz · Corte y brushing · mié 4/11 15:30 con Belén',
      },
    ],
  },
  {
    id: 'cancelar',
    group: 'asistente',
    title: 'Cancela sin llamarte',
    line: 'Elige cuál cancelar y el horario se libera. Respeta tu límite de horas.',
    messages: [
      { from: 'client', text: 'Necesito cancelar', time: '09:20' },
      {
        from: 'bot',
        time: '09:20',
        src: 'Services/WhatsAppMenuBotService.cs:597-599 (formato del turno :897-903)',
        text: '❌ ¿Cuál querés cancelar?\n1) Mié 04/11 15:30 · Corte y brushing con Belén\n0) Volver al menú',
      },
      { from: 'client', text: '1', time: '09:20' },
      {
        from: 'bot',
        time: '09:20',
        src: 'Services/WhatsAppMenuBotService.cs:623',
        text: '¿Seguro que querés cancelar el turno del Mié 04/11 15:30 · Corte y brushing con Belén?\n\n1) Sí, cancelar\n2) No, dejarlo',
      },
      { from: 'client', text: '1', time: '09:21' },
      {
        from: 'bot',
        time: '09:21',
        src: 'Services/WhatsAppMenuBotService.cs:663',
        text: `✅ Listo, cancelé tu turno del Mié 04/11 15:30 · Corte y brushing con Belén.\n\n${MENU_HINT}`,
      },
      {
        from: 'note',
        title: 'Turno cancelado',
        src: 'Services/PushNotificationService.cs:95-97 (vía WhatsAppMenuBotService.cs:662)',
        text: 'Sofía Díaz · Corte y brushing · mié 4/11 15:30 con Belén',
      },
    ],
  },
  {
    id: 'precios',
    group: 'asistente',
    title: 'Pregunta precios',
    line: 'Contesta con tus servicios, precios y el texto que vos cargues.',
    messages: [
      { from: 'client', text: 'Hola, cuánto sale el color?', time: '21:47' },
      {
        from: 'bot',
        time: '21:47',
        // El párrafo de la dirección es el "Texto extra" que carga el negocio (MenuBotSettings.InfoText).
        src: 'Services/WhatsAppMenuBotService.cs:672-686',
        text: 'ℹ️ *Estudio Lila*\n\n💇 *Servicios y precios*\n• Color completo: $38.000 · 120 min\n• Corte y brushing: $12.000 · 45 min\n\nEstamos en Gorriti 4800, Palermo. De martes a sábado de 10 a 20.\n\nEscribí *1* para reservar o *menu* para volver.',
      },
    ],
  },
  {
    id: 'hablar',
    group: 'asistente',
    title: 'Quiere hablar con vos',
    line: 'El asistente se corre y le contestás vos desde tu WhatsApp.',
    messages: [
      { from: 'client', text: 'Quiero hablar con alguien del local', time: '11:05' },
      {
        from: 'bot',
        time: '11:05',
        src: 'Services/WhatsAppMenuBotService.cs:696',
        text: '🙋 Dale, le aviso a Estudio Lila y te responden por acá.\n\n_Dejo de contestar automáticamente por un rato. Si querés volver al asistente, escribí *menu*._',
      },
      { from: 'system', text: 'El asistente queda en pausa 4 horas en este chat' },
    ],
  },
];
