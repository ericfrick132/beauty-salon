-- Script para crear un usuario admin para el tenant barberiaeric
-- Primero, buscar el tenant
SELECT id, subdomain, "BusinessName", "OwnerEmail" 
FROM public.tenants 
WHERE subdomain = 'barberiaeric';

-- Usar el ID del tenant obtenido arriba para insertar el usuario
-- Reemplazar 'TENANT_ID_HERE' con el ID real del tenant
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
    'f1506776-48c6-4114-a470-54ad5e509c89', -- ID del tenant barberiaeric
    'admin@barberiaeric.com',
    'jNQTPSHQEZSiNiteBqe8VtKgm9F8x+SJlwD9xyOJomo=', -- Password: Admin123!
    'Admin',
    'Barbería Eric',
    'admin',
    true,
    NOW()
);

-- Verificar que se creó
SELECT * FROM public.users WHERE "Email" = 'admin@barberiaeric.com';