


📋 REQUIREMENTS CRÍTICOS - DO APP PLATFORM:
🐳 1. DOCKERFILES OPTIMIZADOS:
[ ] Backend: Multi-stage build, puerto específico documentado
[ ] Frontend: Dockerfile.prod con nginx para producción
[ ] Configurar puertos desde el inicio pensando en DO
🔧 2. CONFIGURACIÓN DE NGINX (Frontend):
[ ] Crear nginx.conf con proxy correcto desde el inicio
[ ] Usar placeholder para nombre de servicio: {{BACKEND_SERVICE_NAME}}
[ ] Incluir health checks, gzip, security headers
⚙️ 3. VARIABLES DE ENTORNO ESTRUCTURADAS:
[ ] Frontend: .env.example con variables REACT_APP_*
[ ] Backend: appsettings con placeholders para DO
[ ] Separar claramente BUILD_TIME vs RUN_TIME variables
🗃️ 4. DATABASE SETUP:
[ ] Entity Framework con migraciones automáticas / Prisma con migraciones
[ ] Connection string compatible con DO format ${db.DATABASE_URL}
[ ] Seeder data opcional
📁 5. ESTRUCTURA DE PROYECTO:
text
proyecto/
├── backend/
│   ├── Dockerfile              # Multi-stage, puerto documentado
│   ├── appsettings.json        # Con placeholders para DO
│   └── [resto del backend]
├── frontend/
│   ├── Dockerfile              # Para desarrollo
│   ├── Dockerfile.prod         # Con nginx para producción
│   ├── nginx.conf              # Con proxy a {{BACKEND_SERVICE_NAME}}
│   ├── .env.example            # Variables de React
│   └── [resto del frontend]
├── app.yaml                    # Configuración DO lista
├── docker-compose.yml          # Para desarrollo local
└── README.md                   # Con instrucciones de deploy
🎯 DELIVERABLES ESPECÍFICOS:
1. app.yaml pre-configurado:
Nombres de servicios consistentes
Puertos correctos desde el inicio
Variables de entorno organizadas
Ingress rules correctas
2. nginx.conf template:
nginx
location /api {
    proxy_pass http://{{BACKEND_SERVICE_NAME}}:{{BACKEND_PORT}};
    # headers y configuración optimizada
}
3. Scripts de desarrollo:
npm run dev o equivalent para local
docker-compose up para testing completo
Instrucciones claras de deployment
4. Configuración de seguridad:
JWT secrets via environment variables
CORS configurado para DO domains
Variables sensibles nunca hardcoded
⚠️ REGLAS CRÍTICAS:
JAMÁS hardcodear URLs o puertos - siempre via environment
Nombres de servicios deben ser consistentes entre nginx.conf y app.yaml
Frontend variables deben ser BUILD_TIME scope en DO
Backend debe escuchar en 0.0.0.0, no localhost
Dockerfile frontend debe usar nginx en producción, no serve
🔍 VALIDACIÓN PRE-DEPLOY:
[ ] docker-compose up funciona localmente
[ ] Frontend puede comunicarse con backend via proxy
[ ] Database migrations se ejecutan correctamente
[ ] Variables de entorno están organizadas por scope
[ ] nginx.conf tiene nombres de servicios correctos


🔒 PROMPT DE SEGURIDAD PARA SPIN-OFFS
CONTEXTO
Estoy creando un spin-off de mi proyecto principal y necesito implementar todas las medidas de seguridad esenciales desde el día 1. Este proyecto usará [STACK TECNOLÓGICO] y manejará [TIPO DE DATOS/USUARIOS].
CHECKLIST DE SEGURIDAD OBLIGATORIO
🚦 1. RATE LIMITING
Implementar ANTES de cualquier endpoint público
TAREA: Configurar rate limiting
- [ ] Endpoints de API: máximo 100 requests/minuto por IP
- [ ] Login/Auth: máximo 5 intentos/minuto por IP
- [ ] Registro: máximo 3 registros/hora por IP
- [ ] Password reset: máximo 2 intentos/hora por email
- [ ] Upload de archivos: máximo 10 uploads/minuto por usuario

HERRAMIENTAS:
- Supabase Edge Functions con rate limiter
- Vercel con middleware personalizado
- Redis para tracking de requests

🛡️ 2. ROW-LEVEL SECURITY (RLS)
CRÍTICO: Habilitar en TODAS las tablas desde el minuto 1
TAREA: Configurar RLS en Supabase
- [ ] Habilitar RLS en TODAS las tablas (sin excepción)
- [ ] Política básica: user_id = auth.uid()
- [ ] Políticas específicas por tabla según roles
- [ ] Probar políticas con diferentes usuarios
- [ ] Documentar todas las políticas implementadas

POLÍTICAS ESENCIALES:
- users: Solo el propio usuario puede ver/editar sus datos
- projects: Solo el owner y colaboradores autorizados
- payments: Solo el usuario propietario
- admin_logs: Solo roles de admin

🤖 3. PROTECCIÓN ANTI-BOTS
Prevenir spam y ataques automatizados
TAREA: Implementar CAPTCHA
- [ ] Formulario de registro: hCaptcha o reCAPTCHA
- [ ] Login (después de 3 intentos fallidos)
- [ ] Password reset
- [ ] Formularios de contacto
- [ ] Cualquier acción que modifique datos críticos

CONFIGURACIÓN:
- Usar hCaptcha (más privacy-friendly) o reCAPTCHA v3
- Configurar threshold de score apropiado
- Fallback para usuarios con JavaScript deshabilitado

🔥 4. WEB APPLICATION FIREWALL (WAF)
Protección automática contra ataques comunes
TAREA: Activar WAF
VERCEL:
- [ ] Ir a Settings → Security → Web Application Firewall
- [ ] Habilitar "Attack Challenge" en todas las rutas
- [ ] Configurar reglas específicas para tu aplicación

CLOUDFLARE (alternativa):
- [ ] Activar WAF rules
- [ ] Bot fight mode
- [ ] DDoS protection

🔐 5. GESTIÓN SEGURA DE SECRETOS
NUNCA exponer API keys o credenciales
TAREA: Asegurar secretos
- [ ] Todos los secrets en .env (NUNCA en código)
- [ ] Usar prefijo NEXT_PUBLIC_ SOLO para variables públicas
- [ ] API keys sensibles SOLO en server-side functions
- [ ] Rotar API keys regularmente
- [ ] Usar Vercel Environment Variables o similar

VARIABLES CRÍTICAS A PROTEGER:
- Database URLs
- API keys de terceros (Stripe, OpenAI, etc.)
- JWT secrets
- OAuth client secrets
- Webhook secrets

✅ 6. VALIDACIÓN DE INPUTS
NUNCA confiar en validaciones del frontend
TAREA: Validación backend obligatoria
- [ ] Emails: formato + dominio válido + no disposable
- [ ] Passwords: longitud + complejidad + no en diccionarios comunes
- [ ] Uploads: tipo MIME + tamaño + escaneo de malware
- [ ] URLs: whitelist de dominios permitidos
- [ ] Inputs numéricos: rangos válidos
- [ ] Strings: sanitización + length limits

HERRAMIENTAS:
- Zod para validación de schemas
- Joi para validación compleja
- express-validator para Express
- Yup para formularios

📦 7. AUDITORÍA DE DEPENDENCIAS
Mantener el código limpio y seguro
TAREA: Limpiar dependencias
- [ ] Ejecutar: npm audit fix
- [ ] Revisar: npm ls --depth=0
- [ ] Eliminar packages no utilizados
- [ ] Actualizar dependencias críticas
- [ ] Configurar Dependabot o Renovate para updates automáticos

COMANDOS ÚTILES:
npm audit --audit-level high
yarn audit --level high
npm outdated
depcheck (para encontrar deps no usadas)

📊 8. MONITOREO Y LOGGING
Visibilidad completa de lo que pasa en tu app
TAREA: Implementar observabilidad
- [ ] Logs estructurados con timestamps + IP + user_id
- [ ] Tracking de failed logins (> 3 = alerta)
- [ ] Monitoreo de spikes de tráfico
- [ ] Alertas para errores 500
- [ ] Métricas de performance

EVENTOS CRÍTICOS A LOGGEAR:
- Intentos de login fallidos
- Cambios de password
- Accesos a datos sensibles
- Errores de autorización
- Uploads de archivos
- Transacciones financieras

HERRAMIENTAS:
- Supabase Logs
- Vercel Analytics
- LogRocket para sesiones de usuario
- Sentry para error tracking

🤖 9. REVISIÓN CON IA
Validación automática antes del deploy
TAREA: Code review automatizado
- [ ] Instalar CodeRabbit extension en Cursor
- [ ] Revisar TODOS los archivos antes de commit
- [ ] Buscar específicamente:
  - API keys hardcodeadas
  - SQL injection vulnerabilities
  - XSS potential
  - Improper error handling
  - Missing input validation

COMANDOS PRE-COMMIT:
- ESLint con security rules
- Prettier para consistencia
- TypeScript strict mode
- Automated security scans

🚨 CHECKLIST FINAL PRE-LAUNCH
Antes de hacer el primer deploy:
[ ] ✅ Rate limiting configurado y probado
[ ] ✅ RLS habilitado en TODAS las tablas
[ ] ✅ CAPTCHA en formularios críticos
[ ] ✅ WAF activado
[ ] ✅ Secrets securizados (no hardcoded)
[ ] ✅ Validación backend implementada
[ ] ✅ Dependencies auditadas y limpias
[ ] ✅ Logging y monitoreo activo
[ ] ✅ Code review con IA completado
[ ] ✅ Pruebas de penetración básicas
[ ] ✅ Backup strategy implementada
[ ] ✅ Incident response plan documentado
Post-Launch (primeras 48 horas):
[ ] ✅ Monitorear logs activamente
[ ] ✅ Revisar métricas de rate limiting
[ ] ✅ Verificar que RLS está funcionando
[ ] ✅ Probar todas las funcionalidades críticas
[ ] ✅ Configurar alertas para anomalías
📋 TEMPLATE DE IMPLEMENTACIÓN
Para cada nuevo feature/endpoint:
1. ¿Necesita rate limiting? (99% = SÍ)
2. ¿Maneja datos sensibles? → RLS obligatorio
3. ¿Es accesible públicamente? → CAPTCHA si procede
4. ¿Usa APIs externas? → Secrets management
5. ¿Acepta input del usuario? → Validación backend
6. ¿Genera logs importantes? → Structured logging

🎯 PROMPT ESPECÍFICO PARA LLMs
"Estoy implementando [DESCRIPCIÓN DEL FEATURE] en mi aplicación web.

STACK: [Next.js/Supabase/Vercel]
FEATURE: [Descripción específica]

Necesito que me ayudes a implementar este feature siguiendo las mejores prácticas de seguridad:

1. Rate limiting apropiado para este endpoint
2. Políticas RLS necesarias si maneja datos
3. Validación de inputs del backend
4. Gestión segura de cualquier API key necesaria
5. Logging de eventos importantes
6. Consideraciones de seguridad específicas para este feature

Muéstrame el código completo con todas las medidas de seguridad implementadas."

🔄 MANTENIMIENTO CONTINUO
Semanal:
[ ] Revisar logs de seguridad
[ ] Verificar métricas de rate limiting
[ ] Actualizar dependencias no críticas
Mensual:
[ ] Audit completo de dependencies
[ ] Revisar y actualizar políticas RLS
[ ] Penetration testing básico
[ ] Rotar API keys sensibles
Trimestral:
[ ] Security assessment completo
[ ] Actualizar incident response plan
[ ] Revisar accesos y permisos
[ ] Backup testing

RECUERDA: La seguridad no es opcional. Es mejor invertir 2-3 días extra al inicio que lidiar con un breach después. 🛡️


# SUPER PROMPT TEMPLATE - SISTEMA COMPLETO FULL-STACK CON DEPLOYMENT EN DIGITAL OCEAN

## 🎯 OBJETIVO
Crear un sistema completo full-stack con las siguientes características:
- **Backend**: ASP.NET Core 8.0 Web API con Entity Framework y PostgreSQL
- **Frontend**: React 18 + TypeScript + Material-UI con diseño responsive
- **Autenticación**: JWT + Google OAuth
- **Pagos**: Integración con MercadoPago
- **Containerización**: Docker + Docker Compose
- **Deployment**: Digital Ocean App Platform
- **Proxy Reverso**: Nginx con SSL automático
- **Base de Datos**: PostgreSQL en Digital Ocean

## 🏗️ ARQUITECTURA TÉCNICA

### STACK TECNOLÓGICO
- **Backend**: .NET 8.0, ASP.NET Core Web API, Entity Framework Core, PostgreSQL
- **Frontend**: React 18, TypeScript, Material-UI v5, Redux Toolkit, React Router v6
- **Autenticación**: JWT Bearer + Google OAuth 2.0
- **Pagos**: MercadoPago SDK
- **Containerización**: Docker, Docker Compose
- **Proxy**: Nginx con configuración SSL
- **Deployment**: Digital Ocean App Platform
- **Base de Datos**: PostgreSQL 15 (Digital Ocean Managed Database)

### ESTRUCTURA DE DIRECTORIOS
```
proyecto/
├── .do/
│   └── app.yaml (configuración para Digital Ocean)
├── src/
│   ├── backend/
│   │   └── API/
│   │       ├── Controllers/
│   │       ├── Data/
│   │       ├── Models/
│   │       ├── Services/
│   │       ├── DTOs/
│   │       ├── Utilities/
│   │       ├── Migrations/
│   │       └── Properties/
│   ├── frontend/
│   │   ├── public/
│   │   └── src/
│   │       ├── components/
│   │       ├── pages/
│   │       ├── services/
│   │       ├── store/
│   │       ├── types/
│   │       ├── hooks/
│   │       └── theme/
│   └── mobile/ (opcional)
├── nginx/
├── deploy/
├── docker-compose.yml
├── deploy.yaml (alternativo a .do/app.yaml)
└── README.md
```

## 📋 CONFIGURACIÓN PASO A PASO

### 1. BACKEND - ASP.NET Core 8.0

#### 1.1 Archivo de Proyecto (.csproj)
```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="8.0.4" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="9.0.5">
      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
      <PrivateAssets>all</PrivateAssets>
    </PackageReference>
    <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="9.0.4" />
    <PackageReference Include="Swashbuckle.AspNetCore" Version="6.4.0" />
    <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="8.0.4" />
    <PackageReference Include="Google.Apis.Auth" Version="1.68.0" />
    <PackageReference Include="System.IdentityModel.Tokens.Jwt" Version="7.5.1" />
    <PackageReference Include="mercadopago-sdk" Version="2.5.0" />
  </ItemGroup>
</Project>
```

#### 1.2 Program.cs - Configuración Principal
```csharp
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using [PROYECTO].API.Data;
using [PROYECTO].API.Services;
using [PROYECTO].API.Utilities;

Console.WriteLine("=== INICIANDO APLICACIÓN [NOMBRE_PROYECTO] ===");
Console.WriteLine($"Puerto Environment Variable: {Environment.GetEnvironmentVariable("PORT")}");
Console.WriteLine($"Environment: {Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")}");

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var origins = new List<string> {
            "http://localhost:3000",
            "https://[DOMINIO].com",
            "https://www.[DOMINIO].com"
        };
       
        var frontendUrl = builder.Configuration["FrontendUrl"];
        if (!string.IsNullOrEmpty(frontendUrl))
        {
            origins.Add(frontendUrl);
        }
       
        var additionalOrigins = builder.Configuration["AdditionalCorsOrigins"];
        if (!string.IsNullOrEmpty(additionalOrigins))
        {
            origins.AddRange(additionalOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries));
        }
       
        policy.WithOrigins(origins.ToArray())
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// Configure JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(builder.Configuration["Jwt:Key"] ?? "your-secret-key-here-min-32-characters")),
            ValidateIssuer = false,
            ValidateAudience = false,
            ClockSkew = TimeSpan.Zero
        };
    });

// Configure DbContext
builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    var connectionString = ConfigurationHelper.GetConnectionString(builder.Configuration);
    options.UseNpgsql(connectionString);
    options.ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
});

// Register Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IMercadoPagoService, MercadoPagoService>();

// Configure Swagger with JWT support
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "[PROYECTO] API",
        Version = "v1",
        Description = "API for [DESCRIPCION_PROYECTO]"
    });
   
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
   
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Apply migrations and seed data on startup
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    try
    {
        dbContext.Database.Migrate();
       
        if (app.Environment.IsDevelopment() || Environment.GetEnvironmentVariable("SEED_DATA") == "true")
        {
            await ApplicationDbContextSeed.SeedAsync(dbContext);
        }
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while migrating the database or seeding data.");
    }
}

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment() || builder.Configuration.GetValue<bool>("EnableSwaggerInProduction", false))
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "[PROYECTO] API v1");
    });
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

// Health check endpoints
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));
app.MapGet("/ping", () => Results.Ok(new { status = "pong", timestamp = DateTime.UtcNow }));

app.MapControllers();

// Configure port for Digital Ocean (CRITICAL for deployment)
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
var url = $"http://0.0.0.0:{port}";
Console.WriteLine($"Aplicación escuchará en: {url}");

app.Run(url);
```

#### 1.3 ConfigurationHelper.cs - Manejo de Connection Strings
```csharp
using System.Text.RegularExpressions;

namespace [PROYECTO].API.Utilities
{
    public static class ConfigurationHelper
    {
        public static string GetConnectionString(IConfiguration configuration)
        {
            var connectionString = configuration.GetConnectionString("DefaultConnection");
           
            if (string.IsNullOrEmpty(connectionString))
            {
                connectionString = Environment.GetEnvironmentVariable("DATABASE_URL");
            }
           
            if (string.IsNullOrEmpty(connectionString))
            {
                throw new InvalidOperationException("No database connection string found");
            }
           
            if (connectionString.Contains("Host=") || connectionString.Contains("Server="))
            {
                return connectionString;
            }
           
            return ConvertPostgreSqlUrlToConnectionString(connectionString);
        }
       
        private static string ConvertPostgreSqlUrlToConnectionString(string databaseUrl)
        {
            var regex = new Regex(@"^postgres(?:ql)?://(?<username>[^:]+):(?<password>[^@]+)@(?<host>[^:]+):(?<port>\d+)/(?<database>[^?]+)(?:\?(?<params>.*))?$");
            var match = regex.Match(databaseUrl);
           
            if (!match.Success)
            {
                return databaseUrl;
            }
           
            var host = match.Groups["host"].Value;
            var port = match.Groups["port"].Value;
            var database = match.Groups["database"].Value;
            var username = match.Groups["username"].Value;
            var password = match.Groups["password"].Value;
            var parameters = match.Groups["params"].Value;
           
            var connectionString = $"Host={host};Port={port};Database={database};Username={username};Password={password}";
           
            if (parameters.Contains("sslmode=require", StringComparison.OrdinalIgnoreCase))
            {
                connectionString += ";SslMode=Require";
            }
           
            return connectionString;
        }
    }
}
```

#### 1.4 ApplicationDbContext.cs - Configuración Base
```csharp
using Microsoft.EntityFrameworkCore;
using [PROYECTO].API.Models;

namespace [PROYECTO].API.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        // DbSets principales
        public DbSet<User> Users { get; set; }
        // Agregar más DbSets según el dominio del proyecto

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configuraciones de entidades
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();
           
            modelBuilder.Entity<User>()
                .HasIndex(u => u.GoogleId)
                .IsUnique();

            // Configuraciones específicas del dominio
            // Agregar más configuraciones según las entidades del proyecto
        }
    }
}
```

#### 1.5 appsettings.json - Configuración de Desarrollo
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=host.docker.internal;Database=[PROYECTO]db;Username=postgres;Password=[PASSWORD]"
  },
  "Jwt": {
    "Key": "your-secret-key-here-minimum-32-characters-long",
    "Issuer": "[PROYECTO]API",
    "Audience": "[PROYECTO]Users"
  },
  "Google": {
    "ClientId": "YOUR_GOOGLE_CLIENT_ID_HERE"
  },
  "MercadoPago": {
    "AccessToken": "YOUR_ACCESS_TOKEN_HERE"
  },
  "FrontendUrl": "http://localhost:3000",
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

#### 1.6 appsettings.Production.json - Configuración de Producción
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "ConnectionStrings": {
    "DefaultConnection": "[DIGITAL_OCEAN_DATABASE_CONNECTION_STRING]"
  },
  "AllowedHosts": "*",
  "Jwt": {
    "Key": "YOUR_PRODUCTION_JWT_SECRET_KEY_HERE_MINIMUM_32_CHARACTERS",
    "Issuer": "[PROYECTO]API",
    "Audience": "[PROYECTO]App"
  },
  "Google": {
    "ClientId": "YOUR_GOOGLE_CLIENT_ID"
  },
  "MercadoPago": {
    "AccessToken": "YOUR_MERCADOPAGO_ACCESS_TOKEN",
    "PublicKey": "YOUR_MERCADOPAGO_PUBLIC_KEY"
  },
  "FrontendUrl": "https://[DOMINIO].com",
  "BackendUrl": "https://[DOMINIO].com"
}
```

#### 1.7 Dockerfile - Backend
```dockerfile
# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY ["[PROYECTO].API.csproj", "./"]
RUN dotnet restore "[PROYECTO].API.csproj"

# Copy everything else and build
COPY . .
RUN dotnet build "[PROYECTO].API.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "[PROYECTO].API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS final
WORKDIR /app

# Install dependencies and configure non-root user
RUN apk add --no-cache icu-libs krb5-libs libgcc libintl libssl3 libstdc++ zlib && \
    adduser -D -u 1000 appuser

# Copy published files
COPY --from=publish --chown=appuser:appuser /app/publish .

# Configure non-root user
USER appuser

# Set environment variables
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_HTTP_PORTS=8080

# Expose port and set entry point
EXPOSE 8080
ENTRYPOINT ["dotnet", "[PROYECTO].API.dll"]
```

### 2. FRONTEND - React 18 + TypeScript + Material-UI

#### 2.1 package.json - Dependencias Frontend
```json
{
  "name": "[proyecto]-frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@emotion/react": "^11.11.3",
    "@emotion/styled": "^11.11.0",
    "@mui/icons-material": "^5.15.3",
    "@mui/material": "^5.15.3",
    "@mui/x-data-grid": "^6.18.7",
    "@mui/x-date-pickers": "^6.18.7",
    "@reduxjs/toolkit": "^2.0.1",
    "@tanstack/react-query": "^5.17.9",
    "@testing-library/jest-dom": "^5.17.0",
    "@testing-library/react": "^13.4.0",
    "@testing-library/user-event": "^13.5.0",
    "@types/jest": "^27.5.2",
    "@types/node": "^16.18.68",
    "@types/react": "^18.2.47",
    "@types/react-beautiful-dnd": "^13.1.8",
    "@types/react-dom": "^18.2.18",
    "axios": "^1.6.5",
    "date-fns": "^2.30.0",
    "framer-motion": "^12.23.0",
    "lottie-react": "^2.4.1",
    "react": "^18.2.0",
    "react-beautiful-dnd": "^13.1.1",
    "react-dom": "^18.2.0",
    "react-redux": "^9.0.4",
    "react-router-dom": "^6.21.1",
    "react-scripts": "5.0.1",
    "recharts": "^2.10.4",
    "typescript": "^4.9.5",
    "web-vitals": "^2.1.4"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "proxy": "http://localhost:5080"
}
```

#### 2.2 App.tsx - Configuración Principal React
```tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { store } from './store';
import { AdminLayout } from './layouts/AdminLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
// Importar más páginas según el proyecto
import { PrivateRoute } from './components/PrivateRoute';
import { [PROYECTO]Theme } from './theme/theme';

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={[PROYECTO]Theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
          <CssBaseline />
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <AdminLayout />
                  </PrivateRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                {/* Agregar más rutas según el proyecto */}
              </Route>
            </Routes>
          </Router>
        </LocalizationProvider>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
```

#### 2.3 index.css - Estilos Base Responsive
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: linear-gradient(135deg, #000000 0%, #1A1A1A 100%);
  color: #FFFFFF;
  overflow-x: hidden;
}

/* Responsive Design */
@media (max-width: 768px) {
  body {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  body {
    font-size: 12px;
  }
}

/* Scrollbar personalizada */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #111111;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #FFFF00;
  border-radius: 4px;
  transition: background 0.3s ease;
}

::-webkit-scrollbar-thumb:hover {
  background: #FFFF66;
}

/* Animaciones globales */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Clases utilitarias */
.fade-in-up {
  animation: fadeInUp 0.8s ease-out;
}

.slide-in-left {
  animation: slideInLeft 0.8s ease-out;
}

.slide-in-right {
  animation: slideInRight 0.8s ease-out;
}

/* Efectos de hover globales */
.hover-lift {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.hover-lift:hover {
  transform: translateY(-4px);
}

.hover-glow {
  transition: box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.hover-glow:hover {
  box-shadow: 0 0 20px rgba(255, 255, 0, 0.2);
}

/* Responsive utilities */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}

@media (max-width: 768px) {
  .container {
    padding: 0 12px;
  }
}

.grid {
  display: grid;
  gap: 16px;
}

.grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid-cols-4 { grid-template-columns: repeat(4, 1fr); }

@media (max-width: 768px) {
  .grid-cols-2,
  .grid-cols-3,
  .grid-cols-4 {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .grid-cols-3,
  .grid-cols-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

#### 2.4 Dockerfile - Frontend
```dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci

# Copy env.production for build time variables
COPY .env.production .env

COPY . .
RUN npm run build

FROM nginx:alpine
# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/*
# Copy built app
COPY --from=build /app/build /usr/share/nginx/html
# Copy production nginx config
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 3. CONTAINERIZACIÓN

#### 3.1 docker-compose.yml - Desarrollo Local
```yaml
services:
  api:
    build:
      context: ./src/backend/[PROYECTO].API
      dockerfile: Dockerfile
    ports:
      - "5000:8080"
    environment:
      - ASPNETCORE_ENVIRONMENT=${ASPNETCORE_ENVIRONMENT:-Development}
      - ConnectionStrings__DefaultConnection=Host=host.docker.internal;Port=5432;Database=[proyecto]db;Username=postgres;Password=[PASSWORD]
      - Jwt__Key=${JWT_KEY:-your-secret-key-here-minimum-32-characters-long}
      - Google__ClientId=${GOOGLE_CLIENT_ID:-YOUR_GOOGLE_CLIENT_ID_HERE}
      - MercadoPago__AccessToken=${MERCADOPAGO_ACCESS_TOKEN}
      - FrontendUrl=http://localhost:3000

  client:
    build:
      context: ./src/frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    environment:
      - REACT_APP_API_URL=/api
      - REACT_APP_MERCADOPAGO_PUBLIC_KEY=${MERCADOPAGO_PUBLIC_KEY}
      - REACT_APP_APP_NAME=[PROYECTO_NAME]
    depends_on:
      - api

volumes:
  postgres_data:
```

### 4. NGINX - PROXY REVERSO Y SSL

#### 4.1 nginx.conf - Configuración de Producción
```nginx
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml application/atom+xml image/svg+xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;

    resolver 127.0.0.11 valid=30s;

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name [DOMINIO].com api.[DOMINIO].com www.[DOMINIO].com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    # API Server
    server {
        listen 443 ssl http2;
        server_name api.[DOMINIO].com;

        ssl_certificate /etc/letsencrypt/live/[DOMINIO].com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/[DOMINIO].com/privkey.pem;
       
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        location / {
            limit_req zone=api_limit burst=20 nodelay;
           
            set $backend "http://api:8080";
            proxy_pass $backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
           
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        location /health {
            set $backend "http://api:8080";
            proxy_pass $backend/health;
            access_log off;
        }
    }

    # Frontend Server
    server {
        listen 443 ssl http2;
        server_name [DOMINIO].com www.[DOMINIO].com;

        ssl_certificate /etc/letsencrypt/live/[DOMINIO].com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/[DOMINIO].com/privkey.pem;
       
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        location / {
            limit_req zone=general_limit burst=50 nodelay;
           
            set $frontend "http://client:80";
            proxy_pass $frontend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
       
        # Cache static assets
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
            set $frontend "http://client:80";
            proxy_pass $frontend;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### 5. DEPLOYMENT EN DIGITAL OCEAN

#### 5.1 Estructura de Archivos para Digital Ocean
Para Digital Ocean App Platform, crear la siguiente estructura:

```
proyecto/
├── .do/
│   └── app.yaml
├── deploy.yaml (archivo raíz alternativo)
└── ... resto del proyecto
```

#### 5.2 .do/app.yaml - Configuración Monorepo Digital Ocean
```yaml
name: [proyecto]-app

static_sites:
- name: frontend
  environment_slug: html
  github:
    repo: [USUARIO]/[PROYECTO]
    branch: main
    deploy_on_push: true
  source_dir: src/frontend
  dockerfile_path: src/frontend/Dockerfile.prod
  output_dir: /usr/share/nginx/html
  routes:
  - path: /
  envs:
  - key: REACT_APP_API_URL
    value: "/api"
  - key: REACT_APP_MERCADOPAGO_PUBLIC_KEY
    value: "${MERCADOPAGO_PUBLIC_KEY}"
  - key: REACT_APP_APP_NAME
    value: "[PROYECTO_NAME]"

services:
- name: api
  environment_slug: node
  github:
    repo: [USUARIO]/[PROYECTO]
    branch: main
    deploy_on_push: true
  source_dir: src/backend/[PROYECTO].API
  dockerfile_path: src/backend/[PROYECTO].API/Dockerfile.prod
  http_port: 8080
  instance_count: 1
  instance_size_slug: basic-xxs
  routes:
  - path: /api
    preserve_path_prefix: true
  health_check:
    http_path: /health
    timeout_seconds: 10
    interval_seconds: 30
  envs:
  - key: ASPNETCORE_ENVIRONMENT
    value: "Production"
  - key: ASPNETCORE_URLS
    value: "http://+:8080"
  - key: DATABASE_URL
    value: "${db.DATABASE_URL}"
  - key: ConnectionStrings__DefaultConnection
    value: "[DIGITAL_OCEAN_DATABASE_CONNECTION_STRING]"
  - key: Jwt__Key
    value: "${JWT_KEY}"
    type: SECRET
  - key: Google__ClientId
    value: "${GOOGLE_CLIENT_ID}"
  - key: MercadoPago__AccessToken
    value: "${MERCADOPAGO_ACCESS_TOKEN}"
    type: SECRET
  - key: MercadoPago__PublicKey
    value: "${MERCADOPAGO_PUBLIC_KEY}"
  - key: FrontendUrl
    value: "https://[DOMINIO].com"
  - key: EnableSwaggerInProduction
    value: "true"
  - key: SEED_DATA
    value: "true"
  - key: BackendUrl
    value: "${APP_URL}"
  - key: MercadoPago__WebhookSecret
    value: "${MERCADOPAGO_WEBHOOK_SECRET}"
    type: SECRET

databases:
- name: db
  engine: PG
  version: "15"
  size: db-s-dev-database
  num_nodes: 1
```

#### 5.3 deploy.yaml - Digital Ocean App Platform (Alternativo)
```yaml
name: [proyecto]-app
region: nyc
services:
- name: api
  dockerfile_path: src/backend/[PROYECTO].API/Dockerfile.prod
  source_dir: /
  http_port: 443
  instance_count: 1
  instance_size_slug: basic-xxs
  routes:
  - path: /api
    preserve_path_prefix: true
  health_check:
    http_path: /health
    timeout_seconds: 10
    interval_seconds: 30
  envs:
  - key: ASPNETCORE_ENVIRONMENT
    value: "Production"
  - key: ASPNETCORE_URLS
    value: "http://+:443"
  - key: DATABASE_URL
    value: "${db.DATABASE_URL}"
  - key: ConnectionStrings__DefaultConnection
    value: "[DIGITAL_OCEAN_DATABASE_CONNECTION_STRING]"
  - key: Jwt__Key
    value: "${JWT_KEY}"
    type: SECRET
  - key: Google__ClientId
    value: "${GOOGLE_CLIENT_ID}"
  - key: MercadoPago__AccessToken
    value: "${MERCADOPAGO_ACCESS_TOKEN}"
    type: SECRET
  - key: MercadoPago__PublicKey
    value: "${MERCADOPAGO_PUBLIC_KEY}"
  - key: FrontendUrl
    value: "https://[DOMINIO].com"
  - key: EnableSwaggerInProduction
    value: "true"
  - key: SEED_DATA
    value: "true"
  - key: BackendUrl
    value: "${APP_URL}"
  - key: MercadoPago__WebhookSecret
    value: "${MERCADOPAGO_WEBHOOK_SECRET}"
    type: SECRET

- name: frontend
  dockerfile_path: src/frontend/Dockerfile.prod
  source_dir: src/frontend
  http_port: 80
  instance_count: 1
  instance_size_slug: basic-xxs
  routes:
  - path: /
  health_check:
    http_path: /health
    timeout_seconds: 10
    interval_seconds: 30
  envs:
  - key: REACT_APP_API_URL
    value: "/api"
  - key: REACT_APP_MERCADOPAGO_PUBLIC_KEY
    value: "${MERCADOPAGO_PUBLIC_KEY}"
  - key: REACT_APP_APP_NAME
    value: "[PROYECTO_NAME]"

databases:
- name: db
  engine: PG
  version: "15"
  size: db-s-dev-database
  num_nodes: 1
```

## 🔧 VARIABLES DE ENTORNO REQUERIDAS

### Variables de Desarrollo (.env)
```bash
# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@localhost:5432/[proyecto]db

# JWT
JWT_KEY=your-secret-key-here-minimum-32-characters-long

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=your-mercadopago-access-token
MERCADOPAGO_PUBLIC_KEY=your-mercadopago-public-key
MERCADOPAGO_WEBHOOK_SECRET=your-webhook-secret

# Frontend
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_MERCADOPAGO_PUBLIC_KEY=your-mercadopago-public-key
REACT_APP_APP_NAME=[PROYECTO_NAME]
```

### Variables de Producción (Digital Ocean)
```bash
# Database (Auto-generated por Digital Ocean)
DATABASE_URL=${db.DATABASE_URL}

# JWT (Secret)
JWT_KEY=production-jwt-secret-key-minimum-32-characters

# Google OAuth
GOOGLE_CLIENT_ID=production-google-client-id

# MercadoPago (Secrets)
MERCADOPAGO_ACCESS_TOKEN=production-mercadopago-access-token
MERCADOPAGO_PUBLIC_KEY=production-mercadopago-public-key
MERCADOPAGO_WEBHOOK_SECRET=production-webhook-secret

# URLs
FRONTEND_URL=https://[DOMINIO].com
BACKEND_URL=https://api.[DOMINIO].com

# App Settings
ENABLE_SWAGGER_IN_PRODUCTION=true
SEED_DATA=false
```

## 🚀 COMANDOS DE DEPLOYMENT

### 1. Desarrollo Local
```bash
# Clonar y configurar
git clone [REPO_URL]
cd [PROYECTO]

# Configurar variables de entorno
cp .env.example .env
# Editar .env con valores reales

# Levantar con Docker Compose
docker-compose up --build

# O ejecutar individualmente
cd src/backend/[PROYECTO].API
dotnet run

cd src/frontend
npm install
npm start
```

### 2. Deploy en Digital Ocean
```bash
# Instalar doctl CLI
# Configurar doctl auth

# OPCIÓN 1: Deploy usando .do/app.yaml (Recomendado para monorepos)
# Digital Ocean detectará automáticamente el archivo .do/app.yaml
# Solo necesitas conectar tu repositorio en el dashboard de Digital Ocean

# OPCIÓN 2: Deploy usando deploy.yaml
doctl apps create --spec deploy.yaml

# OPCIÓN 3: Deploy usando Docker Registry
docker build -t registry.digitalocean.com/[REGISTRY]/[PROYECTO]-api:latest ./src/backend/[PROYECTO].API
docker build -t registry.digitalocean.com/[REGISTRY]/[PROYECTO]-frontend:latest ./src/frontend

docker push registry.digitalocean.com/[REGISTRY]/[PROYECTO]-api:latest
docker push registry.digitalocean.com/[REGISTRY]/[PROYECTO]-frontend:latest

# OPCIÓN 4: Deploy directo desde GitHub (usando .do/app.yaml)
# 1. Crear archivo .do/app.yaml en el repositorio
# 2. Conectar repositorio en Digital Ocean App Platform
# 3. Digital Ocean detectará automáticamente la configuración
# 4. Deploy automático en cada push a main
```

## 📋 CHECKLIST PRE-DEPLOYMENT

### Backend ✅
- [ ] Configurar connection strings para PostgreSQL
- [ ] Configurar JWT secrets seguros
- [ ] Implementar Google OAuth
- [ ] Configurar MercadoPago
- [ ] Configurar CORS correctamente
- [ ] Implementar health checks
- [ ] Configurar logging
- [ ] Implementar migraciones de DB
- [ ] Configurar Swagger para producción

### Frontend ✅
- [ ] Configurar variables de entorno
- [ ] Implementar diseño responsive
- [ ] Configurar rutas protegidas
- [ ] Implementar manejo de estados (Redux)
- [ ] Configurar interceptores de API
- [ ] Implementar manejo de errores
- [ ] Optimizar build para producción
- [ ] Configurar PWA (opcional)

### DevOps ✅
- [ ] Configurar Dockerfiles optimizados
- [ ] Configurar docker-compose para desarrollo
- [ ] Configurar nginx con SSL
- [ ] Configurar rate limiting
- [ ] Configurar health checks
- [ ] Configurar logging centralizado
- [ ] Configurar monitoreo
- [ ] Configurar backups de DB

### Digital Ocean ✅
- [ ] Crear carpeta `.do/` en el root del proyecto
- [ ] Crear archivo `app.yaml` dentro de `.do/`
- [ ] Crear Managed Database PostgreSQL
- [ ] Configurar App Platform (conectar repositorio GitHub)
- [ ] Configurar dominios y SSL
- [ ] Configurar variables de entorno
- [ ] Configurar secrets
- [ ] Configurar alertas
- [ ] Configurar scaling automático
- [ ] Verificar deploy automático en push a main

## 🔒 SEGURIDAD

### Configuraciones Críticas
- JWT secrets de mínimo 32 caracteres
- HTTPS obligatorio en producción
- Rate limiting configurado
- Headers de seguridad implementados
- CORS configurado correctamente
- Validación de entrada en todos los endpoints
- Sanitización de datos
- Logging de eventos de seguridad

### Variables Sensibles (usar como SECRETS en Digital Ocean)
- JWT_KEY
- MERCADOPAGO_ACCESS_TOKEN
- MERCADOPAGO_WEBHOOK_SECRET
- DATABASE_URL (si no es auto-generada)
- GOOGLE_CLIENT_SECRET (si se usa)

## 📚 DOCUMENTACIÓN ADICIONAL

### APIs Principales
- Health Check: `GET /health`
- Authentication: `POST /api/auth/login`
- Google OAuth: `POST /api/auth/google`
- MercadoPago: `POST /api/payments/create`

### Estructura de Respuestas
```json
{
  "success": true,
  "data": {},
  "message": "Success message",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Códigos de Error Estándar
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Too Many Requests
- 500: Internal Server Error

---

## 🎯 INSTRUCCIONES FINALES

**REEMPLAZAR LOS SIGUIENTES PLACEHOLDERS:**
- `[PROYECTO]` → Nombre del proyecto en PascalCase
- `[proyecto]` → Nombre del proyecto en lowercase
- `[PROYECTO_NAME]` → Nombre display del proyecto
- `[DOMINIO]` → Dominio de producción
- `[PASSWORD]` → Contraseñas seguras
- `[DESCRIPCION_PROYECTO]` → Descripción del proyecto
- `[REPO_URL]` → URL del repositorio
- `[REGISTRY]` → Registry de Digital Ocean

**CONFIGURAR ANTES DEL DEPLOYMENT:**
1. Crear carpeta `.do/` en el root del proyecto
2. Crear archivo `app.yaml` dentro de `.do/` con la configuración del proyecto
3. Crear base de datos PostgreSQL en Digital Ocean
4. Configurar dominio y DNS
5. Obtener credenciales de Google OAuth
6. Configurar cuenta de MercadoPago
7. Generar JWT secrets seguros
8. Conectar repositorio GitHub con Digital Ocean App Platform
9. Configurar variables de entorno en Digital Ocean App Platform
10. Verificar deploy automático funcionando

Este template está optimizado para Digital Ocean App Platform y incluye todas las mejores prácticas de seguridad, performance y escalabilidad.


 CONFIGURACIONES CRÍTICAS
1. Backend (.NET) - Program.cs
csharp
Apply to Dockerfile.p...
// CRÍTICO: Leer el puerto de Digital Ocean
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
var url = $"http://0.0.0.0:{port}";
app.Run(url);
// CRÍTICO: Endpoints de health check
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));
app.MapGet("/ping", () => Results.Ok(new { status = "pong", timestamp = DateTime.UtcNow }));
2. Backend Dockerfile.prod
dockerfile
Apply to Dockerfile.p...
# CRÍTICO: Variables de entorno para Digital Ocean
ENV ASPNETCORE_URLS=http://+:8080
ENV PORT=8080
# CRÍTICO: Instalar curl para healthcheck
RUN apk add --no-cache curl
# CRÍTICO: Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT}/ping || exit 1
3. Frontend Dockerfile.prod
dockerfile
Apply to Dockerfile.p...
# CRÍTICO: Instalar curl para healthcheck
RUN apk add --no-cache curl
# CRÍTICO: Healthcheck para nginx
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:80/health || exit 1
4. Frontend nginx.prod.conf
nginx
Apply to Dockerfile.p...
# CRÍTICO: Health check endpoint
location /health {
    access_log off;
    return 200 "healthy\n";
    add_header Content-Type text/plain;
}
5. deploy.yaml - Configuración esencial
yaml
Apply to Dockerfile.p...
services:
- name: api
  http_port: 8080  # DEBE coincidir con el puerto del backend
  health_check:
    http_path: /ping  # O /health
    timeout_seconds: 10
    interval_seconds: 30
  envs:
  - key: DATABASE_URL
    value: "${db.DATABASE_URL}"
  - key: ConnectionStrings__DefaultConnection
    value: "tu-connection-string"
  
- name: frontend
  http_port: 80
  health_check:
    http_path: /health
    timeout_seconds: 10
    interval_seconds: 30
🔧 ELEMENTOS TÉCNICOS CLAVE
Base de Datos
csharp
Apply to Dockerfile.p...
// En Program.cs - CRÍTICO: Configuración de DB
var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL") 
    ?? builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString));
CORS - Configuración esencial
csharp
Apply to Dockerfile.p...
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var origins = new[] { "http://localhost:3000" };
        
        if (builder.Environment.IsProduction())
        {
            origins = origins.Concat(new[] { "https://tu-app.ondigitalocean.app" }).ToArray();
        }
        
        policy.WithOrigins(origins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});
📋 CHECKLIST FUNDAMENTAL
✅ Antes del Deploy
[ ] Backend lee variable PORT de entorno
[ ] Endpoints /health y /ping implementados
[ ] Healthchecks en ambos Dockerfiles
[ ] CORS configurado correctamente
[ ] Variables de entorno en deploy.yaml
[ ] Puertos coinciden entre Dockerfile y deploy.yaml
✅ Estructura de Archivos Mínima
text
Apply to Dockerfile.p...
proyecto/
├── deploy.yaml
├── src/
│   ├── backend/
│   │   ├── Dockerfile.prod
│   │   ├── Program.cs
│   │   └── Controllers/
│   └── frontend/
│       ├── Dockerfile.prod
│       ├── nginx.prod.conf
│       └── src/
✅ Variables de Entorno Críticas
yaml
Apply to Dockerfile.p...
# Backend
- DATABASE_URL
- JWT_KEY
- ASPNETCORE_ENVIRONMENT=Production
# Frontend  
- REACT_APP_API_URL=/api
🚨 ERRORES COMUNES A EVITAR
Puerto desalineado entre Dockerfile y deploy.yaml
Falta de healthchecks → App no inicia
CORS mal configurado → Frontend no conecta
Variables de entorno faltantes → Crash en runtime
No leer variable PORT → Digital Ocean no puede conectar
🎯 COMANDO MÍNIMO PARA EMPEZAR
bash
Apply to Dockerfile.p...
Run
# 1. Crear estructura
mkdir mi-proyecto && cd mi-proyecto
mkdir -p src/backend src/frontend
# 2. Crear deploy.yaml con la estructura mostrada arriba
# 3. Configurar Dockerfiles con healthchecks
# 4. Implementar lectura de PORT en Program.cs
# 5. Deploy: doctl apps create deploy.yaml
Con estos elementos, cualquier proyecto .NET + React debería funcionar en Digital Ocean desde el primer deploy!
