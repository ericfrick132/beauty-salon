#!/bin/bash

echo "🚀 BookingPro Setup Script"
echo "========================="

# Check if PostgreSQL is running
echo "📦 Verificando PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL no está instalado. Por favor instálalo primero."
    exit 1
fi

# Create database if it doesn't exist
echo "🗄️ Configurando base de datos..."
psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'bookingprodb'" | grep -q 1 || {
    echo "Creando base de datos bookingprodb..."
    createdb -U postgres bookingprodb
}

# Create user if doesn't exist
psql -U postgres -tc "SELECT 1 FROM pg_user WHERE usename = 'bookingpro'" | grep -q 1 || {
    echo "Creando usuario bookingpro..."
    psql -U postgres -c "CREATE USER bookingpro WITH PASSWORD 'password123';"
    psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE bookingprodb TO bookingpro;"
    psql -U postgres -c "ALTER USER bookingpro CREATEDB;"
}

# Copy environment file
echo "⚙️ Configurando variables de entorno..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Archivo .env creado. Edítalo si necesitas cambiar configuraciones."
else
    echo "✅ Archivo .env ya existe."
fi

# Install backend dependencies
echo "📦 Instalando dependencias del backend..."
cd src/backend/BookingPro.API
dotnet restore
cd ../../..

# Install frontend dependencies
echo "📦 Instalando dependencias del frontend..."
cd src/frontend
npm install
cd ../..

echo "🎉 Setup completado!"
echo ""
echo "🚀 Para ejecutar el proyecto:"
echo "1. Con Docker: docker-compose up --build"
echo "2. Manual:"
echo "   Terminal 1: cd src/backend/BookingPro.API && dotnet run"
echo "   Terminal 2: cd src/frontend && npm start"
echo ""
echo "🌐 URLs importantes:"
echo "   Super Admin: http://localhost:3000/super-admin/login"
echo "   Credenciales: admin@bookingpro.com / BookingPro2024!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Crear tenants desde el super admin"
echo "2. Configurar hosts file para subdominios"
echo "3. Acceder a los tenants creados"