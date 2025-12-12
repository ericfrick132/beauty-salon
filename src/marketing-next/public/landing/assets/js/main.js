// Sticky header shadow on scroll
(function() {
  const header = document.querySelector('.site-header');
  const onScroll = () => {
    if (window.scrollY > 8) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// Mobile nav toggle
(function(){
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    nav.style.display = open ? 'none' : 'flex';
  });
})();

// Year in footer
(function(){
  const y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());
})();

// Lead form real-time validation
(function(){
  const form = document.getElementById('lead-form');
  if (!form) return;
  const email = form.querySelector('#email');
  const hint = form.querySelector('#email-hint');
  function validate() {
    if (!email.value) { hint.textContent = ''; return false; }
    const ok = /\S+@\S+\.\S+/.test(email.value);
    hint.textContent = ok ? '✓ Email válido' : 'Ingresa un email válido';
    hint.style.color = ok ? '#22c55e' : '#b91c1c';
    return ok;
  }
  email.addEventListener('input', validate);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate()) return;
    alert('¡Listo! Te contactaremos en breve.');
    form.reset();
    hint.textContent = '';
  });
})();

// Logos: carousel if < 10, grid if >= 10
(function(){
  const container = document.querySelector('.logo-view');
  const track = document.querySelector('.logo-track');
  if (!container || !track) return;
  const items = track.querySelectorAll('img');
  if (items.length >= 10) {
    container.dataset.mode = 'grid';
    track.style.animation = 'none';
    track.style.display = 'grid';
    track.style.gridTemplateColumns = 'repeat(auto-fit, minmax(120px, 1fr))';
  } else {
    track.innerHTML = track.innerHTML + track.innerHTML;
  }
})();

// Fetch and render plans from backend
(function(){
  const grid = document.getElementById('plans-grid');
  const template = document.getElementById('plan-card-template');
  if (!grid || !template) return;

  const status = document.getElementById('plans-status');
  const normalizeBase = (value) => {
    if (!value) return '';
    return value.endsWith('/') ? value.slice(0, -1) : value;
  };

  const apiBase = normalizeBase(
    document.querySelector('meta[name="api-base"]')?.content ||
    window.__API_BASE ||
    ''
  );
  const endpoint = `${apiBase}/api/subscription/plans`;
  const numberFormatter = new Intl.NumberFormat('es-AR');

  const formatCurrency = (amount, currency) => {
    const curr = currency && currency.trim() ? currency.toUpperCase() : 'ARS';
    try {
      return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: curr,
        maximumFractionDigits: curr === 'USD' ? 2 : 0
      }).format(amount);
    } catch {
      return `$${amount}`;
    }
  };

  const buildFeatures = (plan) => {
    const features = [];
    if (typeof plan.maxBookingsPerMonth === 'number') {
      features.push(
        plan.maxBookingsPerMonth < 0
          ? 'Reservas ilimitadas'
          : `${numberFormatter.format(plan.maxBookingsPerMonth)} reservas/mes`
      );
    }
    if (typeof plan.maxStaff === 'number') {
      features.push(
        plan.maxStaff < 0
          ? 'Equipo ilimitado'
          : `Hasta ${numberFormatter.format(plan.maxStaff)} colaboradores`
      );
    }
    if (typeof plan.maxServices === 'number') {
      features.push(
        plan.maxServices < 0
          ? 'Servicios ilimitados'
          : `${numberFormatter.format(plan.maxServices)} servicios activos`
      );
    }
    features.push(plan.allowOnlinePayments ? 'Cobros online y señas' : 'Sin cobros online');
    if (plan.allowWhatsApp) {
      let whatsappText = plan.whatsAppMonthlyLimit < 0
        ? 'WhatsApp ilimitado'
        : `${numberFormatter.format(plan.whatsAppMonthlyLimit)} mensajes WhatsApp/mes`;
      if (plan.whatsAppExtraMessageCost > 0 && plan.whatsAppMonthlyLimit > 0) {
        whatsappText += ` (+${formatCurrency(plan.whatsAppExtraMessageCost, plan.currency)} extra)`;
      }
      features.push(whatsappText);
    } else {
      features.push('Recordatorios por email');
    }
    if (plan.allowReports) features.push('Reportes y métricas');
    if (plan.allowMultiLocation) features.push('Multi-sucursal');
    if (plan.allowCustomBranding) features.push('Marca blanca disponible');

    return features;
  };

  const setStatus = (text) => {
    if (!status) return;
    status.textContent = text || '';
    status.style.display = text ? 'block' : 'none';
  };

  const renderPlans = (plans) => {
    grid.innerHTML = '';

    plans.forEach((plan) => {
      const node = template.content.cloneNode(true);
      const card = node.querySelector('.price-card');
      const flag = card.querySelector('.flag');
      const name = card.querySelector('.plan-name');
      const amount = card.querySelector('.amount');
      const per = card.querySelector('.per');
      const note = card.querySelector('.plan-note');
      const desc = card.querySelector('.plan-desc');
      const featList = card.querySelector('.feat-list');
      const cta = card.querySelector('.plan-cta');

      if (plan.isPopular) card.classList.add('recommended');
      if (flag) flag.style.display = plan.isPopular ? 'inline-flex' : 'none';

      if (name) name.textContent = plan.name || plan.code;
      if (amount) amount.textContent = formatCurrency(plan.price, plan.currency);
      if (per) per.textContent = '/mes';

      if (note) {
        if (plan.trialDays > 0) {
          note.textContent = `${plan.trialDays} días de prueba`;
          note.style.display = 'block';
        } else {
          note.style.display = 'none';
        }
      }

      if (desc) {
        if (plan.description) {
          desc.textContent = plan.description;
          desc.style.display = 'block';
        } else {
          desc.style.display = 'none';
        }
      }

      if (featList) {
        featList.innerHTML = '';
        buildFeatures(plan).forEach((feature) => {
          const li = document.createElement('li');
          li.textContent = feature;
          featList.appendChild(li);
        });
      }

      if (cta) {
        cta.textContent = plan.isPopular ? 'Probar gratis' : 'Elegir plan';
        cta.dataset.plan = plan.code;
        cta.href = '#cta';
      }

      grid.appendChild(node);
    });
  };

  async function loadPlans() {
    setStatus('Cargando planes...');
    try {
      const response = await fetch(endpoint, {
        headers: { Accept: 'application/json' },
        cache: 'no-cache'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const plans = await response.json();
      if (!Array.isArray(plans) || plans.length === 0) {
        setStatus('No hay planes disponibles por ahora.');
        return;
      }
      renderPlans(plans);
      setStatus('');
    } catch (error) {
      console.error('Error al cargar planes', error);
      setStatus('No pudimos cargar los planes. Intenta nuevamente en unos minutos.');
    }
  }

  loadPlans();
})();

// Business type modal (Crear cuenta gratuita)
(function(){
  const modal = document.getElementById('business-modal');
  const feedback = document.getElementById('business-modal-feedback');
  if (!modal) return;

  const closeEls = modal.querySelectorAll('[data-close-business-modal]');
  const triggers = document.querySelectorAll('[data-open-business-modal]');
  const optionButtons = modal.querySelectorAll('[data-business-value]');
  const htmlBody = document.body;
  const focusTarget = modal.querySelector('.modal-card');

  const open = () => {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    htmlBody.classList.add('no-scroll');
    (focusTarget || modal).focus?.();
  };

  const close = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    htmlBody.classList.remove('no-scroll');
  };

  triggers.forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      open();
    });
  });

  closeEls.forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      close();
    });
  });

  optionButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.businessValue;
      if (value) {
        try {
          localStorage.setItem('tp_vertical_pref', value);
        } catch {}
      }
      if (feedback) {
        feedback.textContent = `Guardamos tu preferencia: ${btn.textContent || value || ''}.`;
      }
      close();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) close();
  });
})();

// A/B testing hooks (placeholder)
(function(){
  window.__ab = { set(id, text){ const el = document.querySelector('[data-ab="' + id + '"]'); if (el) el.textContent = text; } };
})();

window.__HEATMAP_ENABLED = true;
