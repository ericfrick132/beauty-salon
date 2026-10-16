/**
 * Look por rubro: paleta, tipografía de títulos y fotos propias (public/looks/<rubro>/) de cada tipo de
 * negocio del onboarding. El wizard lo aplica apenas el dueño elige el rubro en "Contanos de tu estudio",
 * se guarda como tema del negocio y lo usan el panel y la página pública de reservas.
 *
 * Las claves son los valores de "¿Qué tipo de negocio tenés?" (Tenant.BusinessKind en el backend).
 */

export type BusinessKind =
  | 'barberia'
  | 'salon_belleza'
  | 'estetica'
  | 'spa'
  | 'manicuria'
  | 'peluqueria_canina'
  | 'otro';

export interface BusinessLook {
  kind: BusinessKind;
  /** Nombre de la paleta en "Personalizá tu marca". */
  presetLabel: string;
  palette: {
    paper: string;
    paperRule: string;
    ink: string;
    inkSoft: string;
    inkFaint: string;
    primary: string;
    primaryInk: string;
    secondary: string;
    overlay: string;
  };
  /** Tipografía de títulos (el cuerpo sigue siendo Space Grotesk). Cargada en public/index.html. */
  displayFont: string;
  images: {
    bg: string;
    steps: Record<1 | 2 | 3 | 4 | 5, string>;
  };
  /** Alt de las fotos (manifest de public/looks); se completa al cargar el manifest. */
  alts?: Partial<Record<'bg' | 'step1' | 'step2' | 'step3' | 'step4' | 'step5', string>>;
}

const img = (kind: BusinessKind) => ({
  bg: `/looks/${kind}/bg.jpg`,
  steps: {
    1: `/looks/${kind}/step1.jpg`,
    2: `/looks/${kind}/step2.jpg`,
    3: `/looks/${kind}/step3.jpg`,
    4: `/looks/${kind}/step4.jpg`,
    5: `/looks/${kind}/step5.jpg`,
  },
});

const SERIF = (family: string) => `"${family}", Georgia, "Times New Roman", serif`;

export const BUSINESS_LOOKS: Record<BusinessKind, BusinessLook> = {
  barberia: {
    kind: 'barberia',
    presetLabel: 'Barbería — bordó y bronce',
    palette: {
      paper: '#EFE9E1', paperRule: 'rgba(20, 20, 20, 0.16)', ink: '#141414', inkSoft: '#4A4440', inkFaint: '#857C74',
      primary: '#7A1F1F', primaryInk: '#F5EFE6', secondary: '#B8893B', overlay: 'rgba(20, 20, 20, 0.45)',
    },
    displayFont: '"Oswald", "Arial Narrow", sans-serif',
    images: img('barberia'),
    alts: { bg: "Barbería vintage con sillón de cuero, pared de ladrillo y luces cálidas", step1: "Barbero haciendo un degradé con máquina en la nuca", step2: "Barbero emprolijando el corte con tijera de entresacar y peine", step3: "Tijeras, peine y productos de barbería sobre la mesa", step4: "Manos tatuadas de barbero repasando el corte con máquina", step5: "Sillón clásico de barbería en un local en penumbra" },
  },
  salon_belleza: {
    kind: 'salon_belleza',
    presetLabel: 'Salón — rosa empolvado',
    palette: {
      paper: '#F7EEEA', paperRule: 'rgba(43, 27, 30, 0.14)', ink: '#2B1B1E', inkSoft: '#62494D', inkFaint: '#9A8286',
      primary: '#A8475F', primaryInk: '#FFF8F5', secondary: '#E3B7AC', overlay: 'rgba(43, 27, 30, 0.34)',
    },
    displayFont: SERIF('Cormorant Garamond'),
    images: img('salon_belleza'),
    alts: { bg: "Peluquería con hilera de sillones y lámparas colgantes", step1: "Peluquera haciendo un brushing con secador y cepillo redondo", step2: "Lavado de cabello en el lavacabezas de la peluquería", step3: "Peluquera armando ondas con buclera", step4: "Estilista armando un recogido a una clienta en el salón", step5: "Cabello largo con mechas rubias y ondas suaves" },
  },
  estetica: {
    kind: 'estetica',
    presetLabel: 'Estética — salvia y arena',
    palette: {
      paper: '#F1F3EE', paperRule: 'rgba(29, 36, 32, 0.14)', ink: '#1D2420', inkSoft: '#4E5A53', inkFaint: '#87918A',
      primary: '#4F7462', primaryInk: '#F5F7F2', secondary: '#D6C2A3', overlay: 'rgba(29, 36, 32, 0.32)',
    },
    displayFont: SERIF('Fraunces'),
    images: img('estetica'),
    alts: { bg: "Gabinete de estética luminoso con sillones de tratamiento blancos", step1: "Cosmetóloga aplicando una máscara facial con pincel", step2: "Tratamiento facial con aparatología en el gabinete", step3: "Productos de skincare sobre una mesa dorada", step4: "Cosmetóloga masajeando el rostro de una clienta", step5: "Pincel aplicando crema durante una limpieza facial" },
  },
  spa: {
    kind: 'spa',
    presetLabel: 'Spa — agua y piedra',
    palette: {
      paper: '#EEF2F0', paperRule: 'rgba(19, 32, 31, 0.14)', ink: '#13201F', inkSoft: '#46595A', inkFaint: '#839493',
      primary: '#2E6B66', primaryInk: '#F2F7F5', secondary: '#C9DDD8', overlay: 'rgba(19, 32, 31, 0.36)',
    },
    displayFont: SERIF('Cormorant Garamond'),
    images: img('spa'),
    alts: { bg: "Masaje con piedras calientes en una sala de spa en penumbra", step1: "Masajista volcando aceite en la mano antes del masaje", step2: "Piedras calientes sobre la espalda entre flores blancas", step3: "Difusor de aromas, toalla enrollada y velas encendidas", step4: "Manos de masajista trabajando la espalda con luz natural", step5: "Vela encendida sobre un banco de madera junto a la camilla" },
  },
  manicuria: {
    kind: 'manicuria',
    presetLabel: 'Manicuría — fucsia y nácar',
    palette: {
      paper: '#FBF1F3', paperRule: 'rgba(42, 21, 32, 0.14)', ink: '#2A1520', inkSoft: '#614552', inkFaint: '#9C8290',
      primary: '#B5175A', primaryInk: '#FFF6F9', secondary: '#F3C1D3', overlay: 'rgba(42, 21, 32, 0.32)',
    },
    displayFont: SERIF('DM Serif Display'),
    images: img('manicuria'),
    alts: { bg: "Estantes con esmaltes de colores en un salón de uñas", step1: "Manicura trabajando las cutículas de una clienta", step2: "Esmaltado de uñas en tono bordó", step3: "Lima y palitos de manicuría sobre una toalla", step4: "Manicura con guantes preparando las uñas junto a la lámpara", step5: "Uñas negras y carey con anillo dorado" },
  },
  peluqueria_canina: {
    kind: 'peluqueria_canina',
    presetLabel: 'Peluquería canina — naranja y cielo',
    palette: {
      paper: '#FFF6E8', paperRule: 'rgba(30, 26, 20, 0.14)', ink: '#1E1A14', inkSoft: '#57503F', inkFaint: '#958C78',
      primary: '#D4691A', primaryInk: '#FFF9F0', secondary: '#4A86B8', overlay: 'rgba(30, 26, 20, 0.30)',
    },
    displayFont: '"Fredoka", "Space Grotesk", system-ui, sans-serif',
    images: img('peluqueria_canina'),
    alts: { bg: "Peluquero canino emprolijando con tijera a un perrito blanco", step1: "Peluquero cepillando a un spitz blanco sobre la mesa", step2: "Pomerania secándose con una toalla rosa después del baño", step3: "Perro en la bañera esperando su toalla", step4: "Perro secándose con un guante de microfibra tras el baño", step5: "Perrito mojado durante el baño" },
  },
  otro: {
    kind: 'otro',
    presetLabel: 'Natural — bosque y coral',
    palette: {
      paper: '#F4EFE6', paperRule: 'rgba(23, 20, 16, 0.14)', ink: '#171410', inkSoft: '#5C5347', inkFaint: '#8C8275',
      primary: '#1E5E3F', primaryInk: '#F4EFE6', secondary: '#E8593C', overlay: 'rgba(23, 20, 16, 0.34)',
    },
    displayFont: SERIF('Fraunces'),
    images: img('otro'),
    alts: { bg: "Consultorio cálido con escritorio de madera y luz natural", step1: "Sillón junto a la ventana con plantas en un estudio tranquilo", step2: "Profesional atendiendo a una clienta en el escritorio", step3: "Persona anotando turnos en una agenda", step4: "Sala de espera luminosa con sillas blancas y plantas", step5: "Calendario enmarcado sobre un escritorio ordenado" },
  },
};

export const isBusinessKind = (v: unknown): v is BusinessKind =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(BUSINESS_LOOKS, v);

/** Look del rubro, o null si todavía no eligió (el wizard usa el de la marca TurnosPro). */
export const lookFor = (kind?: string | null): BusinessLook | null => (isBusinessKind(kind) ? BUSINESS_LOOKS[kind] : null);

/**
 * Tema del negocio a partir del look del rubro y la marca elegida en el onboarding: lo guarda
 * /ThemeConfiguration (ThemeOverrides) y lo leen el panel y la página pública de reservas.
 * Todos los colores en hex: el backend valida ese formato.
 */
export const themeFromLook = (look: BusinessLook, primary: string, secondary: string) => ({
  primaryColor: primary,
  secondaryColor: secondary,
  accentColor: secondary,
  backgroundColor: look.palette.paper,
  surfaceColor: '#FFFFFF',
  errorColor: '#DC2626',
  warningColor: '#D97706',
  infoColor: primary,
  successColor: '#16A34A',
  textPrimaryColor: look.palette.ink,
  textSecondaryColor: look.palette.inkSoft,
  borderColor: '#E5E0D8',
  fontFamily: '"Space Grotesk", Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  headingFontFamily: look.displayFont,
  borderRadius: 10,
  useShadows: true,
  autoContrastText: true,
});

/**
 * Rubro de un negocio que todavía no lo eligió en el onboarding (los que se dieron de alta antes del look
 * por rubro): se deduce del vertical. Lavaderos y deportes quedan sin look: ninguna foto les corresponde.
 */
const VERTICAL_TO_KIND: Record<string, BusinessKind> = {
  barbershop: 'barberia',
  peluqueria: 'salon_belleza',
  beautysalon: 'salon_belleza',
  aesthetics: 'estetica',
  depilation: 'estetica',
  nailsalon: 'manicuria',
  consulting: 'otro',
};

/** Look del negocio: el rubro que eligió, o el que corresponde a su vertical. */
export const lookForTenant = (businessKind?: string | null, vertical?: string | null): BusinessLook | null =>
  lookFor(businessKind) ?? (vertical ? lookFor(VERTICAL_TO_KIND[vertical]) : null);
