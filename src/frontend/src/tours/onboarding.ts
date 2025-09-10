// Lightweight Shepherd tour setup. If Shepherd isn't installed yet,
// this will no-op gracefully.

export async function startOnboardingTour() {
  // Helper to load a script/link dynamically
  const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(el);
  });
  const loadCss = (href: string) => {
    return new Promise<void>((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = () => resolve();
      document.head.appendChild(link);
    });
  };

  try {
    let ShepherdLib: any | null = null;
    try {
      // Try local dependency first
      ShepherdLib = (await import('shepherd.js')).default as any;
      await import('shepherd.js/dist/css/shepherd.css');
    } catch (err) {
      // Fallback: load from CDN if not installed locally
      await Promise.all([
        loadCss('https://unpkg.com/shepherd.js@13.0.0/dist/css/shepherd.css'),
        loadScript('https://unpkg.com/shepherd.js@13.0.0/dist/js/shepherd.min.js'),
      ]);
      ShepherdLib = (window as any).Shepherd || null;
    }

    if (!ShepherdLib) {
      console.warn('[Onboarding] Shepherd no disponible tras intentar import/CDN.');
      return;
    }

    const tour = new ShepherdLib.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        cancelIcon: { enabled: true },
        classes: 'shepherd-theme-arrows',
        scrollTo: { behavior: 'smooth', block: 'center' },
      },
    });

    const steps: Array<{ id: string; text: string; attachTo?: { element: string; on: string } }> = [
      {
        id: 'welcome',
        text: 'Bienvenido a Turnos Pro 👋\nTe mostramos lo esencial en 60 segundos.',
      },
      {
        id: 'sidebar',
        text: 'Este es tu menú principal. Desde acá navegás la plataforma.',
        attachTo: { element: '#tp-sidebar', on: 'right' },
      },
      {
        id: 'calendar',
        text: 'Accedé a tu Calendario para ver y gestionar turnos.',
        attachTo: { element: '#tp-menu-calendar', on: 'right' },
      },
      {
        id: 'customers',
        text: 'Acá están tus Clientes: historial, datos y nuevas altas.',
        attachTo: { element: '#tp-menu-customers', on: 'right' },
      },
      {
        id: 'copy-link',
        text: 'Copiá tu link de reservas y compartilo por WhatsApp o Instagram.',
        attachTo: { element: '#tp-copy-link', on: 'bottom' },
      },
      {
        id: 'settings',
        text: 'En Configuración podés ajustar servicios, pagos y apariencia.',
        attachTo: { element: '#tp-menu-settings', on: 'right' },
      },
    ];

    steps.forEach((s, idx) => {
      tour.addStep({
        id: s.id,
        text: s.text,
        attachTo: s.attachTo,
        buttons: [
          { text: 'Saltar', action: tour.cancel, secondary: true },
          { text: idx === steps.length - 1 ? 'Terminar' : 'Siguiente', action: tour.next },
        ],
      });
    });

    tour.start();
  } catch (e) {
    console.warn('[Onboarding] Shepherd no disponible; omitiendo tour.', e);
  }
}
