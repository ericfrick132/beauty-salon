import { verticalLinks, type VerticalLink } from '@/app/(lib)/vertical-links';

// Landings por vertical (SEO). Todo el copy sale de los hechos del producto que ya
// están en la landing (content.ts / BusinessTypes.tsx): no inventar funcionalidades.

export type VerticalSection = {
  h2: string;
  paragraphs?: string[];
  bullets?: string[];
  after?: string[];
};

export type VerticalContent = VerticalLink & {
  title: string;
  description: string;
  h1: string;
  eyebrow: string;
  intro: string[];
  sections: VerticalSection[];
  faqs: { q: string; a: string }[];
  datePublished: string;
  dateModified: string;
};

export const verticals: VerticalContent[] = [
  {
    ...verticalLinks[0],
    title: 'Sistema de turnos para peluquerías | TurnosPro',
    description:
      'Agenda online por estilista, señas con MercadoPago y recordatorios por WhatsApp para tu peluquería. Probá TurnosPro gratis, sin tarjeta.',
    h1: 'Sistema de turnos para peluquerías',
    eyebrow: 'Peluquerías',
    intro: [
      'Si tu peluquería sigue anotando turnos en un cuaderno o contestando WhatsApp entre corte y corte, estás perdiendo horas de trabajo y clientas que no vuelven. TurnosPro es un sistema de turnos online pensado para peluquerías: tus clientas reservan solas las 24 horas desde tu propio sitio, eligen estilista y servicio, dejan una seña con MercadoPago y reciben recordatorios por WhatsApp.',
      'Vos ves todo en una agenda por profesional, con vista diaria, semanal y mensual, y te dedicás a lo que importa: cortar, teñir y atender bien a cada persona que se sienta en tu silla.',
    ],
    sections: [
      {
        h2: 'Una agenda por estilista, sin superposiciones',
        paragraphs: [
          'En una peluquería conviven varios profesionales con horarios distintos, servicios de duración muy diferente y clientas que siempre quieren "con la misma de la otra vez". Un sistema de turnos para peluquerías tiene que resolver eso sin que vos hagas malabares.',
          'En TurnosPro cada estilista tiene su propia agenda. Cargás sus horarios, los servicios que hace y cuánto dura cada uno. Cuando una clienta reserva, solo ve los huecos reales de la persona que eligió: no hay dobles reservas ni turnos de coloración metidos en un espacio de 20 minutos.',
        ],
        bullets: [
          'Vista diaria, semanal y mensual para cada profesional.',
          'Bloqueos de horario para almuerzos, cursos o días libres.',
          'Turnos recurrentes para las clientas que vienen cada dos o tres semanas.',
          'Disponibilidad en tiempo real: lo que ve la clienta es lo que tenés libre.',
          'Notificaciones en el momento ante cada reserva nueva.',
        ],
      },
      {
        h2: 'Señas con MercadoPago para cortar las ausencias',
        paragraphs: [
          'El problema número uno de una peluquería no es conseguir turnos, es que la gente venga. Un balayage de tres horas que se cae a último momento es una tarde de facturación perdida.',
          'Por eso TurnosPro integra señas con MercadoPago en el flujo de reserva. Vos decidís qué servicios exigen seña y de cuánto; la clienta paga desde el celular al reservar y el dinero entra en tu propia cuenta de MercadoPago, sin comisiones de TurnosPro por cada turno. Cuando hay plata de por medio, la gente avisa si no puede venir y el horario se libera para otra persona.',
          'Los negocios que usan señas y recordatorios con TurnosPro reportan hasta un 80% menos de cancelaciones. Es la diferencia entre una agenda llena en papel y una agenda llena en la caja.',
        ],
      },
      {
        h2: 'Recordatorios y confirmación por WhatsApp, con agente de IA',
        paragraphs: [
          'Tus clientas viven en WhatsApp, así que los recordatorios también. TurnosPro envía recordatorios y confirmaciones automáticas antes de cada turno, con la anticipación que vos elijas.',
          'Si querés ir un paso más allá, podés sumar el agente de IA como add-on. Le escribe a cada clienta desde el número de WhatsApp de tu peluquería, entiende lo que responde y actúa solo: confirma el turno en tu agenda o lo cancela y libera el horario. Vos no tocás el teléfono, y tu mensaje sale con tu nombre y tu tono.',
        ],
        bullets: [
          'Recordatorio automático antes del turno.',
          'Confirmación con un simple "1" o "2" que la IA interpreta.',
          'Si la clienta cancela, el hueco queda libre para otra reserva.',
          'Todo sale de tu propio número de WhatsApp, no de un número genérico.',
        ],
      },
      {
        h2: 'Catálogo de servicios con precios: corte, color y tratamientos',
        paragraphs: [
          'Una peluquería vende decenas de servicios distintos: corte, color raíz, balayage, alisado, nutrición, brushing, peinado para eventos. Cada uno con su precio y su duración. Si la clienta no los ve claros antes de reservar, te va a preguntar por WhatsApp igual.',
          'En TurnosPro armás tu catálogo de servicios con precios, duraciones y qué especialista lo hace. Tu sitio de reservas lo muestra ordenado y actualizado: si subís el precio del color, se actualiza en el momento. Y como el catálogo ya define la duración, la agenda nunca queda corta para un servicio largo.',
        ],
      },
      {
        h2: 'Reservas desde Instagram y WhatsApp, sin apps para tus clientas',
        paragraphs: [
          'Tu web de turnos tiene tu marca, tu logo y tus colores, y funciona en cualquier celular sin descargar nada. Ponés el link en la bio de Instagram, en el estado de WhatsApp y en tu Google; la clienta entra, elige servicio, estilista y horario, paga la seña y listo. Nadie tiene que crearse una cuenta ni instalar una app.',
          'Vos tenés la app de TurnosPro para iPhone para mirar la agenda desde el sillón, y el panel web con reportes de ocupación, facturación por profesional y métricas.',
        ],
      },
      {
        h2: 'Cómo arranca una peluquería con TurnosPro',
        paragraphs: [
          'La puesta a punto lleva unos 15 minutos y no necesitás a nadie técnico:',
        ],
        bullets: [
          'Creás tu cuenta gratis con tu número de WhatsApp.',
          'Cargás tus estilistas, horarios y el catálogo de servicios con precios.',
          'Activás señas con tu cuenta de MercadoPago y los recordatorios por WhatsApp.',
          'Compartís el link de tu web de turnos en Instagram y WhatsApp.',
          'Sumás el agente de IA cuando quieras dejar de confirmar turnos a mano.',
        ],
        after: [
          'Tenés soporte prioritario en la puesta en marcha y después. No hay permanencia ni tarjeta para empezar.',
        ],
      },
    ],
    faqs: [
      {
        q: '¿Puedo tener una agenda distinta para cada estilista?',
        a: 'Sí. Cada profesional tiene su propia agenda con sus horarios, servicios y bloqueos. Tus clientas eligen con quién atenderse y solo ven los huecos reales de esa persona, en vista diaria, semanal o mensual.',
      },
      {
        q: '¿Cómo funcionan las señas para una peluquería?',
        a: 'Elegís qué servicios exigen seña y de cuánto. Al reservar, la clienta paga con MercadoPago y el dinero entra directo en tu cuenta. TurnosPro no cobra comisión por turno.',
      },
      {
        q: '¿Los recordatorios salen de mi propio número de WhatsApp?',
        a: 'Sí. Los recordatorios, las confirmaciones y el agente de IA (add-on) funcionan desde el número de WhatsApp de tu peluquería, con tu nombre y tu tono.',
      },
      {
        q: '¿Mis clientas necesitan descargar una app para reservar?',
        a: 'No. Reservan desde tu web de turnos, en cualquier celular, sin registrarse ni instalar nada. La app para iPhone es para vos, para gestionar la agenda.',
      },
      {
        q: '¿Cuánto cuesta un sistema de turnos para peluquerías?',
        a: 'TurnosPro cuesta ARS 50.000 por mes en el plan mensual y baja hasta ARS 37.500 por mes en el plan de 12 meses. Todos los planes incluyen prueba gratis sin tarjeta y no tienen permanencia.',
      },
    ],
    datePublished: '2026-09-03',
    dateModified: '2026-09-03',
  },
  {
    ...verticalLinks[1],
    title: 'Sistema de turnos para barberías | TurnosPro',
    description:
      'Turnos cortos, muchos por día y reservas desde Instagram o WhatsApp. Agenda online, señas con MercadoPago y recordatorios para tu barbería.',
    h1: 'Sistema de turnos para barberías',
    eyebrow: 'Barberías',
    intro: [
      'Una barbería vive de volumen: cortes de 30 o 40 minutos, uno atrás del otro, todo el día. Cada hueco vacío es plata que no vuelve, y cada cliente que se olvidó de venir te rompe la tarde. TurnosPro es un sistema de turnos online hecho para ese ritmo: reservas 24/7 desde tu link de Instagram o WhatsApp, agenda por barbero, señas con MercadoPago y recordatorios automáticos para que el sillón no quede vacío.',
      'Lo configurás en 15 minutos, sin tarjeta y sin permanencia, y desde ese momento tus clientes sacan turno solos mientras vos cortás.',
    ],
    sections: [
      {
        h2: 'Turnos cortos, muchos por día, cero superposiciones',
        paragraphs: [
          'Un sistema de turnos para barberías tiene que aguantar veinte o treinta reservas diarias por barbero sin confundirse. En TurnosPro cada servicio tiene su duración exacta: corte, corte y barba, perfilado, afeitado clásico o diseño. La agenda arma los huecos con esa duración y muestra al cliente solo los horarios que realmente están libres.',
          'Si un barbero se toma el mediodía o falta un día, lo bloqueás en dos toques y esos horarios desaparecen del sitio. Si un cliente viene cada dos semanas, le dejás un turno recurrente y no tiene que reservar de nuevo.',
        ],
        bullets: [
          'Agenda independiente por barbero con vista diaria, semanal y mensual.',
          'Bloqueos de horario y turnos recurrentes.',
          'Disponibilidad en tiempo real: sin dobles reservas.',
          'Notificaciones en el momento cada vez que entra una reserva.',
          'Reservas online ilimitadas en todos los planes.',
        ],
      },
      {
        h2: 'Reservas desde Instagram y WhatsApp, sin contestar mensajes',
        paragraphs: [
          'La mayoría de los clientes de una barbería llegan por Instagram o por el estado de WhatsApp. El problema es que reservar por mensaje es lento: preguntan, esperan, vos contestás entre cliente y cliente, y a veces el horario ya se fue.',
          'Con TurnosPro publicás tu propio sitio de reservas, con tu marca y tus colores, y ponés el link en la bio, en el estado y en el perfil de Google. El cliente entra, elige barbero, servicio y horario, y listo. Nada de descargar apps ni crearse cuentas. Vos solo ves la reserva aparecer en tu agenda.',
        ],
      },
      {
        h2: 'Cobros y señas con MercadoPago',
        paragraphs: [
          'Cuando un turno de 30 minutos se pierde, no hay forma de recuperarlo. Por eso muchas barberías cobran una seña o el corte completo por adelantado, y TurnosPro lo hace automático: activás cobros con tu propia cuenta de MercadoPago, decidís qué servicios piden seña y de cuánto, y el cliente paga desde el celular al reservar.',
          'La plata entra en tu cuenta de MercadoPago, no pasa por TurnosPro, y no pagás comisión por turno. Con la seña puesta, el que no puede venir avisa, y el horario se libera para el siguiente.',
        ],
        bullets: [
          'Seña parcial o pago completo, según el servicio.',
          'Cobros directo en tu cuenta de MercadoPago.',
          'Sin comisión por turno.',
          'Hasta 80% menos cancelaciones combinando señas y recordatorios.',
        ],
      },
      {
        h2: 'Recordatorios por WhatsApp y agente de IA que confirma solo',
        paragraphs: [
          'Con tantos turnos por día, confirmar uno por uno es imposible. TurnosPro manda recordatorios y confirmaciones por WhatsApp de forma automática, con la anticipación que elijas.',
          'Y si querés que nadie de tu equipo toque el teléfono, sumás el agente de IA como add-on: le escribe a cada cliente desde el número de WhatsApp de la barbería, entiende si responde "1" o "sí, voy" o "no llego", y confirma o cancela en tu agenda. Si cancela, el horario vuelve a estar disponible para otro corte.',
        ],
      },
      {
        h2: 'Catálogo de servicios con precios claros',
        paragraphs: [
          'Corte, corte y barba, barba sola, afeitado con toalla caliente, diseño, color: cada servicio con su precio, su duración y qué barbero lo hace. El catálogo se ve en tu sitio de reservas, así el cliente sabe qué va a pagar antes de sentarse, y la agenda sabe cuánto va a durar.',
          'Si tenés más de un local, cargás las sucursales y cada una tiene su equipo y su agenda. Y con los reportes y métricas ves qué barbero factura más, qué días se llenan y qué servicios conviene empujar.',
        ],
      },
      {
        h2: 'Cómo arranca una barbería con TurnosPro',
        bullets: [
          'Creás tu cuenta gratis con tu WhatsApp, sin tarjeta.',
          'Cargás barberos, horarios y servicios con precios y duración.',
          'Conectás tu cuenta de MercadoPago para señas o cobros completos.',
          'Ponés el link de tu sitio en Instagram, WhatsApp y Google.',
          'Activás recordatorios y, si querés, el agente de IA.',
        ],
        after: [
          'Todo el proceso lleva unos 15 minutos y tenés soporte prioritario durante la puesta en marcha. Además, con la app para iPhone gestionás la agenda desde donde estés.',
        ],
      },
    ],
    faqs: [
      {
        q: '¿Sirve para una barbería con varios barberos?',
        a: 'Sí. Cada barbero tiene su propia agenda, sus horarios y sus servicios. El cliente elige con quién cortarse y solo ve los horarios libres de esa persona. También podés cargar más de una sucursal.',
      },
      {
        q: '¿Puedo cobrar el corte completo por adelantado?',
        a: 'Sí. Configurás, servicio por servicio, si pedís una seña parcial o el pago completo. Se cobra con tu cuenta de MercadoPago al momento de reservar y no hay comisión por turno.',
      },
      {
        q: '¿Mis clientes tienen que instalar algo para reservar?',
        a: 'No. Reservan desde el link de tu sitio de turnos, en cualquier celular, sin registrarse ni descargar apps. Vos gestionás desde el panel web o la app para iPhone.',
      },
      {
        q: '¿Hay límite de turnos por mes?',
        a: 'No. Todos los planes de TurnosPro incluyen reservas online ilimitadas, algo clave para una barbería con muchos turnos cortos por día.',
      },
      {
        q: '¿Cuánto cuesta y hay permanencia?',
        a: 'Desde ARS 37.500 por mes en el plan de 12 meses hasta ARS 50.000 por mes en el plan mensual. Todos incluyen prueba gratis, sin tarjeta, y no hay permanencia: cancelás cuando quieras.',
      },
    ],
    datePublished: '2026-09-03',
    dateModified: '2026-09-03',
  },
  {
    ...verticalLinks[2],
    title: 'Sistema de turnos para centros de estética | TurnosPro',
    description:
      'Tratamientos largos, señas obligatorias con MercadoPago, recordatorios por WhatsApp y agenda por cabina o profesional. Probá TurnosPro gratis.',
    h1: 'Sistema de turnos para centros de estética',
    eyebrow: 'Centros de estética',
    intro: [
      'En un centro de estética un turno no es un corte de 30 minutos: es una limpieza facial de una hora, una sesión de depilación definitiva, un tratamiento corporal que ocupa la cabina toda la tarde. Cuando esa clienta no aparece, la pérdida es grande. TurnosPro es un sistema de turnos online para centros de estética que resuelve justo eso: señas obligatorias con MercadoPago, recordatorios y confirmación por WhatsApp, y una agenda por cabina o por profesional que nunca se superpone.',
      'Tus clientas reservan solas las 24 horas desde tu propio sitio, con tu marca. Vos dejás de perseguir confirmaciones y llenás la agenda con turnos que se cumplen.',
    ],
    sections: [
      {
        h2: 'Señas obligatorias para tratamientos largos',
        paragraphs: [
          'La regla es simple: cuanto más largo y más caro es el tratamiento, más te duele una ausencia. Un sistema de turnos para centros de estética tiene que permitirte exigir una seña antes de bloquear una cabina por dos horas.',
          'En TurnosPro definís, servicio por servicio, si la reserva requiere seña y de qué monto. La clienta paga con MercadoPago desde el celular en el mismo momento en que reserva; si no paga, el turno no se confirma. El dinero va directo a tu cuenta de MercadoPago y TurnosPro no cobra comisión por cada turno.',
          'Con señas y recordatorios activos, los negocios que usan TurnosPro reportan hasta un 80% menos de cancelaciones. Para una esteticista, eso es la diferencia entre una agenda que parece llena y una que factura.',
        ],
      },
      {
        h2: 'Agenda por cabina y por profesional',
        paragraphs: [
          'Un centro de estética tiene recursos que no se pueden duplicar: cabinas, camillas, equipos. Y profesionales con distintas especialidades: una hace faciales, otra depilación, otra masajes. La agenda tiene que respetar todo eso.',
          'TurnosPro te da una agenda por profesional con vista diaria, semanal y mensual, donde cada servicio ocupa exactamente el tiempo que dura. Cargás bloqueos para limpieza de cabina, capacitaciones o descansos, y turnos recurrentes para las sesiones que se repiten, como los planes de depilación o los tratamientos en varias etapas.',
        ],
        bullets: [
          'Duración real por tratamiento: nada de encajar una hora y media en un hueco de 45 minutos.',
          'Bloqueos de horario por profesional.',
          'Turnos recurrentes para sesiones periódicas.',
          'Disponibilidad en tiempo real en tu sitio de reservas.',
          'Varias sucursales, cada una con su equipo y su agenda.',
        ],
      },
      {
        h2: 'Recordatorios y confirmación automática por WhatsApp',
        paragraphs: [
          'Aunque haya seña, el recordatorio sigue siendo clave: la clienta reservó hace tres semanas y ya no se acuerda del horario. TurnosPro envía recordatorios y confirmaciones por WhatsApp de forma automática, con la anticipación que vos elijas.',
          'Si además querés que la confirmación sea inteligente, activás el agente de IA como add-on. Le escribe a cada clienta desde el número de WhatsApp de tu centro, entiende la respuesta y actúa solo: confirma el turno o lo cancela y libera la cabina para otra persona. Sale con tu marca y tu tono, y vos no intervenís.',
        ],
      },
      {
        h2: 'Catálogo de tratamientos con precios y especialistas',
        paragraphs: [
          'Limpieza facial profunda, peeling, radiofrecuencia, depilación definitiva por zona, masajes reductores, drenaje linfático, uñas esculpidas, pestañas. Cada uno con su precio, su duración y quién lo hace. Cuando el catálogo está claro en tu sitio de reservas, la clienta reserva sin preguntarte nada por WhatsApp y llega sabiendo qué va a pagar.',
          'El catálogo también le dice a la agenda cuánto dura cada cosa, así que no hay riesgo de que un tratamiento largo quede metido en un hueco corto. Y si cambiás precios, se actualizan en el momento.',
        ],
      },
      {
        h2: 'Tu propio sitio de reservas, con tu marca',
        paragraphs: [
          'TurnosPro no es un directorio donde tu centro aparece al lado de la competencia. Es tu web de turnos, con tu logo y tus colores, que funciona en cualquier celular sin descargar nada. La compartís en Instagram, WhatsApp y Google, y las reservas entran a tu agenda con notificación en el momento.',
          'Vos gestionás desde el panel web o la app para iPhone, con historial de cada clienta, reportes de ocupación y facturación por profesional, y soporte prioritario cuando lo necesites.',
        ],
      },
      {
        h2: 'Cómo arranca un centro de estética con TurnosPro',
        bullets: [
          'Creás tu cuenta gratis con tu número de WhatsApp, sin tarjeta.',
          'Cargás profesionales, horarios y el catálogo de tratamientos con duración y precio.',
          'Definís qué tratamientos exigen seña y conectás tu cuenta de MercadoPago.',
          'Activás recordatorios por WhatsApp y, si querés, el agente de IA.',
          'Compartís el link de tu sitio de reservas y empezás a recibir turnos.',
        ],
        after: [
          'La puesta a punto lleva unos 15 minutos. No hay permanencia: probás gratis, cambiás de plan cuando quieras y cancelás sin trámites.',
        ],
      },
    ],
    faqs: [
      {
        q: '¿Puedo exigir seña solo en algunos tratamientos?',
        a: 'Sí. La seña se configura servicio por servicio: podés pedirla en los tratamientos largos o caros y dejar sin seña los cortos. El monto también lo definís vos.',
      },
      {
        q: '¿La agenda respeta la duración real de cada tratamiento?',
        a: 'Sí. Cada servicio del catálogo tiene su duración y la agenda arma los huecos con ese tiempo, por profesional. Tus clientas solo ven horarios donde el tratamiento entra completo.',
      },
      {
        q: '¿Los recordatorios y el agente de IA salen de mi número?',
        a: 'Sí. Recordatorios, confirmaciones y el agente de IA (add-on) funcionan desde el número de WhatsApp de tu centro, con tu nombre y tu tono.',
      },
      {
        q: '¿Sirve para tratamientos en varias sesiones?',
        a: 'Sí. Podés cargar turnos recurrentes para planes de depilación definitiva, tratamientos corporales o cualquier servicio que se repita cada cierto tiempo.',
      },
      {
        q: '¿Cuánto cuesta TurnosPro para un centro de estética?',
        a: 'Desde ARS 37.500 por mes (plan de 12 meses) hasta ARS 50.000 por mes (plan mensual). Todos los planes incluyen prueba gratis sin tarjeta, reservas ilimitadas y no tienen permanencia.',
      },
    ],
    datePublished: '2026-09-03',
    dateModified: '2026-09-03',
  },
  {
    ...verticalLinks[3],
    title: 'Sistema de turnos para consultorios | TurnosPro',
    description:
      'Agenda online para psicólogos, nutricionistas y kinesiólogos: turnos recurrentes, confirmación automática por WhatsApp e historial de cada paciente.',
    h1: 'Sistema de turnos para consultorios',
    eyebrow: 'Consultorios',
    intro: [
      'Si atendés en un consultorio, sabés que el trabajo no termina con la sesión: hay que agendar la próxima, recordarle al paciente, confirmar la noche anterior y reacomodar todo cuando alguien cancela. TurnosPro es un sistema de turnos online para consultorios de psicólogos, nutricionistas, kinesiólogos y otros profesionales de la salud: reservas 24/7 desde tu propio sitio, turnos recurrentes, confirmación automática por WhatsApp e historial de turnos de cada paciente.',
      'Se configura en 15 minutos, sin tarjeta y sin permanencia. Funciona tanto para un profesional solo como para un consultorio con varios especialistas.',
    ],
    sections: [
      {
        h2: 'Turnos recurrentes para pacientes que vienen todas las semanas',
        paragraphs: [
          'En psicología, nutrición o kinesiología la mayoría de los pacientes repiten: el mismo día, a la misma hora, semana tras semana. Un sistema de turnos para consultorios tiene que hacer eso en un solo paso, no obligarte a cargar cada sesión a mano.',
          'En TurnosPro creás el turno recurrente una vez y la agenda lo repite con la frecuencia que definas. Si el paciente necesita cambiar una sesión puntual, la movés sin romper la serie. Y si se da de alta o pausa el tratamiento, cortás la recurrencia y esos horarios quedan libres para pacientes nuevos.',
        ],
        bullets: [
          'Turnos recurrentes semanales o con la frecuencia que elijas.',
          'Vista diaria, semanal y mensual por profesional.',
          'Bloqueos de horario para supervisiones, cursos o vacaciones.',
          'Disponibilidad en tiempo real en tu sitio de reservas.',
        ],
      },
      {
        h2: 'Confirmación automática por WhatsApp, sin perseguir a nadie',
        paragraphs: [
          'Confirmar turnos a mano la noche anterior es una de las tareas que más tiempo le roban a un profesional de la salud. TurnosPro manda recordatorios y confirmaciones por WhatsApp de forma automática, con la anticipación que vos elijas: el día anterior, unas horas antes o ambos.',
          'Con el agente de IA como add-on, la confirmación es completa: le escribe a cada paciente desde el número de WhatsApp de tu consultorio, entiende la respuesta y actúa solo. Si confirma, queda marcado en tu agenda; si cancela, el horario se libera y podés ofrecérselo a alguien de la lista de espera. Todo con tu nombre y tu tono, sin que intervengas.',
        ],
      },
      {
        h2: 'Historial de turnos de cada paciente',
        paragraphs: [
          'TurnosPro guarda el historial de turnos y las preferencias de cada paciente, con la comunicación centralizada en un solo lugar: cuándo vino, qué servicio tomó, si confirmó o canceló, si dejó seña. Eso te sirve para ver rápido quién falta seguido, quién está al día y cuándo fue la última sesión.',
          'Aclaración importante: TurnosPro es un sistema de gestión de turnos, no una historia clínica. Los datos de cada consultorio están aislados de los demás negocios y solo los ve el equipo que vos autorizás, según su rol.',
        ],
      },
      {
        h2: 'Señas con MercadoPago para reducir ausencias',
        paragraphs: [
          'Muchos consultorios ya cobran la sesión por adelantado o piden una seña para la primera consulta. TurnosPro lo integra en la reserva: activás cobros con tu propia cuenta de MercadoPago, elegís qué servicios piden seña y el paciente paga desde el celular al reservar. La plata entra en tu cuenta, sin comisión de TurnosPro por turno.',
          'Con señas y confirmación automática, los negocios que usan TurnosPro reportan hasta un 80% menos de cancelaciones. Para un consultorio con turnos de 45 o 60 minutos, cada ausencia evitada es una sesión más facturada.',
        ],
      },
      {
        h2: 'Tu sitio de reservas y tu catálogo de prestaciones',
        paragraphs: [
          'Publicás tu propia web de turnos, con tu nombre y tu marca, donde el paciente elige el profesional, la prestación y el horario. Primera consulta, sesión de seguimiento, consulta nutricional, sesión de kinesiología, evaluación: cada una con su duración y, si querés, su precio.',
          'Compartís el link por WhatsApp, Instagram o Google. El paciente reserva sin registrarse ni instalar nada, y vos recibís la notificación en el momento. Gestionás desde el panel web o la app para iPhone, y con los reportes ves ocupación y facturación por profesional.',
        ],
        bullets: [
          'Catálogo de prestaciones con duración y precio.',
          'Varios profesionales y sucursales bajo la misma cuenta.',
          'Notificaciones en tiempo real ante cada reserva.',
          'Reportes de ocupación y facturación.',
        ],
      },
      {
        h2: 'Cómo arranca un consultorio con TurnosPro',
        bullets: [
          'Creás tu cuenta gratis con tu número de WhatsApp, sin tarjeta.',
          'Cargás profesionales, horarios y prestaciones con su duración.',
          'Definís turnos recurrentes para los pacientes que ya tenés.',
          'Activás recordatorios y confirmación por WhatsApp, y el agente de IA si querés.',
          'Compartís el link de tu sitio y empezás a recibir reservas.',
        ],
        after: [
          'Tenés soporte prioritario en la puesta en marcha. No hay permanencia: probás gratis, cambiás de plan en un clic y cancelás cuando quieras.',
        ],
      },
    ],
    faqs: [
      {
        q: '¿Puedo cargar un turno fijo semanal para un paciente?',
        a: 'Sí. Creás el turno recurrente una sola vez, con la frecuencia que quieras, y la agenda lo repite. Podés mover una sesión puntual sin afectar el resto o cortar la serie cuando el paciente termina el tratamiento.',
      },
      {
        q: '¿La confirmación por WhatsApp es automática?',
        a: 'Sí. TurnosPro envía recordatorios y confirmaciones automáticas antes de cada turno. Con el agente de IA (add-on), además interpreta la respuesta del paciente y confirma o libera el horario en tu agenda sin que intervengas.',
      },
      {
        q: '¿TurnosPro reemplaza la historia clínica?',
        a: 'No. TurnosPro gestiona turnos, recordatorios, señas y el historial de turnos de cada paciente. No es una historia clínica ni reemplaza tu sistema de registros clínicos.',
      },
      {
        q: '¿Sirve para un consultorio con varios profesionales?',
        a: 'Sí. Cada profesional tiene su agenda, sus horarios y sus prestaciones. El paciente elige con quién atenderse y ve solo los horarios libres de esa persona. También podés cargar más de una sede.',
      },
      {
        q: '¿Cuánto cuesta un sistema de turnos para consultorios?',
        a: 'TurnosPro cuesta ARS 50.000 por mes en el plan mensual, y baja a ARS 45.000, ARS 40.000 y ARS 37.500 por mes en los planes de 3, 6 y 12 meses. Todos con prueba gratis sin tarjeta y sin permanencia.',
      },
    ],
    datePublished: '2026-09-03',
    dateModified: '2026-09-03',
  },
  {
    // Landing de funcionalidad (no es un rubro): no va en verticalLinks para no aparecer en BusinessTypes/Footer.
    slug: 'reservas-online',
    path: '/reservas-online',
    label: 'Reservas online',
    businessTypeLabel: 'Reservas online',
    title: 'Sistema de reservas online con recordatorios por WhatsApp | TurnosPro',
    description:
      'Sistema de reservas online para tu negocio: web de turnos 24/7, señas con MercadoPago sin comisión y recordatorios y confirmación por WhatsApp. Probá gratis, sin tarjeta.',
    h1: 'Sistema de reservas online con recordatorios por WhatsApp',
    eyebrow: 'Reservas online',
    intro: [
      'Un sistema de reservas online tiene que hacer tres cosas: dejar que el cliente reserve solo a cualquier hora, cobrarle una seña para que no falte y recordarle el turno por el canal que sí lee. TurnosPro hace las tres desde una sola cuenta: tu propia web de turnos disponible 24/7, señas con MercadoPago directo en tu cuenta y recordatorios y confirmación por WhatsApp desde tu propio número.',
      'Sirve para peluquerías, barberías, centros de estética, consultorios, estudios y cualquier negocio que trabaje con turnos. Se configura en 15 minutos, se prueba gratis sin tarjeta y no tiene permanencia.',
    ],
    sections: [
      {
        h2: 'Tu web de reservas, abierta las 24 horas',
        paragraphs: [
          'TurnosPro te da un sitio de reservas propio, rápido y pensado para el celular. Cargás tu catálogo de servicios con duración y precio, tus profesionales con sus horarios y, si tenés más de una, tus sucursales. El cliente entra desde el link que compartís en Instagram, en tu perfil de Google o en el estado de WhatsApp, elige servicio, profesional y horario, y reserva sin descargar ninguna app ni crear una cuenta.',
          'La disponibilidad se calcula en tiempo real: dos clientes no pueden tomar el mismo horario, los bloqueos que cargás (almuerzo, cursos, vacaciones) no se ofrecen y los turnos recurrentes se repiten solos. Vos ves todo en una agenda por profesional con vista diaria, semanal y mensual.',
        ],
      },
      {
        h2: 'Señas con MercadoPago, sin comisión',
        paragraphs: [
          'La reserva online sin seña es una promesa; con seña es un compromiso. En TurnosPro definís, servicio por servicio, si pedís una seña parcial o el pago completo. El cliente paga con MercadoPago desde el celular en el mismo momento en que reserva, y la plata entra directo en tu cuenta. TurnosPro no cobra comisión por turno ni por cobro: pagás solo la cuota del plan.',
        ],
        bullets: [
          'Seña parcial o pago total, configurable por servicio.',
          'Cobro con tu propia cuenta de MercadoPago.',
          '0% de comisión sobre cada turno.',
          'El horario queda tomado recién cuando entra el pago.',
        ],
      },
      {
        h2: 'Recordatorios y confirmación por WhatsApp desde tu número',
        paragraphs: [
          'Tus clientes no leen el mail: leen WhatsApp. TurnosPro manda el recordatorio de cada turno por WhatsApp desde el número de tu negocio, no desde uno genérico, y está incluido en el plan sin paquetes de mensajes. Con el agente de IA de confirmación, además, el sistema le escribe al cliente antes del turno, entiende la respuesta y actúa solo: confirma la asistencia o cancela y te libera el horario para que otra persona lo tome.',
          'Los negocios que combinan señas y recordatorios con TurnosPro reportan hasta un 80% menos de ausencias. Es la diferencia entre agendar turnos y cobrarlos.',
        ],
      },
      {
        h2: 'Gestión de clientes y reportes',
        paragraphs: [
          'Cada cliente tiene su ficha con historial de turnos y preferencias, así que la persona que atiende sabe quién viene y qué se hizo la última vez. Los reportes te muestran ocupación y facturación por profesional y por sucursal, para saber qué horarios se llenan, qué servicios se venden y a quién conviene darle más agenda.',
        ],
      },
      {
        h2: 'Cómo empezar',
        bullets: [
          'Creás tu cuenta gratis, sin tarjeta.',
          'Cargás servicios, precios, profesionales y horarios.',
          'Compartís tu link de reservas en redes y en tu perfil de Google.',
          'Activás las señas con tu cuenta de MercadoPago y el agente de IA de confirmación.',
        ],
        after: [
          'Todo el proceso lleva 15 minutos. Si venís de un cuaderno, una planilla o de otro sistema, importás tus clientes y seguís.',
        ],
      },
    ],
    faqs: [
      {
        q: '¿Qué es un sistema de reservas online?',
        a: 'Es una web donde tus clientes reservan solos un turno, eligiendo servicio, profesional y horario, sin llamarte ni escribirte. TurnosPro suma a eso la seña con MercadoPago y los recordatorios por WhatsApp, que son lo que baja las ausencias.',
      },
      {
        q: '¿Los recordatorios por WhatsApp están incluidos?',
        a: 'Sí. Los recordatorios salen desde tu propio número y están incluidos en el plan, sin paquetes de mensajes. El agente de IA que pide confirmación y entiende la respuesta se activa como complemento.',
      },
      {
        q: '¿TurnosPro cobra comisión por las reservas o por las señas?',
        a: 'No. La seña o el pago completo entran directo en tu cuenta de MercadoPago y no hay comisión por turno ni por cobro. Pagás solo la cuota del plan.',
      },
      {
        q: '¿Mis clientes tienen que instalar una app?',
        a: 'No. Reservan desde el navegador del celular, con un link, sin descargar nada ni crear una cuenta. El recordatorio les llega por WhatsApp.',
      },
      {
        q: '¿Cuánto cuesta el sistema de reservas online?',
        a: 'TurnosPro cuesta ARS 50.000 por mes en el plan mensual, y baja a ARS 45.000, ARS 40.000 y ARS 37.500 por mes en los planes de 3, 6 y 12 meses. Todos con prueba gratis sin tarjeta, reservas ilimitadas, profesionales y sucursales incluidos y sin permanencia.',
      },
      {
        q: '¿Sirve para varios profesionales o varias sucursales?',
        a: 'Sí. Cada profesional tiene su agenda, sus servicios y sus horarios, y podés cargar más de una sucursal bajo la misma cuenta, sin pagar por profesional.',
      },
    ],
    datePublished: '2026-09-04',
    dateModified: '2026-09-04',
  },
];

export function getVertical(slug: string): VerticalContent {
  const v = verticals.find((x) => x.slug === slug);
  if (!v) throw new Error(`Vertical no encontrada: ${slug}`);
  return v;
}

