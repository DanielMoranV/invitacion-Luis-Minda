#!/usr/bin/env node
/**
 * Pruebas de las reglas de Firestore.
 *
 * Las reglas son la ÚNICA capa de seguridad de este proyecto: no hay backend
 * que valide nada. Y el panel de los novios escribe directamente desde el
 * navegador. Así que conviene que estén probadas de verdad.
 *
 *   npm run emulador          # en otra terminal
 *   npm run probar-reglas
 */
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, setLogLevel,
} from 'firebase/firestore';

// Cada rechazo esperado imprime un PERMISSION_DENIED de gRPC. Son la prueba
// pasando, no un fallo: se silencian para que el informe se lea.
setLogLevel('silent');

const BODA = 'luis-minda';
const UID_NOVIO = 'uid-luis';
const UID_NOVIA = 'uid-minda';
const UID_AJENO = 'uid-cualquiera';

const entorno = await initializeTestEnvironment({
  projectId: 'demo-reglas',
  firestore: {
    rules: readFileSync('firestore.rules', 'utf8'),
    host: '127.0.0.1',
    port: 8080,
  },
});

let pasadas = 0;
let fallidas = 0;

async function prueba(nombre, fn) {
  try {
    await fn();
    pasadas++;
    console.log(`  ✔ ${nombre}`);
  } catch (e) {
    fallidas++;
    console.log(`  ✘ ${nombre}`);
    console.log(`      ${String(e.message).split('\n')[0]}`);
  }
}

const invitadoBase = {
  nombre: 'Familia Pérez',
  grupo: 'Familia de la novia',
  telefono: '+51 987 654 321',
  estado: 'pendiente',
  asistentes: null,
  pases: 4,
  enviadoEn: null,
  envios: 0,
  creadoEn: new Date(),
};

// Datos de partida, saltándose las reglas.
await entorno.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'bodas', BODA), {
    nombre: 'Luis & Minda',
    owners: [UID_NOVIO, UID_NOVIA],
  });
  await setDoc(doc(db, 'bodas', BODA, 'invitados', 'familia-perez-a7f3'), invitadoBase);
  // Documento importado antes de que existiera el campo `pases`.
  const { pases, ...sinPases } = invitadoBase;
  await setDoc(doc(db, 'bodas', BODA, 'invitados', 'legado-sin-pases'), sinPases);
});

const novio = entorno.authenticatedContext(UID_NOVIO).firestore();
const ajeno = entorno.authenticatedContext(UID_AJENO).firestore();
const anonimo = entorno.unauthenticatedContext().firestore();

const ruta = (db, slug = 'familia-perez-a7f3') => doc(db, 'bodas', BODA, 'invitados', slug);
const lista = (db) => collection(db, 'bodas', BODA, 'invitados');

console.log('\nINVITADO ANÓNIMO (cualquiera con el enlace)\n');

await prueba('lee su invitación por slug', () => assertSucceeds(getDoc(ruta(anonimo))));

await prueba('NO puede listar la colección', () => assertFails(getDocs(lista(anonimo))));

await prueba('confirma 3 personas', () =>
  assertSucceeds(
    updateDoc(ruta(anonimo), {
      estado: 'confirmado',
      asistentes: 3,
      nombreConfirmado: 'Familia Pérez',
      dieta: null,
      confirmadoEn: new Date(),
    }),
  ));

await prueba('puede confirmar justo sus 4 pases', () =>
  assertSucceeds(
    updateDoc(ruta(anonimo), {
      estado: 'confirmado',
      asistentes: 4,
      nombreConfirmado: 'Familia Pérez',
      dieta: null,
      confirmadoEn: new Date(),
    }),
  ));

await prueba('NO puede confirmar 9 (tiene 4 pases)', () =>
  assertFails(
    updateDoc(ruta(anonimo), {
      estado: 'confirmado',
      asistentes: 9,
      nombreConfirmado: 'Familia Pérez',
      dieta: null,
      confirmadoEn: new Date(),
    }),
  ));

await prueba('NO puede confirmar 900 (tope de sanidad)', () =>
  assertFails(
    updateDoc(ruta(anonimo), {
      estado: 'confirmado',
      asistentes: 900,
      nombreConfirmado: 'Dedazo',
      dieta: null,
      confirmadoEn: new Date(),
    }),
  ));

await prueba('documento sin campo `pases`: puede confirmar hasta 4 (valor por defecto)', () =>
  assertSucceeds(
    updateDoc(ruta(anonimo, 'legado-sin-pases'), {
      estado: 'confirmado',
      asistentes: 4,
      nombreConfirmado: 'Legado',
      dieta: null,
      confirmadoEn: new Date(),
    }),
  ));

await prueba('documento sin campo `pases`: NO puede confirmar 5 (excede el valor por defecto)', () =>
  assertFails(
    updateDoc(ruta(anonimo, 'legado-sin-pases'), {
      estado: 'confirmado',
      asistentes: 5,
      nombreConfirmado: 'Legado',
      dieta: null,
      confirmadoEn: new Date(),
    }),
  ));

await prueba('NO puede confirmar con cero asistentes', () =>
  assertFails(
    updateDoc(ruta(anonimo), {
      estado: 'confirmado',
      asistentes: 0,
      nombreConfirmado: 'X',
      dieta: null,
      confirmadoEn: new Date(),
    }),
  ));

await prueba('NO puede cambiar su teléfono', () =>
  assertFails(updateDoc(ruta(anonimo), { telefono: '+51 000 000 000' })));

await prueba('NO puede marcarse como enviado', () =>
  assertFails(updateDoc(ruta(anonimo), { enviadoEn: new Date(), envios: 1 })));

await prueba('NO puede declinar contando asistentes', () =>
  assertFails(
    updateDoc(ruta(anonimo), {
      estado: 'declinado',
      asistentes: 3,
      nombreConfirmado: 'X',
      dieta: null,
      confirmadoEn: new Date(),
    }),
  ));

await prueba('NO puede crear invitados', () =>
  assertFails(setDoc(ruta(anonimo, 'colado-xxxx'), invitadoBase)));

await prueba('NO puede borrar invitados', () => assertFails(deleteDoc(ruta(anonimo))));

console.log('\nUSUARIO AUTENTICADO QUE NO ES DE LA PAREJA\n');

await prueba('NO puede listar la colección', () => assertFails(getDocs(lista(ajeno))));
await prueba('NO puede crear invitados', () =>
  assertFails(setDoc(ruta(ajeno, 'intruso-xxxx'), invitadoBase)));
await prueba('NO puede borrar invitados', () => assertFails(deleteDoc(ruta(ajeno))));

console.log('\nLOS NOVIOS (el panel)\n');

await prueba('listan toda la colección', () => assertSucceeds(getDocs(lista(novio))));

await prueba('crean un invitado válido', () =>
  assertSucceeds(setDoc(ruta(novio, 'familia-nueva-b2c4'), invitadoBase)));

await prueba('marcan un enlace como enviado', () =>
  assertSucceeds(updateDoc(ruta(novio), { enviadoEn: new Date(), envios: 1 })));

await prueba('reenvían: incrementan el contador', () =>
  assertSucceeds(updateDoc(ruta(novio), { enviadoEn: new Date(), envios: 2 })));

await prueba('desmarcan un envío hecho por error', () =>
  assertSucceeds(updateDoc(ruta(novio), { enviadoEn: null, envios: 0 })));

await prueba('confirman a mano por quien avisó por teléfono', () =>
  assertSucceeds(updateDoc(ruta(novio), { estado: 'confirmado', asistentes: 2 })));

await prueba('corrigen el grupo de una familia', () =>
  assertSucceeds(updateDoc(ruta(novio), { grupo: 'Amigos' })));

await prueba('borran un invitado', () => assertSucceeds(deleteDoc(ruta(novio, 'familia-nueva-b2c4'))));

console.log('\nVALIDACIÓN DE ALTAS DESDE EL PANEL\n');

await prueba('rechaza nombre vacío', () =>
  assertFails(setDoc(ruta(novio, 'sin-nombre-x1'), { ...invitadoBase, nombre: '' })));

await prueba('rechaza estado inicial distinto de pendiente', () =>
  assertFails(setDoc(ruta(novio, 'ya-confirmado-x4'), { ...invitadoBase, estado: 'confirmado' })));

await prueba('rechaza campos inventados', () =>
  assertFails(setDoc(ruta(novio, 'campo-raro-x5'), { ...invitadoBase, basura: 'x'.repeat(500) })));

await prueba('rechaza alta sin campo `pases`', () => {
  const { pases, ...sinPases } = invitadoBase;
  return assertFails(setDoc(ruta(novio, 'sin-pases-x6'), sinPases));
});

await prueba('rechaza `pases` en cero', () =>
  assertFails(setDoc(ruta(novio, 'pases-cero-x7'), { ...invitadoBase, pases: 0 })));

await prueba('rechaza `pases` fuera de rango (21)', () =>
  assertFails(setDoc(ruta(novio, 'pases-alto-x8'), { ...invitadoBase, pases: 21 })));

await prueba('acepta `pases` en 1', () =>
  assertSucceeds(setDoc(ruta(novio, 'pases-uno-x9'), { ...invitadoBase, pases: 1 })));

await entorno.cleanup();

console.log(`\n  ${pasadas} pasadas · ${fallidas} fallidas\n`);
process.exit(fallidas ? 1 : 0);
