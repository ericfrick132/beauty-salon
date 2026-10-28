/**
 * Curso del Centro de ayuda (/ayuda y /ayuda/<slug>).
 *
 * Cada paso nombra los menús, botones y campos TAL CUAL están en la app (src/frontend/src). Los nombres
 * del menú lateral salen de components/layouts/AdminLayout.tsx:309-366; los de cada pantalla, del archivo
 * que se cita en el comentario de cada lección. Si cambia un texto en la app, hay que cambiarlo acá.
 *
 * Fase 2 (videos): cuando haya video, se carga `video: { duracion: 'm:ss' }` y el archivo va en
 * public/ayuda/<slug>.mp4 con su póster public/ayuda/<slug>.jpg. El PDF del manual va en
 * public/ayuda/<slug>.pdf y se prende con `pdf: true`. El guion de grabación está al final del archivo.
 */

export const COURSE_STORAGE_KEY = 'turnospro-curso-v1';

export interface Leccion {
  slug: string;
  titulo: string;
  descripcion: string;
  sinonimos: string[];
  pasos: string[];
  /** Plan desde el que está la función (si no está en el plan Gratuito). */
  plan?: string;
  /** Para quién es la tarea cuando no es el dueño del negocio. */
  para?: 'cliente';
  video?: { duracion: string };
  pdf?: boolean;
}

export interface Modulo {
  slug: string;
  titulo: string;
  descripcion: string;
  lecciones: Leccion[];
}

export const MODULOS: Modulo[] = [
  {
    slug: 'primeros-pasos',
    titulo: 'Primeros pasos',
    descripcion: 'Dejá tu negocio listo para recibir reservas y compartí tu link.',
    lecciones: [
      {
        // components/onboarding/OnboardingWizard.tsx + config/onboardingConfig.tsx:149-201
        slug: 'como-completar-tu-perfil',
        titulo: 'Cómo completar tu perfil la primera vez',
        descripcion: 'Los cinco pasos que te pide TurnosPro apenas creás la cuenta: nombre, rubro, marca y contacto.',
        sinonimos: ['primeros pasos', 'configuración inicial', 'empezar', 'onboarding', 'crear cuenta'],
        pasos: [
          'Después de registrarte se abre el asistente de cinco pasos. En "Lo primero, saludarnos" completá "Tu nombre" y "¿Cómo se llama tu negocio?" y tocá "Siguiente »".',
          'En "Contanos de tu estudio" elegí "¿Qué tipo de negocio tenés?", cuántos turnos manejás por mes y cómo los gestionás hoy.',
          'En "Personalizá tu marca" tocá "Subir tu foto" para poner tu logo y elegí "Los colores de tu app" (o "Armá tu propia paleta").',
          'En "Queremos tener un detalle" cargá tu "Teléfono" y, si querés, tu Instagram y tu web.',
          'En el último paso tocá "Ir al panel". Te aparece un recorrido corto: podés seguirlo con "Siguiente" o salir con "Saltar".',
        ],
      },
      {
        // pages/Settings.tsx:620-848
        slug: 'como-cargar-los-datos-del-negocio',
        titulo: 'Cómo cargar los datos de tu negocio',
        descripcion: 'Nombre, teléfono, dirección y zona horaria, que son los que ven tus clientes.',
        sinonimos: ['dirección', 'teléfono del negocio', 'nombre del negocio', 'zona horaria', 'datos del local'],
        pasos: [
          'En el menú, abrí "Configuración" y entrá a "General".',
          'Quedate en la pestaña "General".',
          'Completá "Nombre del Negocio", "Teléfono", "Email", "Dirección" y "Descripción".',
          'Revisá "País" y "Zona Horaria": de ahí salen los horarios de tu agenda y de los mensajes.',
          'Tocá "Guardar Configuración General".',
        ],
      },
      {
        // pages/Settings.tsx:949-1014
        slug: 'como-configurar-los-horarios-del-negocio',
        titulo: 'Cómo configurar los horarios del negocio',
        descripcion: 'A qué hora abrís y cerrás y qué días no atendés.',
        sinonimos: ['horario de atención', 'días cerrados', 'apertura', 'cierre', 'feriados'],
        pasos: [
          'Entrá a "Configuración" › "General" y abrí la pestaña "Servicios".',
          'En "Horarios del negocio" elegí "Hora de apertura" y "Hora de cierre".',
          'En "Días cerrados" marcá los días que no abrís.',
          'Tocá "Guardar horarios".',
        ],
      },
      {
        // pages/Dashboard.tsx:112,527-538
        slug: 'como-compartir-tu-link-de-reservas',
        titulo: 'Cómo compartir tu link de reservas',
        descripcion: 'Copiá el link de tu página de reservas y ponelo en Instagram, WhatsApp o Google.',
        sinonimos: ['link', 'enlace', 'página de reservas', 'reservas online', 'compartir', 'instagram', 'bio'],
        pasos: [
          'Entrá a "Inicio".',
          'Buscá la tarjeta "Comparte este enlace con tus clientes para reservar": ahí está tu link, que termina en /book.',
          'Tocá "Copiar".',
          'Pegalo en la bio de Instagram, en tu estado o tu mensaje de bienvenida de WhatsApp, o en tu perfil de Google.',
        ],
      },
      {
        // pages/ThemeSettings.tsx:233-337 (se llega desde Configuración › General › Integraciones › "Abrir Tema")
        slug: 'como-cambiar-los-colores-de-tu-pagina',
        titulo: 'Cómo cambiar los colores de tu página',
        descripcion: 'Poné los colores de tu marca en la página de reservas.',
        sinonimos: ['colores', 'marca', 'tema', 'personalizar', 'diseño', 'logo'],
        plan: 'Desde Plus',
        pasos: [
          'Entrá a "Configuración" › "General" y abrí la pestaña "Integraciones".',
          'Tocá "Abrir Tema".',
          'En "Configuración del Tema" elegí "Color Primario", "Color Secundario" y "Color de Acento".',
          'Tocá "Guardar Cambios". Si no te convence, "Restablecer" vuelve a los colores de fábrica.',
        ],
      },
    ],
  },
  {
    slug: 'servicios-y-equipo',
    titulo: 'Servicios y equipo',
    descripcion: 'Lo que ofrecés, cuánto dura, cuánto sale y quién lo hace.',
    lecciones: [
      {
        // pages/Services.tsx:342-733
        slug: 'como-crear-un-servicio',
        titulo: 'Cómo crear un servicio',
        descripcion: 'Cargá el nombre, el precio y la duración de cada servicio que ofrecés.',
        sinonimos: ['servicio', 'precio', 'duración', 'tratamiento', 'prestación', 'cargar servicio'],
        pasos: [
          'En el menú, abrí "Clientes y Servicios" y entrá a "Servicios".',
          'Tocá "Nuevo Servicio".',
          'Completá "Nombre del servicio", "Precio" y "Duración" en minutos. La descripción es opcional.',
          'Si usás categorías, elegila en "Categoría".',
          'Dejá prendido "Servicio activo" para que se pueda reservar y tocá "Crear".',
        ],
      },
      {
        // pages/Services.tsx:645-714
        slug: 'como-pedir-sena-en-un-servicio',
        titulo: 'Cómo pedir seña en un servicio',
        descripcion: 'Elegí qué servicios piden seña, de cuánto y a qué clientes.',
        sinonimos: ['seña', 'adelanto', 'depósito', 'anticipo', 'pago anticipado', 'ausencias'],
        pasos: [
          'En "Servicios", tocá "Editar" en el servicio que querés.',
          'Prendé "Requiere seña para reservar".',
          'Elegí "Porcentaje" o "Monto fijo" y completá "Porcentaje de seña" o "Monto fijo de seña".',
          'En "Política de seña" elegí "Todos los clientes", "Solo clientes nuevos" o "Por anticipación" (y en ese caso, los "Días de anticipación").',
          'Tocá "Guardar". Para cobrarla online necesitás tener Mercado Pago conectado.',
        ],
      },
      {
        // pages/Services.tsx:600-613,740-741 ("+ Nueva categoría")
        slug: 'como-ordenar-los-servicios-por-categoria',
        titulo: 'Cómo ordenar los servicios por categoría',
        descripcion: 'Agrupá tus servicios (por ejemplo, Corte, Color, Uñas) para que el cliente los encuentre rápido.',
        sinonimos: ['categoría', 'agrupar servicios', 'ordenar', 'rubros'],
        pasos: [
          'En "Servicios", abrí "Nuevo Servicio" o "Editar" en uno que ya tengas.',
          'En "Categoría" elegí "+ Nueva categoría": se abre "Nueva categoría".',
          'Escribí el "Nombre de la categoría" y guardala.',
          'Elegila en "Categoría" y tocá "Guardar". Repetí con el resto de los servicios.',
        ],
      },
      {
        // pages/Employees.tsx:456-867
        slug: 'como-sumar-un-profesional',
        titulo: 'Cómo sumar un profesional',
        descripcion: 'Cargá a cada persona que atiende para que tenga su propia agenda.',
        sinonimos: ['empleado', 'profesional', 'peluquero', 'agenda', 'staff', 'equipo'],
        pasos: [
          'En el menú, abrí "Clientes y Servicios" y entrá a "Empleados".',
          'Tocá "Nuevo Empleado".',
          'Completá "Nombre", "Email" y "Teléfono", y elegí el "Tipo de Empleado".',
          'Si le pagás por comisión, completá "Método de Pago" y las comisiones.',
          'Dejá prendido "Empleado activo" y tocá "Crear".',
        ],
      },
      {
        // pages/Employees.tsx:949-1101
        slug: 'como-cargar-los-horarios-de-un-profesional',
        titulo: 'Cómo cargar los horarios de un profesional',
        descripcion: 'Los días y horas en que atiende cada uno: sin esto no le entran turnos.',
        sinonimos: ['horarios', 'días que atiende', 'turnos disponibles', 'descanso', 'almuerzo', 'jornada'],
        pasos: [
          'En "Empleados", tocá el ícono "Horarios" de la persona.',
          'En "Horarios de …" completá "Entrada" y "Salida" de cada día que atiende. Los días vacíos quedan como "No atiende".',
          'Si todos los días son iguales, cargá uno y tocá "Repetir en todos los días".',
          'Si corta para almorzar, completá "Descanso fijo (opcional)" con "Inicio descanso", "Fin descanso" y los días.',
          'Tocá "Guardar". En "Inicio" te avisamos con "Cargar horarios" si a alguien le faltan.',
        ],
      },
      {
        // pages/Blocks.tsx:321-476
        slug: 'como-bloquear-un-horario',
        titulo: 'Cómo bloquear un horario',
        descripcion: 'Vacaciones, un trámite o un día libre: cerrá esas horas para que nadie reserve.',
        sinonimos: ['bloqueo', 'vacaciones', 'día libre', 'ausencia', 'franco', 'licencia'],
        pasos: [
          'En el menú, abrí "Agenda" y entrá a "Bloqueos".',
          'Tocá "Nuevo".',
          'Elegí el "Empleado" y si es "Puntual" (un día) o "Recurrente" (todas las semanas).',
          'Puntual: elegí la "Fecha", "Hora inicio" y "Hora fin". Recurrente: los "Días de la semana", el horario, "Desde" y "Hasta (vacío = indefinido)".',
          'Si querés, escribí un "Motivo (opcional)" y tocá "Guardar".',
        ],
      },
      {
        // pages/TeamUsers.tsx:62-63,167-307
        slug: 'como-darle-acceso-a-tu-equipo',
        titulo: 'Cómo darle acceso a alguien de tu equipo',
        descripcion: 'Creale un usuario a un profesional o a quien te ayuda con la agenda.',
        sinonimos: ['usuario', 'acceso', 'permisos', 'contraseña', 'recepcionista', 'administrador'],
        pasos: [
          'En el menú, abrí "Configuración" y entrá a "Equipo".',
          'Tocá "Agregar usuario".',
          'Completá "Email", "Nombre", "Apellido" y "Teléfono".',
          'En "Rol" elegí "Empleado (sin reportes ni facturación)" o "Administrador (acceso total)".',
          'Poné una "Contraseña", tocá "Crear usuario" y pasale el email y la contraseña.',
        ],
      },
    ],
  },
  {
    slug: 'agenda-y-turnos',
    titulo: 'Agenda y turnos',
    descripcion: 'Dar, mover, confirmar y cobrar turnos desde el panel.',
    lecciones: [
      {
        // components/calendar/CalendarView.tsx:640-715,996-1018
        slug: 'como-usar-la-agenda',
        titulo: 'Cómo moverte por la agenda',
        descripcion: 'Mirá el día, la semana o el mes, y filtrá por profesional o por estado.',
        sinonimos: ['agenda', 'calendario', 'vista semanal', 'turnos del día', 'filtrar'],
        pasos: [
          'En el menú, entrá a "Agenda".',
          'Arriba elegí la vista: "Día", "Semana" o "Mes". "Hoy" te trae de vuelta al día de hoy.',
          'En "Empleado" elegí a una persona para ver solo su agenda, o "Todos".',
          'En "Estado" filtrá por "Pendiente", "Confirmado", "Completado", "Cancelado" o "No Show".',
        ],
      },
      {
        // pages/NewBooking.tsx:63,493-805 + CalendarView.tsx:707-715
        slug: 'como-dar-un-turno',
        titulo: 'Cómo dar un turno desde el panel',
        descripcion: 'Cargá un turno que te pidieron por teléfono o en persona.',
        sinonimos: ['nuevo turno', 'reservar', 'agendar', 'sacar turno', 'cita', 'turno manual'],
        pasos: [
          'En "Agenda", tocá "Nuevo" y elegí "Nueva Reserva".',
          '"Seleccionar Servicio": tocá el servicio.',
          '"Elegir Profesional": tocá quién lo atiende.',
          '"Fecha y Hora": elegí la "Fecha" y uno de los "Horarios disponibles".',
          '"Datos del Cliente": elegí "Cliente Existente" y buscalo en "Seleccionar Cliente", o "Nuevo Cliente" y completá "Nombre del Cliente", "Email" y "Teléfono".',
          'Revisá todo en "Confirmar" y tocá "Confirmar Reserva".',
        ],
      },
      {
        // components/calendar/CalendarView.tsx:736-741 (drag & drop y resize habilitados)
        slug: 'como-mover-un-turno',
        titulo: 'Cómo mover un turno a otro horario',
        descripcion: 'Arrastrá el turno en la agenda para cambiarlo de hora o de día.',
        sinonimos: ['mover turno', 'reprogramar', 'reagendar', 'cambiar horario', 'cambiar día'],
        pasos: [
          'En "Agenda", poné la vista "Semana" o "Día".',
          'Agarrá el turno y soltalo en el nuevo horario.',
          'Para alargarlo o acortarlo, estiralo desde el borde de abajo.',
        ],
      },
      {
        // components/calendar/CalendarView.tsx:1032-1196
        slug: 'como-confirmar-o-completar-un-turno',
        titulo: 'Cómo confirmar o completar un turno',
        descripcion: 'Cambiá el estado del turno cuando el cliente confirma o cuando ya lo atendiste.',
        sinonimos: ['confirmar turno', 'completar', 'estado del turno', 'atendido', 'eliminar turno'],
        pasos: [
          'En "Agenda", tocá el turno: se abre "Detalles de la Cita" con el cliente, el servicio, la hora y el estado.',
          'Si está pendiente, tocá "Confirmar".',
          'Cuando ya lo atendiste, tocá "Completar".',
          'Si hay que sacarlo de la agenda, tocá "Eliminar".',
        ],
      },
      {
        // components/calendar/CalendarView.tsx:1196,1266-1374
        slug: 'como-cobrar-un-turno',
        titulo: 'Cómo cobrar un turno en el local',
        descripcion: 'Registrá lo que te pagó el cliente, en efectivo, tarjeta o transferencia.',
        sinonimos: ['cobrar', 'registrar pago', 'efectivo', 'transferencia', 'tarjeta', 'propina', 'caja'],
        pasos: [
          'En "Agenda", tocá el turno y después "Registrar Pago".',
          'Elegí el "Empleado que cobró".',
          'Revisá el "Monto" y, si dejó, cargá la "Propina".',
          'Elegí "Efectivo", "Tarjeta" o "Transferencia".',
          'Tocá "Registrar Pago".',
        ],
      },
      {
        // pages/RecurringBookings.tsx:152-190 + pages/NewBooking.tsx:534-805
        slug: 'como-cargar-un-turno-fijo',
        titulo: 'Cómo cargar un turno fijo',
        descripcion: 'Para el cliente que viene todas las semanas a la misma hora.',
        sinonimos: ['turno fijo', 'turno recurrente', 'todas las semanas', 'repetir turno', 'abono'],
        plan: 'Desde Advance',
        pasos: [
          'En el menú, abrí "Agenda" y entrá a "Turnos fijos".',
          'Tocá "Nuevo turno fijo".',
          'Elegí servicio, profesional, fecha y hora como en un turno común.',
          'En "Repetir" elegí "Cada semana" (o cada cuántas semanas) y completá "Cantidad de turnos".',
          'Tocá "Crear … turnos". Para dar de baja la serie, abrí uno y tocá "Cancelar todos los próximos".',
        ],
      },
    ],
  },
  {
    slug: 'clientes',
    titulo: 'Clientes',
    descripcion: 'Tu base de clientes, su historial y cómo hacer que vuelvan.',
    lecciones: [
      {
        // pages/Customers.tsx:228-471
        slug: 'como-cargar-un-cliente',
        titulo: 'Cómo cargar un cliente',
        descripcion: 'Sumá a mano a un cliente con su teléfono para darle turnos y escribirle.',
        sinonimos: ['nuevo cliente', 'agregar cliente', 'base de clientes', 'contactos'],
        pasos: [
          'En el menú, abrí "Clientes y Servicios" y entrá a "Clientes".',
          'Tocá "Nuevo Cliente".',
          'Completá "Nombre", "Apellido", "Email" y "Teléfono". En "Notas" podés dejar lo que te sirva recordar.',
          'Tocá "Crear".',
        ],
      },
      {
        // pages/Customers.tsx:255,320 + components/customers/CustomerHistoryDrawer.tsx:120-125,244
        slug: 'como-ver-el-historial-de-un-cliente',
        titulo: 'Cómo ver el historial de un cliente',
        descripcion: 'Cuántas veces vino, cuánto gastó, cada cuánto vuelve y su próximo turno.',
        sinonimos: ['ficha', 'historial', 'buscar cliente', 'cliente frecuente', 'asistencias'],
        plan: 'Plan Pro',
        pasos: [
          'En "Clientes", buscalo con el buscador de arriba.',
          'Tocá su fila: se abre la ficha.',
          'Mirá "Turnos", "Asistencias", "Cancelados / ausentes", "Total gastado", "Viene cada" y "Próximo turno".',
        ],
      },
      {
        // pages/BookingCoupons.tsx:249-435
        slug: 'como-crear-un-cupon-de-descuento',
        titulo: 'Cómo crear un cupón de descuento',
        descripcion: 'Un código para una promo que tus clientes usan al reservar online.',
        sinonimos: ['cupón', 'descuento', 'promo', 'promoción', 'código'],
        plan: 'Desde Advance',
        pasos: [
          'En el menú, abrí "Clientes y Servicios" y entrá a "Cupones de descuento".',
          'Tocá "Nuevo cupón".',
          'Completá "Código" y "Descuento". Si querés limitarlo, usá "Tope de usos (opcional)" y "Vence (opcional)".',
          'Guardalo y tocá "Compartir por WhatsApp" para mandarlo.',
          'Cuando termine la promo, tocá "Desactivar".',
        ],
      },
      {
        // pages/BookingFormFields.tsx:261-428
        slug: 'como-pedir-datos-extra-al-reservar',
        titulo: 'Cómo pedir datos extra al reservar',
        descripcion: 'Sumá una pregunta propia al formulario de reserva (por ejemplo, alergias o largo del pelo).',
        sinonimos: ['formulario', 'pregunta', 'campo personalizado', 'datos del cliente', 'ficha previa'],
        plan: 'Desde Advance',
        pasos: [
          'En el menú, abrí "Configuración" y entrá a "Campos del formulario".',
          'Tocá "Agregar campo".',
          'En "Nuevo campo" escribí la "Pregunta o nombre del campo" y elegí el "Tipo de respuesta".',
          'Guardalo: aparece en el paso "Tus datos" de la reserva online y en "Detalles de la Cita".',
        ],
      },
    ],
  },
  {
    slug: 'cobros',
    titulo: 'Cobros y Mercado Pago',
    descripcion: 'Conectá tu Mercado Pago, elegí cómo cobrás y mirá lo que entró.',
    lecciones: [
      {
        // pages/MercadoPagoSettings.tsx:327-582
        slug: 'como-conectar-mercado-pago',
        titulo: 'Cómo conectar tu Mercado Pago',
        descripcion: 'Para cobrar señas online: la plata entra directo a tu cuenta.',
        sinonimos: ['mercado pago', 'cobrar online', 'conectar cuenta', 'link de pago', 'señas online'],
        pasos: [
          'En el menú, abrí "Configuración" y entrá a "MercadoPago".',
          'Tocá "Conectar con MercadoPago".',
          'Entrá con tu cuenta de Mercado Pago y aceptá el permiso.',
          'Al volver a TurnosPro, la cuenta aparece conectada.',
          'En "Configuración de Pagos" elegí el "Tiempo de expiración del link de pago" y tocá "Guardar Configuración".',
        ],
      },
      {
        // pages/Settings.tsx:1236-1339
        slug: 'como-elegir-los-medios-de-pago',
        titulo: 'Cómo elegir los medios de pago',
        descripcion: 'Efectivo, tarjeta o transferencia: lo que aceptás en tu negocio.',
        sinonimos: ['medios de pago', 'efectivo', 'transferencia', 'tarjeta', 'formas de pago'],
        pasos: [
          'Entrá a "Configuración" › "General" y abrí la pestaña "Pagos".',
          'Prendé los que aceptás: "Efectivo", "Tarjetas de crédito/débito" y "Transferencias bancarias".',
          'Elegí el "Método de pago predeterminado".',
          'Guardá los cambios.',
        ],
      },
      {
        // pages/Payments.tsx:291-701
        slug: 'como-ver-los-pagos-del-dia',
        titulo: 'Cómo ver los pagos del día',
        descripcion: 'Cuánto entró hoy, separado por efectivo, tarjeta y transferencia.',
        sinonimos: ['pagos', 'caja del día', 'cierre de caja', 'cobros', 'ingresos'],
        pasos: [
          'En el menú, abrí "Ventas e Inventario" y entrá a "Pagos".',
          'Arriba ves "Total del Día", "Efectivo", "Tarjeta" y "Transferencia".',
          'Cambiá la "Fecha" para ver otro día.',
          'Si te faltó cargar uno, tocá "Registrar Pago" y elegí el turno.',
        ],
      },
    ],
  },
  {
    slug: 'whatsapp',
    titulo: 'WhatsApp',
    descripcion: 'Recordatorios, confirmación y el asistente que contesta por vos.',
    lecciones: [
      {
        // pages/MessagingHub.tsx:11-46 + pages/WhatsAppSettings.tsx:176-330
        slug: 'como-conectar-el-whatsapp-del-negocio',
        titulo: 'Cómo conectar el WhatsApp del negocio',
        descripcion: 'Vinculá tu WhatsApp con un QR para que los mensajes salgan de tu número.',
        sinonimos: ['whatsapp', 'conectar whatsapp', 'qr', 'vincular', 'número del negocio'],
        plan: 'Desde Plus',
        pasos: [
          'En el menú, abrí "Configuración" y entrá a "Mensajería".',
          'En la pestaña "WhatsApp", tocá "Conectar WhatsApp".',
          'En tu celular abrí WhatsApp › Menú › Dispositivos vinculados › Vincular dispositivo.',
          'Escaneá el código QR de la pantalla. Si se venció, tocá "Actualizar QR".',
          'Cuando aparece "Conectado", tocá "Enviar mensaje de prueba".',
        ],
      },
      {
        // pages/MessagingSettings.tsx:62-133
        slug: 'como-activar-los-recordatorios',
        titulo: 'Cómo activar los recordatorios',
        descripcion: 'Un WhatsApp automático antes de cada turno para que nadie se olvide.',
        sinonimos: ['recordatorio', 'aviso', 'mensaje automático', 'ausencias', 'olvidos'],
        plan: 'Desde Plus',
        pasos: [
          'En "Mensajería", abrí la pestaña "Recordatorios".',
          'Prendé "Recordatorios por WhatsApp".',
          'En "Minutos antes de la cita" elegí con cuánta anticipación sale.',
          'Si querés, cambiá la "Plantilla de mensaje" (usá {customer_name}, {service_name}, {date} y {time}).',
          'Tocá "Guardar".',
        ],
      },
      {
        // pages/ConfirmationBot.tsx:272-535
        slug: 'como-activar-el-bot-de-confirmacion',
        titulo: 'Cómo activar el bot de confirmación',
        descripcion: 'Le pide al cliente que responda 1 o 2 y tu agenda se actualiza sola.',
        sinonimos: ['confirmación', 'confirmar turnos', 'bot', 'responder 1 o 2', 'cancelaciones'],
        plan: 'Desde Plus',
        pasos: [
          'En el menú, abrí "Configuración" y entrá a "Bot de Confirmación".',
          'Prendelo: tiene que decir "Bot activado".',
          'En "Pedir confirmación" poné cuánto antes y en "Unidad" elegí "horas antes".',
          'Si querés, cambiá el "Mensaje de confirmación" y mirá cómo queda en "Vista previa".',
          'Tocá "Guardar". Abajo vas a ver los "Enviados", "Confirmados", "Cancelados" y "Sin respuesta".',
        ],
      },
      {
        // pages/WhatsAppBot.tsx:179-246 + components/whatsapp/WhatsAppConnectionCard.tsx:104-146
        slug: 'como-activar-el-asistente-de-whatsapp',
        titulo: 'Cómo activar el asistente de WhatsApp',
        descripcion: 'Tus clientes reservan, ven y cancelan turnos solos, con un menú de números.',
        sinonimos: ['asistente', 'bot', 'contestar solo', 'respuestas automáticas', 'menú de whatsapp'],
        plan: 'Add-on desde Plus',
        pasos: [
          'En el menú, abrí "Configuración" y entrá a "Asistente de WhatsApp".',
          'Tocá "Activar con Mercado Pago" y completá el pago.',
          'Si tu WhatsApp no está conectado, escaneá el QR en "Conexión de WhatsApp" y tocá "Verificar conexión".',
          'Revisá que diga "Asistente prendido".',
        ],
      },
      {
        // pages/WhatsAppBot.tsx:239-320
        slug: 'como-configurar-el-asistente',
        titulo: 'Cómo configurar cómo atiende el asistente',
        descripcion: 'Con cuánta anticipación se reserva y se cancela, qué días ofrece y qué datos da.',
        sinonimos: ['configurar asistente', 'anticipación', 'cancelar con anticipación', 'dirección', 'probar bot'],
        plan: 'Add-on desde Plus',
        pasos: [
          'En "Asistente de WhatsApp", bajá a "Cómo atiende".',
          'Elegí "Anticipación mínima para reservar", "Anticipación para cancelar" y "Días hacia adelante que ofrece".',
          'En "Texto extra en «Servicios y precios» (opcional)" poné tu dirección o cómo llegar.',
          'Tocá "Guardar cambios".',
          'En "Probalo" escribí un mensaje y tocá "Probar" para ver qué contesta, sin mandar nada por WhatsApp.',
        ],
      },
    ],
  },
  {
    slug: 'numeros-y-plan',
    titulo: 'Números y plan',
    descripcion: 'Cómo viene el mes y cómo cambiar de plan.',
    lecciones: [
      {
        // pages/Dashboard.tsx:708-1176
        slug: 'como-leer-el-inicio',
        titulo: 'Cómo leer el inicio',
        descripcion: 'Lo que facturaste en el mes, la agenda de hoy y lo último que pasó.',
        sinonimos: ['inicio', 'resumen', 'facturación del mes', 'dashboard', 'panel'],
        pasos: [
          'Entrá a "Inicio".',
          'En "Resumen Financiero del Mes" mirá "Facturación Total", "Ganancia Neta" y "Crecimiento vs Mes Anterior".',
          'En "Agenda de Hoy" están los turnos del día.',
          'En "Actividad Reciente" ves las últimas reservas y cambios.',
        ],
      },
      {
        // pages/Reports.tsx:235-534
        slug: 'como-sacar-un-reporte',
        titulo: 'Cómo sacar un reporte',
        descripcion: 'Ingresos, clientes activos y servicios más pedidos por período, y bajarlo en CSV.',
        sinonimos: ['reporte', 'estadísticas', 'exportar', 'excel', 'csv', 'métricas'],
        pasos: [
          'En el menú, entrá a "Reportes".',
          'En "Período" elegí "Última semana", "Último mes", "Último año" o "Personalizado".',
          'Mirá "Ingresos Totales", "Clientes Activos", "Ticket Promedio" y "Servicios Más Solicitados".',
          'Tocá "Exportar CSV" para abrirlo en Excel.',
        ],
      },
      {
        // pages/SubscriptionManagement.tsx:185-430 + pages/SubscriptionPlans.tsx:576-625
        slug: 'como-cambiar-de-plan',
        titulo: 'Cómo cambiar de plan',
        descripcion: 'Pasate a Plus, Advance o Pro cuando necesites más, o volvé a Gratuito.',
        sinonimos: ['plan', 'suscripción', 'precio', 'mejorar plan', 'gratuito', 'pagar'],
        pasos: [
          'En el menú, abrí "Configuración" y entrá a "Suscripción".',
          'Tocá "Mejorar plan" (o "Cambiar plan" si ya pagás uno).',
          'En "Planes & precios" tocá "Pasarme a …" en el plan que querés.',
          'Completá el pago en "Completa tu Pago".',
        ],
      },
    ],
  },
  {
    slug: 'lo-que-ve-tu-cliente',
    titulo: 'Lo que ve tu cliente',
    descripcion: 'Cómo reserva, paga y cancela tu cliente, para que se lo puedas explicar.',
    lecciones: [
      {
        // pages/public/BookingPage.tsx:62,701-1210,1622-1719
        slug: 'como-reserva-tu-cliente-online',
        titulo: 'Cómo reserva tu cliente online',
        descripcion: 'El camino de tu cliente desde tu link hasta el turno confirmado.',
        sinonimos: ['reserva online', 'cliente reserva', 'página de reservas', 'book', 'sacar turno online'],
        para: 'cliente',
        pasos: [
          'Tu cliente abre tu link de reservas desde el celular.',
          'En "Elegí el servicio" toca el servicio (puede usar "Buscar servicio...").',
          'En "¿Con quién?" elige al profesional.',
          'En "Fecha y hora" elige el día y uno de los horarios libres.',
          'En "Tus datos" completa "Nombre completo", "Email" y "Teléfono".',
          'En "Revisá el turno" chequea todo y toca "Confirmar Reserva". Le aparece "Turno confirmado" con su "Código de confirmación".',
        ],
      },
      {
        // pages/public/BookingPage.tsx:1416-1438,1691-1710
        slug: 'como-paga-la-sena-tu-cliente',
        titulo: 'Cómo paga la seña tu cliente',
        descripcion: 'Si el servicio pide seña, tu cliente la paga con Mercado Pago al reservar.',
        sinonimos: ['pagar seña', 'pago online', 'mercado pago cliente', 'adelanto'],
        para: 'cliente',
        pasos: [
          'En "Revisá el turno" tu cliente toca "Confirmar Reserva" y después "Pagar ahora".',
          'En "Pago de la seña" toca "Generar pago" y después "Pagar ahora con MercadoPago".',
          'Paga en Mercado Pago y vuelve a tu página: el turno queda confirmado y la plata, en tu cuenta.',
        ],
      },
      {
        // pages/public/BookingPage.tsx:1303-1320
        slug: 'como-usa-un-cupon-tu-cliente',
        titulo: 'Cómo usa un cupón tu cliente',
        descripcion: 'Dónde carga tu cliente el código de descuento que le mandaste.',
        sinonimos: ['usar cupón', 'código de descuento', 'promo cliente'],
        para: 'cliente',
        plan: 'Desde Advance',
        pasos: [
          'En "Revisá el turno", tu cliente toca "¿Tenés un cupón?".',
          'Escribe el código y toca "Aplicar". El descuento se ve en el total.',
          'Si se equivocó, toca "Quitar cupón".',
        ],
      },
      {
        // Services/WhatsAppMenuBotService.cs:701-724 (backend) + pages/WhatsAppBot.tsx:201
        slug: 'como-saca-turno-tu-cliente-por-whatsapp',
        titulo: 'Cómo saca turno tu cliente por WhatsApp',
        descripcion: 'Con el asistente prendido, tu cliente reserva escribiéndole a tu WhatsApp.',
        sinonimos: ['turno por whatsapp', 'asistente', 'menú', 'reservar por whatsapp'],
        para: 'cliente',
        plan: 'Add-on desde Plus',
        pasos: [
          'Tu cliente le escribe a tu WhatsApp, por ejemplo "quiero un turno", o "menu" para ver las opciones.',
          'El asistente le muestra el menú: "1️⃣ Reservar un turno", "2️⃣ Ver mis turnos", "3️⃣ Cancelar un turno", "4️⃣ Servicios y precios" y "5️⃣ Hablar con el negocio".',
          'Para reservar responde con números: servicio, profesional, día y horario. Solo le ofrece horarios libres.',
          'Si es la primera vez, le pide el nombre. Confirma con "1" y le llega "✅ ¡Turno confirmado!".',
          'Si el servicio pide seña y tenés Mercado Pago conectado, le manda el link para pagarla.',
        ],
      },
      {
        // Controllers/WebhooksController.cs:688-713 + Services/WhatsAppMenuBotService.cs:572-665 (backend)
        slug: 'como-cancela-tu-cliente-un-turno',
        titulo: 'Cómo cancela tu cliente un turno',
        descripcion: 'Tu cliente cancela por WhatsApp y el horario se libera solo.',
        sinonimos: ['cancelar turno', 'cliente cancela', 'no puede venir', 'liberar horario'],
        para: 'cliente',
        plan: 'Desde Plus',
        pasos: [
          'Si le llegó el pedido de confirmación, responde "2" (o algo como "no llego") y el turno se cancela.',
          'Con el asistente prendido, también puede escribir "cancelar" o elegir "3️⃣ Cancelar un turno".',
          'Elige cuál, confirma con "1) Sí, cancelar" y le llega "✅ Listo, cancelé tu turno".',
          'Solo puede cancelar por WhatsApp hasta las horas que pusiste en "Anticipación para cancelar". Más cerca, el asistente le pide que hable con vos.',
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------

export interface LeccionNumerada extends Leccion {
  numero: number;
  modulo: Modulo;
  moduloNumero: number;
}

export const LECCIONES: LeccionNumerada[] = MODULOS.flatMap((m, mi) => m.lecciones.map((l) => ({ ...l, modulo: m, moduloNumero: mi + 1, numero: 0 }))).map(
  (l, i) => ({ ...l, numero: i + 1 }),
);

export function leccionPorSlug(slug: string) {
  return LECCIONES.find((l) => l.slug === slug);
}

/** "1:05" → 65 segundos. */
function segundos(d: string) {
  const [m, s] = d.split(':').map((x) => parseInt(x, 10) || 0);
  return m * 60 + s;
}

export function totalesDelCurso() {
  const conVideo = LECCIONES.filter((l) => l.video);
  const seg = conVideo.reduce((acc, l) => acc + segundos(l.video!.duracion), 0);
  return {
    modulos: MODULOS.length,
    lecciones: LECCIONES.length,
    /** null mientras no haya ningún video: no se muestran minutos. */
    minutos: conVideo.length > 0 ? Math.max(1, Math.round(seg / 60)) : null,
  };
}

/*
 * ===================================================================================================
 * GUION DE GRABACIÓN (fase 2). Grabar en la cuenta demo, pantalla real, sin datos de clientes reales.
 * Datos demo: negocio "Estudio Lila" (peluquería, Palermo), profesionales Belén y Mica, servicios
 * "Corte y brushing" ($12.000, 45 min, seña 30%) y "Color completo" ($38.000, 120 min), clientas
 * "Sofía Díaz" y "Laura Gómez" con teléfonos de prueba. Cada video < 1:20, en 1080p, cursor visible.
 * ===================================================================================================
 *
 * M1 Primeros pasos
 *  1 como-completar-tu-perfil: cuenta nueva recién registrada → /completar-perfil. Escribir "Eric" y
 *    "Estudio Lila" → Siguiente » → Peluquería, 50-100, WhatsApp → subir logo, paleta "Natural — bosque y
 *    coral" → teléfono → "Ir al panel" → mostrar 2 pasos del recorrido y "Saltar".
 *  2 como-cargar-los-datos-del-negocio: Configuración › General, pestaña General. Completar dirección
 *    "Gorriti 4800, Palermo", revisar zona horaria → Guardar Configuración General.
 *  3 como-configurar-los-horarios-del-negocio: pestaña Servicios → Horarios del negocio 10:00-20:00,
 *    marcar domingo y lunes en Días cerrados → Guardar horarios.
 *  4 como-compartir-tu-link-de-reservas: Inicio → tarjeta del link → Copiar → (corte) pegarlo en la bio
 *    de un Instagram de prueba.
 *  5 como-cambiar-los-colores-de-tu-pagina: (cuenta en Plus) Integraciones → Abrir Tema → cambiar Color
 *    Primario → Guardar Cambios → abrir /book en otra pestaña para mostrar el cambio.
 *
 * M2 Servicios y equipo
 *  6 como-crear-un-servicio: Servicios → Nuevo Servicio → "Corte y brushing", $12.000, 45 → Crear.
 *  7 como-pedir-sena-en-un-servicio: Editar "Corte y brushing" → Requiere seña → Porcentaje 30 →
 *    Política "Solo clientes nuevos" → Guardar.
 *  8 como-ordenar-los-servicios-por-categoria: Nueva categoría "Color" → asignarla a "Color completo".
 *  9 como-sumar-un-profesional: Empleados → Nuevo Empleado → "Mica", email y teléfono de prueba → Crear.
 * 10 como-cargar-los-horarios-de-un-profesional: ícono Horarios de Mica → martes 10:00-19:00 → Repetir en
 *    todos los días → borrar domingo → descanso 14:00-15:00 → Guardar.
 * 11 como-bloquear-un-horario: Agenda › Bloqueos → Nuevo → Belén, Puntual, viernes 15:00-17:00, "Trámite"
 *    → Guardar → mostrarlo en la vista Semana.
 * 12 como-darle-acceso-a-tu-equipo: Configuración › Equipo → Agregar usuario → mica@ejemplo (de prueba),
 *    Rol Empleado → Crear usuario.
 *
 * M3 Agenda y turnos
 * 13 como-usar-la-agenda: Agenda con ~10 turnos cargados en la semana → Día / Semana / Mes → filtro
 *    Empleado "Belén" → filtro Estado "Confirmado".
 * 14 como-dar-un-turno: Nuevo › Nueva Reserva → Corte y brushing → Belén → miércoles 15:30 → Cliente
 *    Existente "Sofía Díaz" → Confirmar Reserva → ver el turno en la agenda.
 * 15 como-mover-un-turno: vista Semana → arrastrar el turno de Sofía de 15:30 a 17:00 → estirarlo 30 min.
 * 16 como-confirmar-o-completar-un-turno: tocar un turno pendiente → Confirmar → otro confirmado →
 *    Completar.
 * 17 como-cobrar-un-turno: turno completado → Registrar Pago → Belén, $12.000, propina $1.000, Efectivo.
 * 18 como-cargar-un-turno-fijo: (cuenta en Advance) Turnos fijos → Nuevo turno fijo → Laura Gómez, jueves
 *    18:00, Cada semana, 8 turnos → Crear 8 turnos → mostrar la serie en Mes.
 *
 * M4 Clientes
 * 19 como-cargar-un-cliente: Clientes → Nuevo Cliente → "Laura Gómez" + teléfono de prueba → Crear.
 * 20 como-ver-el-historial-de-un-cliente: (cuenta en Pro, Sofía con 6+ turnos pasados) buscar "Sofía" →
 *    abrir la ficha → recorrer los números.
 * 21 como-crear-un-cupon-de-descuento: (Advance) Nuevo cupón "VUELVE10", 10%, tope 20 → Compartir por
 *    WhatsApp (mostrar el mensaje armado, no enviarlo).
 * 22 como-pedir-datos-extra-al-reservar: (Advance) Agregar campo "¿Tenés alguna alergia?" → mostrar el
 *    campo en /book en el paso Tus datos.
 *
 * M5 Cobros
 * 23 como-conectar-mercado-pago: cuenta demo sin MP → Conectar con MercadoPago → login de una cuenta de
 *    prueba de MP → volver conectado. (Necesita una cuenta MP de prueba/sandbox para grabar.)
 * 24 como-elegir-los-medios-de-pago: pestaña Pagos → prender Efectivo y Transferencias → guardar.
 * 25 como-ver-los-pagos-del-dia: Ventas e Inventario › Pagos con 3-4 pagos cargados hoy → cambiar Fecha.
 *
 * M6 WhatsApp (cuenta en Plus con un WhatsApp de prueba; NO usar la línea de ventas ni números reales)
 * 26 como-conectar-el-whatsapp-del-negocio: Mensajería › WhatsApp → Conectar WhatsApp → escanear con el
 *    celu de prueba (grabar el celu aparte) → Conectado → Enviar mensaje de prueba.
 * 27 como-activar-los-recordatorios: pestaña Recordatorios → prender → 60 minutos → Guardar → mostrar el
 *    recordatorio que llega al celu de prueba (turno de prueba a +65 min).
 * 28 como-activar-el-bot-de-confirmacion: Bot de Confirmación → activar → 24 horas antes → Vista previa →
 *    Guardar → mostrar en el celu responder "1" y el turno pasar a Confirmado.
 * 29 como-activar-el-asistente-de-whatsapp: Asistente de WhatsApp → Activar con Mercado Pago (cuenta de
 *    prueba o add-on activado desde superadmin) → Asistente prendido.
 * 30 como-configurar-el-asistente: Cómo atiende → 1 h / 24 h / 7 días → texto de dirección → Guardar
 *    cambios → Probalo: escribir "hola" y "quiero un turno" → Probar.
 *
 * M7 Números y plan
 * 31 como-leer-el-inicio: Inicio con un mes de datos demo → recorrer las tarjetas.
 * 32 como-sacar-un-reporte: Reportes → Último mes → Exportar CSV → abrir el CSV.
 * 33 como-cambiar-de-plan: Suscripción → Mejorar plan → Planes & precios → Pasarme a Plus → mostrar
 *    "Completa tu Pago" y cerrar sin pagar.
 *
 * M8 Lo que ve tu cliente (grabar en el celular o en vista mobile)
 * 34 como-reserva-tu-cliente-online: estudiolila…/book → Corte y brushing → Belén → miércoles 17:00 → datos
 *    de Laura → Confirmar Reserva → pantalla Turno confirmado.
 * 35 como-paga-la-sena-tu-cliente: servicio con seña → Generar pago → Pagar ahora con MercadoPago → pago
 *    con tarjeta de prueba de MP → volver confirmado.
 * 36 como-usa-un-cupon-tu-cliente: Revisá el turno → ¿Tenés un cupón? → "VUELVE10" → Aplicar.
 * 37 como-saca-turno-tu-cliente-por-whatsapp: celu de prueba → "quiero un turno" → 2 → 1 → 3 → 4 →
 *    nombre → 1 → mostrar el turno nuevo en la agenda.
 * 38 como-cancela-tu-cliente-un-turno: celu de prueba → "cancelar" → 1 → 1 → mostrar que se liberó el
 *    horario; después, responder "2" a un pedido de confirmación.
 */
