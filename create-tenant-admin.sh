#!/bin/bash

# Script para crear un usuario admin para el tenant barberiaeric
# Password: Admin123!

echo "Creando usuario admin para tenant barberiaeric..."

# Conectar a PostgreSQL y ejecutar el INSERT
PGPASSWORD=eric1234 psql -h localhost -U postgres -d bookingprodb << EOF
-- Crear usuario admin para barberiaeric
INSERT INTO public.users (
    "Id",
    "TenantId", 
    "Email",
    "PasswordHash",
    "FirstName",
    "LastName",
    "Role",
    "IsActive",
    "CreatedAt"
) VALUES (
    gen_random_uuid(),
    'f1506776-48c6-4114-a470-54ad5e509c89',
    'admin@barberiaeric.com',
    'jNQTPSHQEZSiNiteBqe8VtKgm9F8x+SJlwD9xyOJomo=',
    'Admin',
    'Barbería Eric',
    'admin',
    true,
    NOW()
) ON CONFLICT ("Email") DO UPDATE 
SET "PasswordHash" = 'jNQTPSHQEZSiNiteBqe8VtKgm9F8x+SJlwD9xyOJomo=',
    "IsActive" = true;

-- Verificar
SELECT "Email", "FirstName", "LastName", "Role" 
FROM public.users 
WHERE "Email" = 'admin@barberiaeric.com';
EOF

echo ""
echo "Usuario creado exitosamente:"
echo "Email: admin@barberiaeric.com"
echo "Password: Admin123!"
echo ""
echo "Puedes hacer login en: http://barberiaeric.localhost:3000/login"