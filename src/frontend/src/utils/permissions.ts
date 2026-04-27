// Helpers de roles para gating de UI/rutas en el frontend.
// El enforcement real vive en el backend (atributos [Authorize(Roles=...)]).

export const ROLE_ADMIN = 'admin';
export const ROLE_EMPLOYEE = 'employee';
export const ROLE_SUPER_ADMIN = 'super_admin';

const ADMIN_LIKE = new Set([ROLE_ADMIN, ROLE_SUPER_ADMIN]);

export function isAdminLike(role?: string | null): boolean {
  return !!role && ADMIN_LIKE.has(role);
}

export function isEmployee(role?: string | null): boolean {
  return role === ROLE_EMPLOYEE;
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
