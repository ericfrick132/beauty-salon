// Helpers de roles para gating de UI/rutas en el frontend.
// El enforcement real vive en el backend (atributos [Authorize(Roles=...)]).

export const ROLE_ADMIN = 'admin';
export const ROLE_EMPLOYEE = 'employee';
export const ROLE_SUPER_ADMIN = 'super_admin';

// Tolerante: case-insensitive + acepta sinónimos históricos ("owner", "Admin", etc.).
// El backend ya enforce con strings exactos, esto es solo gating de UI.
const ADMIN_LIKE = new Set(['admin', 'super_admin', 'superadmin', 'owner']);

function normalize(role?: string | null): string {
  return (role || '').trim().toLowerCase();
}

export function isAdminLike(role?: string | null): boolean {
  return ADMIN_LIKE.has(normalize(role));
}

export function isEmployee(role?: string | null): boolean {
  return normalize(role) === ROLE_EMPLOYEE;
}

export const ROLE_LABELS: Record<string, string> = {
  [ROLE_ADMIN]: 'Administrador',
  [ROLE_EMPLOYEE]: 'Empleado',
  [ROLE_SUPER_ADMIN]: 'Super admin',
  user: 'Usuario',
};

export function roleLabel(role?: string | null): string {
  if (!role) return '—';
  return ROLE_LABELS[role] || role;
}
