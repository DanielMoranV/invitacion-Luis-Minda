/** Slug legible + sufijo aleatorio. El sufijo evita que un invitado
 *  curioso adivine el enlace de otro probando apellidos. */
export function generarSlug(nombre, existentes = new Set()) {
  const base =
    nombre
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'invitado';

  const alfabeto = 'abcdefghijkmnpqrstuvwxyz23456789'; // sin l/o/0/1
  for (let intento = 0; intento < 50; intento++) {
    let sufijo = '';
    for (let i = 0; i < 4; i++) {
      sufijo += alfabeto[Math.floor(Math.random() * alfabeto.length)];
    }
    const slug = `${base}-${sufijo}`;
    if (!existentes.has(slug)) {
      existentes.add(slug);
      return slug;
    }
  }
  throw new Error(`No se pudo generar un slug único para "${nombre}"`);
}
