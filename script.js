// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu functionality
    initializeMobileMenu();
    
    // FAQ accordion functionality
    initializeFAQ();
    
    // Smooth scroll for navigation links
    initializeSmoothScroll();
    
    // CTA button tracking
    initializeCTAButtons();
    
    // Navbar scroll effect
    initializeNavbarScroll();
    
    // Animation on scroll
    initializeScrollAnimations();
    
    // Phone mockup interactions
    initializePhoneMockup();
    
    // Pricing currency selector
    initializePricingFeatures();
});

// Mobile Menu Toggle
function initializeMobileMenu() {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileToggle && navLinks) {
        mobileToggle.addEventListener('click', function() {
            navLinks.classList.toggle('mobile-open');
            const icon = mobileToggle.querySelector('i');
            
            if (navLinks.classList.contains('mobile-open')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
        
        // Close mobile menu when clicking on a link
        navLinks.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                navLinks.classList.remove('mobile-open');
                const icon = mobileToggle.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }
}

// FAQ Accordion
function initializeFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        const icon = question.querySelector('i');
        
        // Initially hide all answers
        answer.style.maxHeight = '0';
        answer.style.overflow = 'hidden';
        answer.style.transition = 'max-height 0.3s ease';
        
        question.addEventListener('click', function() {
            const isOpen = answer.style.maxHeight !== '0px';
            
            // Close all other FAQ items
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    const otherAnswer = otherItem.querySelector('.faq-answer');
                    const otherIcon = otherItem.querySelector('.faq-question i');
                    otherAnswer.style.maxHeight = '0';
                    otherIcon.style.transform = 'rotate(0deg)';
                }
            });
            
            // Toggle current item
            if (isOpen) {
                answer.style.maxHeight = '0';
                icon.style.transform = 'rotate(0deg)';
            } else {
                answer.style.maxHeight = answer.scrollHeight + 'px';
                icon.style.transform = 'rotate(180deg)';
            }
        });
    });
}

// Smooth Scrolling
function initializeSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80; // Account for fixed navbar
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// CTA Button Tracking and Effects
function initializeCTAButtons() {
    const ctaButtons = document.querySelectorAll('.btn-primary, .btn-secondary');
    
    ctaButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Add click effect
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
            
            // Track button clicks (you can integrate with analytics here)
            const buttonText = this.textContent.trim();
            console.log('CTA Button clicked:', buttonText);
            
            // For demo purposes, show alert
            if (buttonText.includes('Prueba Gratis') || buttonText.includes('Comenzar')) {
                e.preventDefault();
                showTrialModal();
            } else if (buttonText.includes('Demo')) {
                e.preventDefault();
                showDemoModal();
            }
        });
        
        // Add hover effects
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });
}

// Navbar Scroll Effect
function initializeNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    let lastScrollTop = 0;
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Add/remove background based on scroll position
        if (scrollTop > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.15)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        }
        
        // Hide/show navbar on scroll (optional)
        if (scrollTop > lastScrollTop && scrollTop > 200) {
            // Scrolling down
            navbar.style.transform = 'translateY(-100%)';
        } else {
            // Scrolling up
            navbar.style.transform = 'translateY(0)';
        }
        
        lastScrollTop = scrollTop;
    });
}

// Scroll Animations
function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animateElements = document.querySelectorAll(
        '.problem-card, .feature-card, .benefit-card, .testimonial-card, .pricing-card'
    );
    
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
    
    // Add CSS for animation
    const style = document.createElement('style');
    style.textContent = `
        .animate-in {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);
}

// Phone Mockup Interactions
function initializePhoneMockup() {
    const phoneMockup = document.querySelector('.phone-mockup');
    const appointmentCards = document.querySelectorAll('.appointment-card');
    
    if (phoneMockup) {
        // Add tilt effect on mouse move
        phoneMockup.addEventListener('mousemove', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;
            
            this.style.transform = `rotate(-5deg) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
        
        phoneMockup.addEventListener('mouseleave', function() {
            this.style.transform = 'rotate(-5deg)';
        });
    }
    
    // Animate appointment cards
    if (appointmentCards.length > 0) {
        setInterval(() => {
            appointmentCards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.transform = 'scale(1.02)';
                    setTimeout(() => {
                        card.style.transform = 'scale(1)';
                    }, 200);
                }, index * 500);
            });
        }, 5000);
    }
}

// Pricing Features
function initializePricingFeatures() {
    // Add country detection for pricing display
    const pricingLocal = document.querySelector('.pricing-local span');
    
    if (pricingLocal) {
        // Simple country detection based on timezone or language
        const userLanguage = navigator.language || navigator.userLanguage;
        let localPrice = '~$15.000 ARS | ~$60.000 COP | ~S/55 PEN';
        
        if (userLanguage.includes('es-AR')) {
            localPrice = '~$15.000 ARS por mes';
        } else if (userLanguage.includes('es-CO')) {
            localPrice = '~$60.000 COP por mes';
        } else if (userLanguage.includes('es-PE')) {
            localPrice = '~S/55 PEN por mes';
        } else if (userLanguage.includes('es-MX')) {
            localPrice = '~$270 MXN por mes';
        } else if (userLanguage.includes('es-CL')) {
            localPrice = '~$12.000 CLP por mes';
        }
        
        pricingLocal.textContent = localPrice;
    }
}

// Modal Functions
function showTrialModal() {
    const modal = createModal(
        'Comenzar Prueba Gratis',
        `
        <div style="text-align: center; padding: 2rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🎉</div>
            <h3 style="color: var(--dark-purple); margin-bottom: 1rem;">¡Perfecto! Estás a un paso de transformar tu salón</h3>
            <p style="margin-bottom: 2rem; color: var(--text-light);">Completa este formulario y en 5 minutos tendrás acceso completo a BeautyManager.</p>
            
            <form id="trial-form" style="text-align: left; max-width: 400px; margin: 0 auto;">
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Nombre del salón *</label>
                    <input type="text" required style="width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 8px; font-size: 1rem;">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Tu nombre *</label>
                    <input type="text" required style="width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 8px; font-size: 1rem;">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">WhatsApp *</label>
                    <input type="tel" required style="width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 8px; font-size: 1rem;">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Email *</label>
                    <input type="email" required style="width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 8px; font-size: 1rem;">
                </div>
                
                <div style="margin-bottom: 2rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">País</label>
                    <select style="width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 8px; font-size: 1rem;">
                        <option>Argentina</option>
                        <option>Colombia</option>
                        <option>Perú</option>
                        <option>México</option>
                        <option>Chile</option>
                        <option>Uruguay</option>
                        <option>Otro</option>
                    </select>
                </div>
                
                <button type="submit" class="btn btn-primary btn-large" style="width: 100%; justify-content: center;">
                    <i class="fas fa-rocket"></i>
                    Activar Mi Cuenta Gratis
                </button>
                
                <p style="font-size: 0.9rem; color: var(--text-light); text-align: center; margin-top: 1rem;">
                    ✓ 14 días completamente gratis<br>
                    ✓ Sin tarjeta de crédito<br>
                    ✓ Configuración incluida
                </p>
            </form>
        </div>
        `
    );
    
    document.getElementById('trial-form').addEventListener('submit', function(e) {
        e.preventDefault();
        alert('¡Genial! Te contactaremos por WhatsApp en los próximos minutos para configurar tu cuenta.');
        modal.remove();
    });
}

function showDemoModal() {
    const modal = createModal(
        'Agendar Demo Personalizada',
        `
        <div style="text-align: center; padding: 2rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">📅</div>
            <h3 style="color: var(--dark-purple); margin-bottom: 1rem;">Agenda una demo personalizada</h3>
            <p style="margin-bottom: 2rem; color: var(--text-light);">Te mostraremos BeautyManager en acción y resolveremos todas tus dudas.</p>
            
            <div style="text-align: left; max-width: 400px; margin: 0 auto;">
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Nombre completo *</label>
                    <input type="text" required style="width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 8px; font-size: 1rem;">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">WhatsApp *</label>
                    <input type="tel" required style="width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 8px; font-size: 1rem;">
                </div>
                
                <div style="margin-bottom: 2rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Mejor horario para contactarte</label>
                    <select style="width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 8px; font-size: 1rem;">
                        <option>Mañana (9:00 - 12:00)</option>
                        <option>Tarde (14:00 - 18:00)</option>
                        <option>Noche (19:00 - 21:00)</option>
                    </select>
                </div>
                
                <button class="btn btn-primary btn-large" style="width: 100%; justify-content: center;" onclick="alert('¡Perfecto! Te contactaremos hoy para coordinar la demo.'); this.closest('.modal-overlay').remove();">
                    <i class="fas fa-calendar"></i>
                    Confirmar Demo
                </button>
            </div>
        </div>
        `
    );
}

function createModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="
            background: white;
            border-radius: 20px;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
            transform: scale(0.8);
            transition: transform 0.3s ease;
        ">
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem 2rem;
                border-bottom: 1px solid #eee;
            ">
                <h2 style="margin: 0; color: var(--dark-purple);">${title}</h2>
                <button class="modal-close" style="
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: var(--text-light);
                    padding: 5px;
                ">×</button>
            </div>
            ${content}
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Animate in
    setTimeout(() => {
        modal.style.opacity = '1';
        modal.querySelector('.modal-content').style.transform = 'scale(1)';
    }, 10);
    
    // Close handlers
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
    
    modal.querySelector('.modal-close').addEventListener('click', function() {
        closeModal(modal);
    });
    
    return modal;
}

function closeModal(modal) {
    modal.style.opacity = '0';
    modal.querySelector('.modal-content').style.transform = 'scale(0.8)';
    setTimeout(() => {
        modal.remove();
    }, 300);
}

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            closeModal(modal);
        }
    }
});

// Performance optimization - lazy load images
function initializeLazyLoading() {
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    }
}

// Call lazy loading on page load
window.addEventListener('load', initializeLazyLoading);

// Add CSS for mobile menu (since it's not in the CSS file)
const mobileMenuStyle = document.createElement('style');
mobileMenuStyle.textContent = `
    @media (max-width: 768px) {
        .nav-links.mobile-open {
            display: flex !important;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
            flex-direction: column;
            padding: 2rem;
            gap: 1rem;
        }
        
        .nav-links.mobile-open a {
            text-align: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid #eee;
        }
        
        .nav-links.mobile-open .btn {
            margin-top: 1rem;
            align-self: center;
        }
    }
`;
document.head.appendChild(mobileMenuStyle);