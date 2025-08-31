#!/bin/bash

# Script to create 'bar' tenant and admin user
# Password: Admin123!

echo "Creating 'bar' tenant..."

# Connect to PostgreSQL and execute the INSERT
PGPASSWORD=eric1234 psql -h localhost -U postgres -d bookingprodb << EOF
-- Create bar tenant
INSERT INTO public.tenants (
    "id",
    "subdomain",
    "BusinessName",
    "OwnerEmail",
    "OwnerName",
    "PhoneNumber",
    "Address",
    "Industry",
    "IsActive",
    "CreatedAt",
    "UpdatedAt"
) VALUES (
    gen_random_uuid(),
    'bar',
    'Bar Demo Business',
    'admin@bar.com',
    'Bar Admin',
    '1234567890',
    'Demo Address',
    'beauty_salon',
    true,
    NOW(),
    NOW()
) ON CONFLICT ("subdomain") DO UPDATE 
SET "IsActive" = true,
    "UpdatedAt" = NOW()
RETURNING id;

-- Get the tenant ID
DO \$\$
DECLARE
    tenant_id UUID;
BEGIN
    SELECT id INTO tenant_id FROM public.tenants WHERE subdomain = 'bar';
    
    -- Create admin user for bar tenant
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
        tenant_id,
        'admin@bar.com',
        'jNQTPSHQEZSiNiteBqe8VtKgm9F8x+SJlwD9xyOJomo=', -- Password: Admin123!
        'Admin',
        'Bar',
        'admin',
        true,
        NOW()
    ) ON CONFLICT ("Email") DO UPDATE 
    SET "PasswordHash" = 'jNQTPSHQEZSiNiteBqe8VtKgm9F8x+SJlwD9xyOJomo=',
        "IsActive" = true,
        "TenantId" = tenant_id;
END\$\$;

-- Verify
SELECT t.subdomain, t."BusinessName", u."Email", u."Role" 
FROM public.tenants t
LEFT JOIN public.users u ON u."TenantId" = t.id
WHERE t.subdomain = 'bar';
EOF

echo ""
echo "Tenant and user created successfully:"
echo "Subdomain: bar"
echo "Email: admin@bar.com"
echo "Password: Admin123!"
echo ""
echo "You can login at: http://bar.localhost:3001/login"