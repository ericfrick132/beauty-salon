PRD Técnico - SaaS Multi-Tenant para Gestión de Turnos
1. Resumen Ejecutivo
1.1 Visión del Producto
Plataforma SaaS multi-tenant para gestión de reservas y turnos, segmentada en tres verticales (barberías, peluquerías y centros de estética), con arquitectura white-label y subdominios personalizados por cliente.
1.2 Objetivos de Negocio

Capturar 3 segmentos de mercado con una única plataforma
Modelo SaaS con suscripción mensual recurrente
Onboarding automatizado < 5 minutos
Escalabilidad para 1000+ tenants

1.3 Stack Tecnológico

Backend: .NET Core 8.0 con API REST
Frontend: React 18 + TypeScript + TailwindCSS
Base de Datos: PostgreSQL 16
Hosting: DigitalOcean (Droplets + Managed Database)
CDN/DNS: Cloudflare
Contenedores: Docker + Docker Compose

2. Arquitectura Técnica
2.1 Arquitectura de Alto Nivel
mermaidgraph TB
    subgraph "Cloudflare"
        CF[CDN + WAF]
        DNS[DNS Management]
    end
    
    subgraph "DigitalOcean"
        LB[Load Balancer]
        
        subgraph "Droplets"
            API1[.NET API Server 1]
            API2[.NET API Server 2]
            WEB1[React App Server]
        end
        
        subgraph "Managed Services"
            PG[(PostgreSQL)]
            REDIS[(Redis Cache)]
            S3[Spaces/S3]
        end
    end
    
    CF --> LB
    LB --> API1
    LB --> API2
    LB --> WEB1
    API1 --> PG
    API1 --> REDIS
    API2 --> PG
    API2 --> REDIS
    WEB1 --> S3
2.2 Estructura de Base de Datos
sql-- Esquema principal (shared)
CREATE SCHEMA IF NOT EXISTS public;

-- Esquema por tenant (aislamiento de datos)
-- Se crea dinámicamente: CREATE SCHEMA tenant_{tenant_id};

-- TABLAS COMPARTIDAS (public schema)
-- =====================================

-- Verticales disponibles
CREATE TABLE public.verticals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL, -- 'barbershop', 'beautysalon', 'aesthetics'
    name VARCHAR(100) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    default_theme JSONB NOT NULL,
    default_services JSONB NOT NULL,
    terminology JSONB NOT NULL,
    features JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenants (clientes)
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical_id UUID REFERENCES public.verticals(id),
    subdomain VARCHAR(100) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    owner_email VARCHAR(255) NOT NULL,
    owner_phone VARCHAR(50),
    plan_id UUID REFERENCES public.plans(id),
    custom_domain VARCHAR(255),
    theme_overrides JSONB,
    settings JSONB DEFAULT '{}',
    schema_name VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'trial', -- trial, active, suspended, cancelled
    trial_ends_at TIMESTAMPTZ,
    suspended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subdomain, vertical_id)
);

-- Planes de suscripción
CREATE TABLE public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical_id UUID REFERENCES public.verticals(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    price_monthly DECIMAL(10,2) NOT NULL,
    price_yearly DECIMAL(10,2),
    features JSONB NOT NULL,
    limits JSONB NOT NULL, -- max_professionals, max_bookings, etc
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usuarios del sistema
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id),
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL, -- super_admin, tenant_admin, professional, receptionist
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(email, tenant_id)
);

-- Suscripciones y pagos
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id),
    plan_id UUID REFERENCES public.plans(id),
    status VARCHAR(50) NOT NULL, -- active, cancelled, past_due
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLAS POR TENANT (tenant schema)
-- =====================================
-- Estas se crean para cada tenant en su propio schema

-- Servicios ofrecidos
CREATE TABLE tenant_{id}.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES tenant_{id}.service_categories(id),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profesionales
CREATE TABLE tenant_{id}.professionals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- opcional, referencia a public.users
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    specialties JSONB, -- array de service_ids
    working_hours JSONB, -- horarios por día
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clientes
CREATE TABLE tenant_{id}.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    birth_date DATE,
    notes TEXT,
    tags JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(email),
    UNIQUE(phone)
);

-- Reservas/Turnos
CREATE TABLE tenant_{id}.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES tenant_{id}.customers(id),
    professional_id UUID REFERENCES tenant_{id}.professionals(id),
    service_id UUID REFERENCES tenant_{id}.services(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'confirmed', -- pending, confirmed, completed, cancelled, no_show
    price DECIMAL(10,2),
    notes TEXT,
    reminder_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT
);

-- Índices importantes
CREATE INDEX idx_bookings_date ON tenant_{id}.bookings(start_time);
CREATE INDEX idx_bookings_professional ON tenant_{id}.bookings(professional_id);
CREATE INDEX idx_bookings_customer ON tenant_{id}.bookings(customer_id);
CREATE INDEX idx_bookings_status ON tenant_{id}.bookings(status);
3. Backend - .NET Core API
3.1 Estructura del Proyecto
BookingPro.API/
├── src/
│   ├── BookingPro.Api/              # Web API project
│   │   ├── Controllers/
│   │   ├── Middleware/
│   │   ├── Filters/
│   │   └── Program.cs
│   ├── BookingPro.Core/             # Domain/Business Logic
│   │   ├── Entities/
│   │   ├── Interfaces/
│   │   ├── Services/
│   │   └── Constants/
│   ├── BookingPro.Infrastructure/   # Data Access & External Services
│   │   ├── Data/
│   │   │   ├── Contexts/
│   │   │   └── Repositories/
│   │   ├── Services/
│   │   └── Migrations/
│   └── BookingPro.Shared/           # DTOs & Common
│       ├── DTOs/
│       └── Extensions/
├── tests/
├── docker-compose.yml
└── Dockerfile
3.2 Implementación Multi-Tenant
csharp// Infrastructure/Data/Contexts/TenantDbContext.cs
public class TenantDbContext : DbContext
{
    private readonly string _tenantId;
    private readonly string _schemaName;

    public TenantDbContext(
        DbContextOptions<TenantDbContext> options, 
        ITenantService tenantService) : base(options)
    {
        _tenantId = tenantService.GetCurrentTenantId();
        _schemaName = tenantService.GetSchemaName();
    }

    public DbSet<Service> Services { get; set; }
    public DbSet<Professional> Professionals { get; set; }
    public DbSet<Customer> Customers { get; set; }
    public DbSet<Booking> Bookings { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Aplicar schema del tenant
        modelBuilder.HasDefaultSchema(_schemaName);
        
        // Configuraciones de entidades
        modelBuilder.ApplyConfigurationsFromAssembly(
            Assembly.GetExecutingAssembly()
        );
        
        // Global query filter para soft delete
        modelBuilder.Entity<Service>()
            .HasQueryFilter(s => s.IsActive);
    }
}

// Api/Middleware/TenantResolutionMiddleware.cs
public class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IMemoryCache _cache;

    public TenantResolutionMiddleware(
        RequestDelegate next, 
        IMemoryCache cache)
    {
        _next = next;
        _cache = cache;
    }

    public async Task InvokeAsync(
        HttpContext context, 
        ITenantService tenantService)
    {
        var host = context.Request.Host.Value;
        
        // Cache key
        var cacheKey = $"tenant_{host}";
        
        if (!_cache.TryGetValue(cacheKey, out TenantInfo tenant))
        {
            // Resolver tenant desde hostname
            tenant = await ResolveTenant(host, tenantService);
            
            if (tenant == null)
            {
                context.Response.StatusCode = 404;
                await context.Response.WriteAsync("Tenant not found");
                return;
            }

            // Cachear por 5 minutos
            _cache.Set(cacheKey, tenant, TimeSpan.FromMinutes(5));
        }

        // Establecer contexto del tenant
        tenantService.SetCurrentTenant(tenant);
        
        // Agregar headers
        context.Response.Headers.Add("X-Tenant-Id", tenant.Id.ToString());

        await _next(context);
    }

    private async Task<TenantInfo> ResolveTenant(
        string hostname, 
        ITenantService service)
    {
        // Lógica para resolver tenant
        // 1. Verificar si es subdominio
        // 2. Verificar si es dominio custom
        // 3. Cargar configuración del vertical
        
        var parts = hostname.Split('.');
        
        if (parts.Length >= 3)
        {
            var subdomain = parts[0];
            var verticalDomain = string.Join(".", parts.Skip(1));
            
            return await service.GetTenantBySubdomain(subdomain, verticalDomain);
        }
        
        // Dominio custom
        return await service.GetTenantByCustomDomain(hostname);
    }
}

// Api/Program.cs
var builder = WebApplication.CreateBuilder(args);

// Configuración de servicios
builder.Services.AddDbContext<MasterDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("MasterDb")));

builder.Services.AddDbContext<TenantDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("MasterDb")));

// Servicios de tenant
builder.Services.AddScoped<ITenantService, TenantService>();
builder.Services.AddMemoryCache();

// Autenticación JWT
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"])),
            ValidateIssuer = false,
            ValidateAudience = false
        };
    });

// CORS para múltiples dominios
builder.Services.AddCors(options =>
{
    options.AddPolicy("MultiTenant", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
        {
            var uri = new Uri(origin);
            // Permitir todos los subdominios de nuestros verticales
            return uri.Host.EndsWith(".barbershop.com") ||
                   uri.Host.EndsWith(".beautysalon.com") ||
                   uri.Host.EndsWith(".aesthetics.com") ||
                   uri.Host == "localhost";
        })
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials();
    });
});

var app = builder.Build();

// Pipeline
app.UseMiddleware<TenantResolutionMiddleware>();
app.UseCors("MultiTenant");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
3.3 Controllers Ejemplo
csharp// Api/Controllers/BookingsController.cs
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BookingsController : ControllerBase
{
    private readonly IBookingService _bookingService;
    private readonly ITenantService _tenantService;

    public BookingsController(
        IBookingService bookingService,
        ITenantService tenantService)
    {
        _bookingService = bookingService;
        _tenantService = tenantService;
    }

    [HttpGet]
    public async Task<IActionResult> GetBookings(
        [FromQuery] DateTime? date,
        [FromQuery] Guid? professionalId,
        [FromQuery] string status)
    {
        var tenantId = _tenantService.GetCurrentTenantId();
        
        var bookings = await _bookingService.GetBookingsAsync(
            tenantId, date, professionalId, status);
            
        return Ok(bookings);
    }

    [HttpPost]
    public async Task<IActionResult> CreateBooking(
        [FromBody] CreateBookingDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var tenantId = _tenantService.GetCurrentTenantId();
        
        // Validar disponibilidad
        var isAvailable = await _bookingService.CheckAvailabilityAsync(
            tenantId, dto.ProfessionalId, dto.StartTime, dto.ServiceId);
            
        if (!isAvailable)
            return Conflict(new { message = "Time slot not available" });

        var booking = await _bookingService.CreateBookingAsync(tenantId, dto);
        
        // Enviar confirmación por email/SMS
        await _notificationService.SendBookingConfirmationAsync(booking);
        
        return CreatedAtAction(
            nameof(GetBooking), 
            new { id = booking.Id }, 
            booking);
    }
}

// Api/Controllers/Admin/TenantController.cs
[ApiController]
[Route("api/admin/[controller]")]
[Authorize(Roles = "SuperAdmin")]
public class TenantController : ControllerBase
{
    private readonly ITenantManagementService _tenantManagement;

    [HttpPost("provision")]
    public async Task<IActionResult> ProvisionNewTenant(
        [FromBody] ProvisionTenantDto dto)
    {
        // 1. Validar subdomain disponible
        var isAvailable = await _tenantManagement
            .CheckSubdomainAvailabilityAsync(dto.Subdomain, dto.VerticalCode);
            
        if (!isAvailable)
            return BadRequest(new { message = "Subdomain not available" });

        // 2. Crear tenant
        var tenant = await _tenantManagement.CreateTenantAsync(dto);
        
        // 3. Crear schema en la base de datos
        await _tenantManagement.CreateTenantSchemaAsync(tenant.Id);
        
        // 4. Seed data inicial
        await _tenantManagement.SeedTenantDataAsync(tenant.Id, dto.VerticalCode);
        
        // 5. Crear usuario admin
        var adminUser = await _tenantManagement.CreateTenantAdminAsync(
            tenant.Id, dto.OwnerEmail, dto.OwnerPassword);
        
        // 6. Enviar email de bienvenida
        await _emailService.SendWelcomeEmailAsync(
            dto.OwnerEmail, 
            $"https://{dto.Subdomain}.{dto.VerticalDomain}");

        return Ok(new
        {
            TenantId = tenant.Id,
            AccessUrl = $"https://{dto.Subdomain}.{dto.VerticalDomain}",
            AdminUser = adminUser.Email
        });
    }
}
4. Frontend - React Application
4.1 Estructura del Proyecto
booking-pro-web/
├── src/
│   ├── components/
│   │   ├── common/
│   │   ├── booking/
│   │   ├── admin/
│   │   └── layouts/
│   ├── contexts/
│   │   ├── TenantContext.tsx
│   │   └── AuthContext.tsx
│   ├── hooks/
│   │   ├── useTenant.ts
│   │   └── useTheming.ts
│   ├── services/
│   │   ├── api.ts
│   │   └── auth.ts
│   ├── styles/
│   │   ├── themes/
│   │   └── globals.css
│   ├── pages/
│   │   ├── public/
│   │   └── admin/
│   └── App.tsx
├── public/
│   └── assets/
│       ├── barbershop/
│       ├── beautysalon/
│       └── aesthetics/
└── package.json
4.2 Componente Principal con Theming
tsx// src/App.tsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { TenantProvider } from './contexts/TenantContext';
import { AuthProvider } from './contexts/AuthContext';
import { AppRouter } from './routes/AppRouter';
import { LoadingScreen } from './components/common/LoadingScreen';

const App: React.FC = () => {
  const [tenantConfig, setTenantConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTenantConfiguration();
  }, []);

  const loadTenantConfiguration = async () => {
    try {
      // El backend resuelve el tenant basado en el hostname
      const response = await fetch('/api/tenant/config');
      const config = await response.json();
      
      setTenantConfig(config);
      applyTheme(config.theme);
      document.title = config.businessName;
      
      // Cambiar favicon
      const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      favicon.href = `/assets/${config.vertical}/favicon.ico`;
      
    } catch (error) {
      console.error('Failed to load tenant configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (theme: any) => {
    const root = document.documentElement;
    
    // Colores
    root.style.setProperty('--color-primary', theme.primaryColor);
    root.style.setProperty('--color-secondary', theme.secondaryColor);
    root.style.setProperty('--color-accent', theme.accentColor);
    
    // Fuentes
    if (theme.fontFamily) {
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${theme.fontFamily.replace(' ', '+')}`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      root.style.setProperty('--font-family', theme.fontFamily);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <TenantProvider config={tenantConfig}>
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </AuthProvider>
    </TenantProvider>
  );
};

export default App;
4.3 Context de Tenant
tsx// src/contexts/TenantContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';

interface TenantConfig {
  tenantId: string;
  businessName: string;
  vertical: 'barbershop' | 'beautysalon' | 'aesthetics';
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
  };
  features: {
    onlinePayment: boolean;
    smsReminders: boolean;
    loyaltyProgram: boolean;
    multiLocation: boolean;
  };
  terminology: {
    professional: string;
    customer: string;
    service: string;
    booking: string;
  };
  services: Array<{
    id: string;
    name: string;
    duration: number;
    price: number;
  }>;
}

interface TenantContextType {
  config: TenantConfig;
  isFeatureEnabled: (feature: string) => boolean;
  getTerm: (key: string) => string;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{
  config: TenantConfig;
  children: ReactNode;
}> = ({ config, children }) => {
  
  const isFeatureEnabled = (feature: string): boolean => {
    return config.features[feature] || false;
  };

  const getTerm = (key: string): string => {
    return config.terminology[key] || key;
  };

  return (
    <TenantContext.Provider value={{ config, isFeatureEnabled, getTerm }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
};
4.4 Componente de Reserva
tsx// src/components/booking/BookingCalendar.tsx
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { bookingApi } from '../../services/api';

export const BookingCalendar: React.FC = () => {
  const { config, getTerm } = useTenant();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [professionals, setProfessionals] = useState([]);

  useEffect(() => {
    loadProfessionals();
  }, []);

  useEffect(() => {
    if (selectedDate && selectedProfessional && selectedService) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedProfessional, selectedService]);

  const loadProfessionals = async () => {
    const data = await bookingApi.getProfessionals();
    setProfessionals(data);
  };

  const loadAvailableSlots = async () => {
    const slots = await bookingApi.getAvailableSlots({
      date: selectedDate,
      professionalId: selectedProfessional.id,
      serviceId: selectedService.id
    });
    setAvailableSlots(slots);
  };

  return (
    <div className="booking-calendar">
      <div className="booking-steps">
        {/* Step 1: Seleccionar Servicio */}
        <div className="step">
          <h3>{getTerm('service')}</h3>
          <div className="services-grid">
            {config.services.map(service => (
              <button
                key={service.id}
                className={`service-card ${
                  selectedService?.id === service.id ? 'selected' : ''
                }`}
                onClick={() => setSelectedService(service)}
              >
                <span className="service-name">{service.name}</span>
                <span className="service-duration">
                  <Clock size={16} /> {service.duration} min
                </span>
                <span className="service-price">${service.price}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Seleccionar Profesional */}
        <div className="step">
          <h3>{getTerm('professional')}</h3>
          <div className="professionals-grid">
            {professionals.map(prof => (
              <button
                key={prof.id}
                className={`professional-card ${
                  selectedProfessional?.id === prof.id ? 'selected' : ''
                }`}
                onClick={() => setSelectedProfessional(prof)}
              >
                <User size={24} />
                <span>{prof.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Seleccionar Fecha y Hora */}
        <div className="step">
          <h3>Fecha y Hora</h3>
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            min={new Date().toISOString().split('T')[0]}
          />
          
          <div className="time-slots">
            {availableSlots.map(slot => (
              <button
                key={slot}
                className="time-slot"
                onClick={() => handleBooking(slot)}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
5. Configuración de Infraestructura
5.1 Docker Compose
yaml# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: bookingpro
      POSTGRES_USER: bookingpro
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build:
      context: ./BookingPro.API
      dockerfile: Dockerfile
    environment:
      ConnectionStrings__MasterDb: "Host=postgres;Database=bookingpro;Username=bookingpro;Password=${DB_PASSWORD}"
      Redis__ConnectionString: "redis:6379"
      JWT__Key: ${JWT_SECRET}
    depends_on:
      - postgres
      - redis
    ports:
      - "5000:80"

  web:
    build:
      context: ./booking-pro-web
      dockerfile: Dockerfile
    environment:
      REACT_APP_API_URL: "http://api:80"
    depends_on:
      - api
    ports:
      - "3000:80"

volumes:
  postgres_data:
5.2 Dockerfile Backend
dockerfile# BookingPro.API/Dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/BookingPro.Api/BookingPro.Api.csproj", "BookingPro.Api/"]
COPY ["src/BookingPro.Core/BookingPro.Core.csproj", "BookingPro.Core/"]
COPY ["src/BookingPro.Infrastructure/BookingPro.Infrastructure.csproj", "BookingPro.Infrastructure/"]
RUN dotnet restore "BookingPro.Api/BookingPro.Api.csproj"

COPY . .
WORKDIR "/src/BookingPro.Api"
RUN dotnet build "BookingPro.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "BookingPro.Api.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "BookingPro.Api.dll"]
5.3 Configuración de DigitalOcean
bash#!/bin/bash
# deploy-to-digitalocean.sh

# 1. Crear Droplet
doctl compute droplet create booking-pro-api \
  --image docker-20-04 \
  --size s-2vcpu-4gb \
  --region nyc1 \
  --ssh-keys YOUR_SSH_KEY_ID

# 2. Configurar Managed Database
doctl databases create booking-pro-db \
  --engine pg \
  --version 16 \
  --size db-s-2vcpu-4gb \
  --region nyc1

# 3. Configurar Spaces (S3-compatible)
doctl spaces create booking-pro-assets --region nyc3

# 4. Load Balancer
doctl compute load-balancer create \
  --name booking-pro-lb \
  --region nyc1 \
  --forwarding-rules entry_protocol:https,entry_port:443,target_protocol:http,target_port:80
5.4 Configuración de Cloudflare
javascript// Cloudflare Workers Script para routing
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const hostname = url.hostname
  
  // Mapeo de dominios a origen
  const origins = {
    'barbershop.com': 'https://api-barbershop.digitalocean.com',
    'beautysalon.com': 'https://api-beautysalon.digitalocean.com',
    'aesthetics.com': 'https://api-aesthetics.digitalocean.com'
  }
  
  // Determinar origen basado en hostname
  let origin = 'https://api.digitalocean.com' // default
  
  for (const [domain, apiOrigin] of Object.entries(origins)) {
    if (hostname.endsWith(domain)) {
      origin = apiOrigin
      break
    }
  }
  
  // Proxy request al origen correcto
  const modifiedRequest = new Request(origin + url.pathname + url.search, {
    method: request.method,
    headers: request.headers,
    body: request.body
  })
  
  // Agregar header para identificar vertical
  modifiedRequest.headers.set('X-Original-Host', hostname)
  
  return fetch(modifiedRequest)
}
6. Scripts de Migración y Deployment
6.1 Script de Provisioning de Tenant
csharp// Scripts/TenantProvisioning.cs
public class TenantProvisioningService
{
    private readonly IDbConnection _connection;
    
    public async Task ProvisionNewTenant(
        string tenantId, 
        string verticalCode)
    {
        var schemaName = $"tenant_{tenantId.Replace("-", "_")}";
        
        using var transaction = _connection.BeginTransaction();
        
        try
        {
            // 1. Crear schema
            await _connection.ExecuteAsync(
                $"CREATE SCHEMA IF NOT EXISTS {schemaName}",
                transaction: transaction);
            
            // 2. Crear tablas
            var createTablesSql = File.ReadAllText("Scripts/tenant-tables.sql");
            createTablesSql = createTablesSql.Replace("{{schema}}", schemaName);
            
            await _connection.ExecuteAsync(
                createTablesSql,
                transaction: transaction);
            
            // 3. Insertar datos iniciales según vertical
            var seedData = GetSeedDataForVertical(verticalCode);
            
            foreach (var service in seedData.Services)
            {
                await _connection.ExecuteAsync(
                    $@"INSERT INTO {schemaName}.services 
                       (name, duration_minutes, price) 
                       VALUES (@Name, @Duration, @Price)",
                    service,
                    transaction: transaction);
            }
            
            transaction.Commit();
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }
}
6.2 GitHub Actions CI/CD
yaml# .github/workflows/deploy.yml
name: Deploy to DigitalOcean

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup .NET
      uses: actions/setup-dotnet@v1
      with:
        dotnet-version: '8.0.x'
    
    - name: Build API
      run: |
        cd BookingPro.API
        dotnet restore
        dotnet publish -c Release -o ./publish
    
    - name: Build React App
      run: |
        cd booking-pro-web
        npm install
        npm run build
    
    - name: Build Docker Images
      run: |
        docker build -t bookingpro-api ./BookingPro.API
        docker build -t bookingpro-web ./booking-pro-web
    
    - name: Push to Registry
      run: |
        echo ${{ secrets.DIGITALOCEAN_TOKEN }} | docker login registry.digitalocean.com -u token --password-stdin
        docker tag bookingpro-api registry.digitalocean.com/booking-pro/api:latest
        docker tag bookingpro-web registry.digitalocean.com/booking-pro/web:latest
        docker push registry.digitalocean.com/booking-pro/api:latest
        docker push registry.digitalocean.com/booking-pro/web:latest
    
    - name: Deploy to Droplet
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.DROPLET_IP }}
        username: root
        key: ${{ secrets.SSH_KEY }}
        script: |
          docker pull registry.digitalocean.com/booking-pro/api:latest
          docker pull registry.digitalocean.com/booking-pro/web:latest
          docker-compose up -d
7. Monitoreo y Observabilidad
7.1 Configuración de Logging
csharp// Program.cs
builder.Services.AddLogging(logging =>
{
    logging.AddConsole();
    logging.AddDebug();
    
    // Serilog para structured logging
    Log.Logger = new LoggerConfiguration()
        .MinimumLevel.Information()
        .Enrich.WithProperty("Application", "BookingPro")
        .Enrich.WithTenantId() // Custom enricher
        .WriteTo.Console()
        .WriteTo.PostgreSQL(
            connectionString,
            tableName: "logs",
            schemaName: "public")
        .CreateLogger();
});

// Custom Enricher
public class TenantIdEnricher : ILogEventEnricher
{
    private readonly ITenantService _tenantService;
    
    public void Enrich(LogEvent logEvent, ILogEventPropertyFactory propertyFactory)
    {
        var tenantId = _tenantService?.GetCurrentTenantId() ?? "system";
        logEvent.AddPropertyIfAbsent(
            propertyFactory.CreateProperty("TenantId", tenantId));
    }
}
8. Roadmap de Desarrollo
Fase 1: MVP (Mes 1-2)

 Setup inicial de infraestructura
 Sistema de autenticación
 CRUD de servicios y profesionales
 Calendario básico de reservas
 Provisioning manual de tenants

Fase 2: Multi-tenant (Mes 3-4)

 Middleware de resolución de tenants
 Schemas por tenant
 Onboarding automatizado
 Personalización de temas
 Sistema de planes y límites

Fase 3: Features Avanzadas (Mes 5-6)

 Notificaciones SMS/Email
 Pagos online (Stripe/MercadoPago)
 App móvil (React Native)
 Reportes y analytics
 API pública

Fase 4: Escalabilidad (Mes 7+)

 Auto-scaling
 Multi-región
 Backup automatizado
 Monitoreo avanzado
 Marketplace de integraciones

9. Consideraciones de Seguridad

Aislamiento de datos: Schemas separados por tenant
Rate limiting: Por tenant y por IP
Encriptación: TLS 1.3 mínimo
Validación de dominios: Verificación DNS antes de activar
Auditoría: Log de todas las acciones administrativas
Backups: Automatizados diarios con retención 30 días
GDPR: Herramientas de exportación y eliminación de datos