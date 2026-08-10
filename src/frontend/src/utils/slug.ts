/**
 * slugify — convierte el nombre de un negocio en un subdominio URL-safe
 * ("Barbería Fénix!" → "barberia-fenix").
 *
 * normalize('NFD') descompone los acentos (á → a + tilde combinante) y el filtro
 * de marcas combinantes las elimina, así que no hace falta un reemplazo por acento.
 *
 * Se usa tanto en el self-registration como en el alta de invitaciones del panel
 * de super admin, donde el subdominio se copia del nombre a medida que se tipea.
 */
export const slugify = (s: string): string =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // marcas de acento combinantes
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
