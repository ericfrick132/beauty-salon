 Cómo funciona el sistema multi-tenant:

  1. Verticales disponibles (ya configurados en el seed):
  - Barberías (barbershop) - Tema negro/amarillo, terminología "Barbero/Turno"
  - Peluquerías (beautysalon) - Tema rosa/blanco, terminología "Estilista/Cita"
  - Centros de Estética (aesthetics) - Tema lavanda/púrpura, terminología "Esteticista/Reserva"

  2. Arquitectura de aislamiento:
  - Cada tenant tiene su propio schema PostgreSQL (tenant_guid)
  - Datos completamente aislados entre tenants
  - Tablas maestras compartidas en schema public (verticales, planes, tenants)

  3. Acceso por dominio:
  - Subdominio: mibarberia.barbershop.com
  - Dominio personalizado: mibarberia.com (opcional)
  - El middleware detecta automáticamente el tenant por el dominio

  4. Personalización automática:
  Cada tenant hereda de su vertical:
  - Colores y tema visual
  - Servicios predeterminados (Corte $15, Barba $10, etc.)
  - Terminología (Barbero vs Estilista vs Esteticista)
  - Características habilitadas (pagos online, SMS, programa de lealtad)

  5. Creación de nuevos tenants:
  Desde el panel de SuperAdmin puedes:
  1. Elegir el vertical (barbería, peluquería, estética)
  2. Definir subdomain único
  3. El sistema automáticamente:
    - Crea el schema PostgreSQL
    - Configura las tablas
    - Aplica configuraciones del vertical
    - Habilita el acceso

  Ejemplo práctico:
  - Tenant 1: elitebarber.barbershop.com - Barbería con tema negro/amarillo
  - Tenant 2: glamour.beautysalon.com - Peluquería con tema rosa
  - Tenant 3: zen.aesthetics.com - Centro estética con tema lavanda

  Cada uno opera independientemente con sus propios clientes, citas, profesionales y configuraciones.





# BookingPro - SaaS Multi-Tenant para Gestión de Turnos

Sistema SaaS multi-tenant para gestión de reservas y turnos, segmentado en tres verticales: barberías, peluquerías y centros de estética.

## 🏗️ Arquitectura

- **Backend**: .NET Core 8.0 Web API con Entity Framework y PostgreSQL
- **Frontend**: React 18 + TypeScript + Material-UI
- **Base de Datos**: PostgreSQL 16 con esquemas por tenant
- **Deployment**: Digital Ocean App Platform
- **Containerización**: Docker + Docker Compose

## 🚀 Quick Start

### Prerrequisitos

- .NET 8.0 SDK
- Node.js 18+
- PostgreSQL 16
- Docker (opcional)

### Configuración Local

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd Bookear
```

2. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con valores reales
```

3. **Configurar PostgreSQL**
```sql
CREATE DATABASE bookingprodb;
CREATE USER postgres WITH PASSWORD 'password123';
GRANT ALL PRIVILEGES ON DATABASE bookingprodb TO postgres;
```

4. **Ejecutar con Docker Compose**
```bash
docker-compose up --build
```

O ejecutar individualmente:

5. **Backend**
```bash
cd src/backend/BookingPro.API
dotnet restore
dotnet run
```

6. **Frontend**
```bash
cd src/frontend
npm install
npm start
```

## 🌐 Deployment en Digital Ocean

### Opción 1: Automático con GitHub (Recomendado)

1. Conectar repositorio en Digital Ocean App Platform
2. Digital Ocean detectará automáticamente el archivo `.do/app.yaml`
3. Configurar variables de entorno en el dashboard
4. Deploy automático en cada push a `master`

### Opción 2: CLI

```bash
# Instalar doctl CLI
doctl apps create --spec deploy.yaml
```

### Variables de Entorno Requeridas

```bash
# En Digital Ocean App Platform
DATABASE_URL=${db.DATABASE_URL}  # Auto-generada
JWT_KEY=your-production-jwt-secret-32-chars-minimum
ASPNETCORE_ENVIRONMENT=Production
REACT_APP_API_URL=/api
REACT_APP_APP_NAME=BookingPro
```

## 📊 Estructura de Base de Datos

### Schema Público (Compartido)
- `verticals` - Configuración de verticales (barbershop, beautysalon, aesthetics)
- `tenants` - Información de inquilinos
- `plans` - Planes de suscripción
- `users` - Usuarios del sistema
- `subscriptions` - Suscripciones activas

### Schema por Tenant
- `services` - Servicios ofrecidos
- `professionals` - Profesionales
- `customers` - Clientes
- `bookings` - Reservas/Turnos
- `service_categories` - Categorías de servicios

## 🔧 API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/validate` - Validar token

### Tenant
- `GET /api/tenant/config` - Configuración del tenant
- `GET /api/tenant/info` - Información del tenant

### Bookings
- `GET /api/bookings` - Listar reservas
- `GET /api/bookings/{id}` - Obtener reserva
- `POST /api/bookings` - Crear reserva
- `PUT /api/bookings/{id}` - Actualizar reserva
- `DELETE /api/bookings/{id}` - Eliminar reserva

### Admin (Super Admin)
- `POST /api/admin/tenantmanagement/provision` - Provisionar nuevo tenant
- `GET /api/admin/tenantmanagement/tenants` - Listar tenants
- `GET /api/admin/tenantmanagement/check-subdomain` - Verificar disponibilidad

## 🎨 Personalización por Vertical

Cada vertical tiene su propia configuración:

### Barbershop
- **Dominio**: `barbershop.com`
- **Colores**: Negro + Amarillo
- **Terminología**: Barbero, Cliente, Turno

### Beauty Salon
- **Dominio**: `beautysalon.com`
- **Colores**: Rosa + Blanco + Dorado
- **Terminología**: Estilista, Cliente, Cita

### Aesthetics
- **Dominio**: `aesthetics.com`
- **Colores**: Lavanda + Púrpura
- **Terminología**: Esteticista, Cliente, Reserva

## 🔒 Seguridad

### Sistema Super Admin
- **Login**: `/super-admin/login` 
- **Credenciales iniciales**: 
  - Email: `admin@bookingpro.com`
  - Password: `BookingPro2024!` (cambiar después del primer login)
- **Dashboard**: `/super-admin/dashboard` para gestión de tenants

### Multi-Tenant Security
- **Query Filters Globales**: Filtrado automático por `TenantId` a nivel DbContext
- **Aislamiento de Datos**: Cada consulta automáticamente filtra por tenant actual
- **Middleware de Resolución**: Establece contexto de tenant por subdomain/domain
- **JWT Authentication**: Tokens con expiración de 24 horas
- **Row Level Security**: Implementado via Entity Framework Query Filters

### Medidas de Seguridad Adicionales
- Rate limiting configurado (API: 10r/s, General: 30r/s)
- CORS configurado para múltiples dominios
- Headers de seguridad implementados
- Validación de entrada en todos los endpoints
- Sanitización de datos automática

## 🧪 Testing

```bash
# Backend
cd src/backend/BookingPro.API
dotnet test

# Frontend
cd src/frontend
npm test
```

## 📁 Estructura del Proyecto

```
Bookear/
├── .do/
│   └── app.yaml                    # Configuración DO App Platform
├── src/
│   ├── backend/
│   │   └── BookingPro.API/
│   │       ├── Controllers/        # API Controllers
│   │       ├── Data/              # DbContexts
│   │       ├── Models/            # Entidades
│   │       ├── Services/          # Servicios de negocio
│   │       ├── DTOs/              # Data Transfer Objects
│   │       ├── Utilities/         # Helpers y middleware
│   │       └── Dockerfile.prod    # Docker para producción
│   └── frontend/
│       ├── src/
│       │   ├── components/        # Componentes React
│       │   ├── pages/            # Páginas
│       │   ├── services/         # API client
│       │   ├── store/            # Redux store
│       │   ├── types/            # TypeScript types
│       │   └── contexts/         # React contexts
│       ├── Dockerfile.prod       # Docker para producción
│       └── nginx.prod.conf       # Nginx para producción
├── nginx/
│   └── nginx.conf                # Nginx para desarrollo
├── docker-compose.yml            # Desarrollo local
├── deploy.yaml                   # DO deployment config
└── README.md
```

## 📝 Logs y Monitoreo

Los logs estructurados se envían a:
- Console (desarrollo)
- PostgreSQL (producción)
- Digital Ocean Logs (automático)

## 🐛 Troubleshooting

### Error de conexión a BD
- Verificar `DATABASE_URL` en variables de entorno
- Asegurar que PostgreSQL esté ejecutándose
- Verificar permisos de usuario

### Frontend no carga configuración
- Verificar que el tenant existe en la BD
- Revisar configuración de CORS
- Verificar subdomain/domain del tenant

### Docker issues
- Verificar que todos los puertos estén disponibles
- Limpiar containers: `docker-compose down -v`
- Rebuild: `docker-compose up --build`

## 🤝 Contribución

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 📞 Soporte

Para soporte técnico:
- 📧 Email: support@bookingpro.com
- 📚 Documentación: [docs.bookingpro.com](https://docs.bookingpro.com)
- 🐛 Issues: [GitHub Issues](https://github.com/usuario/Bookear/issues)

---

⚡ **Desarrollado con .NET 8, React 18 y desplegado en Digital Ocean App Platform**