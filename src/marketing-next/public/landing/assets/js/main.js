const normalizeBase = (value) => {
  if (!value) return '';
  const trimmed = value.trim();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
};

const API_BASE = (() => {
  const raw = document.querySelector('meta[name="api-base"]')?.content || window.__API_BASE || '';
  const base = normalizeBase(raw);
  return base.endsWith('/api') ? base.slice(0, -4) : base;
})();

const apiUrl = (path) => {
  const cleaned = path.startsWith('/') ? path : `/${path}`;
  if (cleaned.startsWith('/api')) return `${API_BASE}${cleaned}`;
  return `${API_BASE}/api${cleaned}`;
};

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
  const endpoint = apiUrl('/subscription/plans');
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

// Signup modal (multi-step self registration)
(function(){
  const modal = document.getElementById('signup-modal');
  if (!modal) return;

  const htmlBody = document.body;
  const triggers = document.querySelectorAll('[data-open-signup]');
  const closeEls = modal.querySelectorAll('[data-close-signup]');
  const stepIndicators = modal.querySelectorAll('[data-step-indicator]');
  const steps = modal.querySelectorAll('.signup-step');
  const feedback = modal.querySelector('#signup-feedback');
  const issuesEl = modal.querySelector('#signup-issues');
  const nextBtn = modal.querySelector('[data-next-step]');
  const prevBtn = modal.querySelector('[data-prev-step]');
  const submitBtn = modal.querySelector('[data-submit-signup]');
  const typeButtons = modal.querySelectorAll('[data-business-type]');
  const businessNameInput = modal.querySelector('#signup-business-name');
  const subdomainInput = modal.querySelector('#signup-subdomain');
  const emailInput = modal.querySelector('#signup-email');
  const passwordInput = modal.querySelector('#signup-password');
  const confirmInput = modal.querySelector('#signup-password-confirm');

  const state = {
    step: 1,
    businessType: null,
    businessName: '',
    subdomain: '',
    email: '',
    password: '',
    confirmPassword: '',
    busy: false
  };

  const sanitizeSubdomain = (value) => {
    const normalized = value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
    return normalized
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 30);
  };

  const mapBusinessToVertical = (value) => {
    switch (value) {
      case 'barbershop':
      case 'barberia':
        return 'barbershop';
      case 'peluqueria':
        return 'peluqueria';
      case 'estetica':
      case 'aesthetics':
      case 'salud':
        return 'aesthetics';
      case 'profesionales':
        return 'other';
      default:
        return 'barbershop';
    }
  };

  const passwordValid = (pwd) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(pwd);
  const emailValid = (value) => /\S+@\S+\.\S+/.test(value);

  const collectIssues = (scope) => {
    const issues = [];
    if (!state.businessType) issues.push('Elegí el tipo de negocio');
    if (state.businessName.trim().length < 2) issues.push('Escribí el nombre de tu local');
    if (state.subdomain.trim().length < 3) issues.push('El subdominio debe tener al menos 3 letras');
    if (scope !== 'step1') {
      if (!emailValid(state.email)) issues.push('Ingresá un email válido');
      if (!passwordValid(state.password)) issues.push('La contraseña no cumple los requisitos');
      if (state.password !== state.confirmPassword) issues.push('La confirmación no coincide');
    }
    return issues;
  };

  const showIssues = (scope) => {
    const issues = collectIssues(scope);
    if (!issuesEl) return;
    if (!issues.length) {
      issuesEl.innerHTML = '';
      return;
    }
    issuesEl.innerHTML = `<ul>${issues.map((i) => `<li>${i}</li>`).join('')}</ul>`;
  };

  const setFeedback = (text, isError = false) => {
    if (!feedback) return;
    feedback.textContent = text || '';
    feedback.style.color = isError ? '#b91c1c' : 'var(--muted)';
  };

  const showStep = (step) => {
    state.step = step;
    steps.forEach((el) => {
      const s = Number(el.dataset.step);
      if (s === step) {
        el.removeAttribute('hidden');
      } else {
        el.setAttribute('hidden', 'true');
      }
    });
    stepIndicators.forEach((el) => {
      const s = Number(el.dataset.stepIndicator);
      if (s === step) el.classList.add('active');
      else el.classList.remove('active');
    });
  };

  const open = () => {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    htmlBody.classList.add('no-scroll');
    showStep(1);
    (businessNameInput || modal).focus?.();
  };

  const close = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    htmlBody.classList.remove('no-scroll');
    setFeedback('');
  };

  const canStep1 = () => {
    return !!state.businessType && state.businessName.trim().length >= 2 && state.subdomain.trim().length >= 3;
  };

  const canSubmit = () => {
    return (
      canStep1() &&
      emailValid(state.email) &&
      passwordValid(state.password) &&
      state.password === state.confirmPassword
    );
  };

  const buildAutoLoginUrl = (payload) => {
    const token = payload?.token;
    const tenantSubdomain = payload?.tenantSubdomain || payload?.subdomain;
    const dashboardUrl = payload?.dashboardUrl || payload?.tenantUrl;
    const isLocal = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
    const domain = isLocal ? 'localhost:3001' : 'turnos-pro.com';
    const protocol = isLocal ? 'http:' : 'https:';
    if (token && tenantSubdomain) {
      return `${protocol}//${tenantSubdomain}.${domain}/dashboard?impersonationToken=${encodeURIComponent(token)}&tour=onboarding&onboarding=1`;
    }
    if (tenantSubdomain && dashboardUrl) {
      try {
        const base = new URL(dashboardUrl);
        return base.toString();
      } catch {
        return `${protocol}//${tenantSubdomain}.${domain}`;
      }
    }
    return '';
  };

  const setBusy = (busy) => {
    state.busy = busy;
    if (submitBtn) submitBtn.disabled = busy;
    if (nextBtn && state.step === 1) nextBtn.disabled = busy;
    if (submitBtn) submitBtn.textContent = busy ? 'Creando cuenta...' : 'Crear cuenta';
  };

  const registerTenant = async () => {
    showIssues();
    if (!canSubmit()) {
      setFeedback('Completá los datos para crear tu cuenta', true);
      return;
    }
    setBusy(true);
    setFeedback('');
    try {
      const primaryBody = {
        gymName: state.businessName.trim(),
        subdomain: state.subdomain.trim(),
        adminEmail: state.email.trim(),
        adminFirstName: 'Admin',
        adminLastName: 'Turnos Pro',
        password: state.password
      };

      let res = await fetch(apiUrl('/tenants/self-register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(primaryBody)
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const payload = data?.data || data;
        const redirect = buildAutoLoginUrl(payload);
        if (redirect) {
          window.location.href = redirect;
          return;
        }
      }

      const fallbackBody = {
        verticalCode: mapBusinessToVertical(state.businessType),
        subdomain: state.subdomain.trim(),
        businessName: state.businessName.trim(),
        adminEmail: state.email.trim(),
        adminFirstName: 'Admin',
        adminLastName: 'Turnos Pro',
        adminPassword: state.password,
        confirmPassword: state.password,
        timeZone: 'America/Argentina/Buenos_Aires',
        currency: 'ARS',
        language: 'es',
        isDemo: true,
        demoDays: 30
      };

      res = await fetch(apiUrl('/self-registration'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fallbackBody)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'No pudimos crear tu cuenta. Probá de nuevo.');
      }

      const data = await res.json().catch(() => ({}));
      const payload = data?.data || data;
      const redirect = buildAutoLoginUrl(payload);
      if (redirect) {
        window.location.href = redirect;
      } else if (payload?.tenantUrl) {
        window.location.href = payload.tenantUrl;
      } else {
        setFeedback('Cuenta creada. Revisa tu email para acceder.');
        close();
      }
    } catch (error) {
      console.error('Error creando tenant', error);
      setFeedback(error?.message || 'No pudimos crear tu cuenta. Probá de nuevo.', true);
    } finally {
      setBusy(false);
    }
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

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) close();
  });

  typeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.businessType = btn.dataset.businessType || null;
      try { localStorage.setItem('tp_vertical_pref', state.businessType || ''); } catch {}
      typeButtons.forEach((b) => b.classList.toggle('active', b === btn));
    });
  });

  const handleInput = () => {
    state.businessName = businessNameInput?.value || '';
    state.subdomain = sanitizeSubdomain(subdomainInput?.value || '');
    if (subdomainInput) subdomainInput.value = state.subdomain;
    state.email = emailInput?.value || '';
    state.password = passwordInput?.value || '';
    state.confirmPassword = confirmInput?.value || '';
    showIssues();
  };

  [businessNameInput, subdomainInput, emailInput, passwordInput, confirmInput].forEach((input) => {
    if (!input) return;
    input.addEventListener('input', handleInput);
  });

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      handleInput();
      if (!canStep1()) {
        showIssues('step1');
        setFeedback('Completá el tipo de negocio, nombre y subdominio.', true);
        return;
      }
      setFeedback('');
      showStep(2);
      emailInput?.focus();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      setFeedback('');
      showStep(1);
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      handleInput();
      registerTenant();
    });
  }
})();

// A/B testing hooks (placeholder)
(function(){
  window.__ab = { set(id, text){ const el = document.querySelector('[data-ab="' + id + '"]'); if (el) el.textContent = text; } };
})();

window.__HEATMAP_ENABLED = true;
