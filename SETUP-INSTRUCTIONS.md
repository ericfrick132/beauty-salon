# 🚀 Setup Instructions - BookingPro

## Pasos Rápidos para Ejecutar

### 1. Configurar PostgreSQL

Asegúrate de que PostgreSQL esté corriendo y ejecuta:

```sql
-- Conectar a PostgreSQL como superuser
CREATE DATABASE bookingprodb;
CREATE USER bookingpro WITH PASSWORD 'password123';
GRANT ALL PRIVILEGES ON DATABASE bookingprodb TO bookingpro;
ALTER USER bookingpro CREATEDB;
```

### 2. Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# El archivo .env debería contener:
DATABASE_URL=postgresql://postgres:password123@localhost:5432/bookingprodb
JWT_KEY=your-secret-key-here-minimum-32-characters-long
ASPNETCORE_ENVIRONMENT=Development
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_APP_NAME=BookingPro
SEED_DATA=true
```

### 3. Ejecutar con Docker Compose

```bash
docker-compose up --build
```

### 4. Acceder al Sistema

- **Super Admin**: http://localhost:3000/super-admin/login
  - Email: `admin@bookingpro.com`
  - Password: `BookingPro2024!`

### 5. Crear Tu Primera Peluquería

1. Login como super admin
2. Hacer clic en "Crear Tenant"
3. Llenar el formulario:
   ```
   Nombre del Negocio: Salón Bella Vista
   Subdomain: bellavista
   Vertical: Peluquería
   Email: admin@bellavista.com
   ```

### 6. Configurar Hosts para Desarrollo

**Windows**: Editar `C:\Windows\System32\drivers\etc\hosts`
**Linux/Mac**: Editar `/etc/hosts`

Agregar:
```
127.0.0.1 bellavista.beautysalon.com
127.0.0.1 elcorte.barbershop.com
127.0.0.1 spa.aesthetics.com
```

### 7. Acceder a tu Peluquería

http://bellavista.beautysalon.com:3000

¡Ya tienes tu sistema multi-tenant funcionando! 🎉

## Troubleshooting

### Error de PostgreSQL
```bash
# Verificar si PostgreSQL está corriendo
# Windows: services.msc -> PostgreSQL
# Linux: sudo systemctl status postgresql
# Mac: brew services list | grep postgresql
```

### Error de Docker
```bash
# Limpiar contenedores
docker-compose down -v
docker-compose up --build
```

### Error "Tenant not found"
- Verificar que el tenant fue creado desde el super admin
- Verificar el archivo hosts
- Verificar que el puerto 3000 esté libre