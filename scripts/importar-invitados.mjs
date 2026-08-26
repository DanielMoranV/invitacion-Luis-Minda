#!/usr/bin/env node
/**
 * Importa invitados a Firestore desde un CSV.
 * Columnas: nombre, grupo, telefono, pases  (solo `nombre` es obligatoria;
 * si falta `pases` o no es un número válido, se usa el valor por defecto de
 * evento.json)
 *
 *   node scripts/importar-invitados.mjs invitados.csv            # vista previa
 *   node scripts/importar-invitados.mjs invitados.csv --escribir # escribe
 *
 * Contra el emulador:  FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initializeApp, applicationDefault, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { generarSlug } from './lib-slug.mjs';

const evento = JSON.parse(
  readFileSync(fileURLToPath(new URL('../src/content/evento.json', import.meta.url)), 'utf8'),
);
const PASES_POR_DEFECTO = evento.invitadoPorDefecto.pases;
const acotarPases = (n) => Math.min(Math.max(Math.round(n) || PASES_POR_DEFECTO, 1), 20);

// Se reutilizan las mismas variables PUBLIC_* del sitio para no tener dos
// fuentes de verdad del mismo dato.
const BODA_ID = process.env.PUBLIC_BODA_ID ?? process.env.BODA_ID ?? 'luis-minda';
const PROYECTO =
  process.env.PUBLIC_FIREBASE_PROJECT_ID ?? process.env.GCLOUD_PROJECT ?? 'luisyminda';
const archivo = process.argv[2];
const escribir = process.argv.includes('--escribir');

if (!archivo) {
  console.error('Uso: npm run importar -- <archivo.csv> [--escribir]');
  process.exit(1);
}

// Falla pronto y con un mensaje claro: sin esto el SDK lanza un
// "2 UNKNOWN" de gRPC que no dice nada.
if (!PROYECTO || PROYECTO.includes('<')) {
  console.error(
    '\n  Falta el ID del proyecto.\n' +
    '  Rellena PUBLIC_FIREBASE_PROJECT_ID en .env con el valor real.\n' +
    '  Cómo obtenerlo: docs/firebase-setup.md\n',
  );
  process.exit(1);
}
if (!process.env.FIRESTORE_EMULATOR_HOST && !process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error(
    '\n  Vas contra Firestore REAL pero no hay credenciales.\n' +
    '  Pon FIREBASE_SERVICE_ACCOUNT en .env, o descomenta FIRESTORE_EMULATOR_HOST\n' +
    '  para trabajar contra el emulador.\n' +
    '  Cómo obtenerla: docs/firebase-setup.md (paso 6)\n',
  );
  process.exit(1);
}

/** CSV mínimo con soporte de comillas: los nombres llevan comas. */
function leerCsv(texto) {
  const filas = [];
  let campo = '';
  let fila = [];
  let enComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (enComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; } else enComillas = false;
      } else campo += c;
    } else if (c === '"') enComillas = true;
    else if (c === ',' || c === ';') { fila.push(campo); campo = ''; }
    else if (c === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  return filas.filter((f) => f.some((c) => c.trim()));
}

const filas = leerCsv(readFileSync(archivo, 'utf8'));
const cabecera = filas.shift().map((c) => c.trim().toLowerCase());
const col = (n) => cabecera.indexOf(n);
const iNombre = col('nombre');
if (iNombre === -1) {
  console.error('El CSV no tiene columna "nombre".');
  process.exit(1);
}

if (!getApps().length) {
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  initializeApp({
    credential: sa ? cert(JSON.parse(sa)) : applicationDefault(),
    projectId: PROYECTO,
  });
}
const db = getFirestore();
const coleccion = db.collection('bodas').doc(BODA_ID).collection('invitados');

const emulador = process.env.FIRESTORE_EMULATOR_HOST;
console.log(
  `\n  proyecto: ${PROYECTO} · boda: ${BODA_ID}` +
  `\n  destino:  ${emulador ? 'EMULADOR ' + emulador : '*** FIRESTORE REAL ***'}`,
);

// Los slugs existentes se cargan para no repetir ni duplicar invitados.
const yaEn = await coleccion.get();
const slugsUsados = new Set(yaEn.docs.map((d) => d.id));
const nombresExistentes = new Map(yaEn.docs.map((d) => [String(d.data().nombre).trim().toLowerCase(), d.id]));

const nuevos = [];
const omitidos = [];
const vistosEnArchivo = new Set();

for (const [n, fila] of filas.entries()) {
  const nombre = (fila[iNombre] ?? '').trim();
  const linea = n + 2;
  if (!nombre) { omitidos.push({ linea, motivo: 'sin nombre' }); continue; }

  const clave = nombre.toLowerCase();
  if (vistosEnArchivo.has(clave)) { omitidos.push({ linea, nombre, motivo: 'duplicado en el archivo' }); continue; }
  if (nombresExistentes.has(clave)) { omitidos.push({ linea, nombre, motivo: 'ya existe en la base' }); continue; }
  vistosEnArchivo.add(clave);

  nuevos.push({
    slug: generarSlug(nombre, slugsUsados),
    nombre,
    grupo: (fila[col('grupo')] ?? '').trim() || null,
    telefono: (fila[col('telefono')] ?? '').trim() || null,
    estado: 'pendiente',
    asistentes: null,
    pases: acotarPases(parseInt(fila[col('pases')], 10)),
  });
}

console.log(`\n  ${nuevos.length} nuevos · ${omitidos.filter((o) => !o.aviso).length} omitidos · ${omitidos.filter((o) => o.aviso).length} avisos\n`);
for (const o of omitidos) {
  console.log(`  ${o.aviso ? 'aviso ' : 'omite '} línea ${o.linea}: ${o.nombre ?? ''} — ${o.motivo}`);
}
console.log();
for (const g of nuevos.slice(0, 5)) console.log(`  + ${g.nombre} -> /i/${g.slug}`);
if (nuevos.length > 5) console.log(`  … y ${nuevos.length - 5} más`);

if (!escribir) {
  console.log('\n  Vista previa. Añade --escribir para guardar en Firestore.\n');
  process.exit(0);
}

for (let i = 0; i < nuevos.length; i += 400) {
  const lote = db.batch();
  for (const g of nuevos.slice(i, i + 400)) {
    lote.set(coleccion.doc(g.slug), { ...g, creadoEn: new Date() });
  }
  await lote.commit();
}

const csv = ['nombre,enlace', ...nuevos.map((g) => `"${g.nombre.replace(/"/g, '""')}",/i/${g.slug}`)].join('\n');
writeFileSync('enlaces-invitados.csv', csv + '\n');
console.log(`\n  Escritos ${nuevos.length}. Enlaces en enlaces-invitados.csv\n`);
