import {
  collection, doc, onSnapshot, orderBy, query,
  setDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch, Timestamp,
} from 'firebase/firestore';
import { obtenerDb, BODA_ID } from './firebase';
import evento from '../content/evento.json';

export type Estado = 'pendiente' | 'confirmado' | 'declinado';

/** Tope de pases por defecto cuando el invitado no trae uno propio. */
export const PASES_POR_DEFECTO = evento.invitadoPorDefecto.pases;

export interface Invitado {
  slug: string;
  nombre: string;
  grupo: string | null;
  telefono: string | null;
  estado: Estado;
  asistentes: number | null;
  pases: number;
  dieta: string | null;
  nombreConfirmado: string | null;
  confirmadoEn: Date | null;
  enviadoEn: Date | null;
  envios: number;
}

export interface NuevoInvitado {
  nombre: string;
  grupo?: string | null;
  telefono?: string | null;
  pases?: number;
}

/** Deja el número de pases dentro del rango que aceptan las reglas de Firestore. */
const acotarPases = (n: number) => Math.min(Math.max(Math.round(n) || PASES_POR_DEFECTO, 1), 20);

const coleccion = () => collection(obtenerDb(), 'bodas', BODA_ID, 'invitados');
const documento = (slug: string) => doc(obtenerDb(), 'bodas', BODA_ID, 'invitados', slug);

const fecha = (v: unknown): Date | null => (v instanceof Timestamp ? v.toDate() : null);

function aInvitado(id: string, d: Record<string, any>): Invitado {
  return {
    slug: id,
    nombre: String(d.nombre ?? ''),
    grupo: d.grupo ?? null,
    telefono: d.telefono ?? null,
    estado: (d.estado ?? 'pendiente') as Estado,
    asistentes: d.asistentes ?? null,
    pases: Number(d.pases ?? PASES_POR_DEFECTO),
    dieta: d.dieta ?? null,
    nombreConfirmado: d.nombreConfirmado ?? null,
    confirmadoEn: fecha(d.confirmadoEn),
    enviadoEn: fecha(d.enviadoEn),
    // Los documentos creados antes de existir el campo no lo tienen.
    envios: Number(d.envios ?? 0),
  };
}

/** Suscripción en vivo a la lista completa. Devuelve la función para cancelar. */
export function escucharInvitados(
  alCambiar: (lista: Invitado[]) => void,
  alFallar: (e: Error) => void,
) {
  return onSnapshot(
    query(coleccion(), orderBy('nombre')),
    (snap) => alCambiar(snap.docs.map((d) => aInvitado(d.id, d.data()))),
    alFallar,
  );
}

const ALFABETO = 'abcdefghijkmnpqrstuvwxyz23456789'; // sin l/o/0/1

export function generarSlug(nombre: string): string {
  const base =
    nombre
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'invitado';
  let sufijo = '';
  for (let i = 0; i < 4; i++) sufijo += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  return `${base}-${sufijo}`;
}

function documentoNuevo(g: NuevoInvitado) {
  return {
    nombre: g.nombre.trim().slice(0, 120),
    grupo: g.grupo?.trim() || null,
    telefono: g.telefono?.trim() || null,
    estado: 'pendiente' as const,
    asistentes: null,
    pases: acotarPases(g.pases ?? PASES_POR_DEFECTO),
    enviadoEn: null,
    envios: 0,
    creadoEn: serverTimestamp(),
  };
}

/**
 * Alta de un invitado. No hace falta comprobar antes si el slug existe:
 * Firestore rechaza un `create` sobre un documento ya presente, así que
 * basta reintentar con otro sufijo.
 */
export async function crearInvitado(g: NuevoInvitado): Promise<string> {
  const datos = documentoNuevo(g);
  for (let intento = 0; intento < 5; intento++) {
    const slug = generarSlug(g.nombre);
    try {
      // `setDoc` sin merge sobre un doc inexistente = create.
      await setDoc(documento(slug), datos);
      return slug;
    } catch (e) {
      if (intento === 4) throw e;
    }
  }
  throw new Error('No se pudo generar un enlace único');
}

/** Alta en lote, para la importación. Firestore admite 500 por lote. */
export async function crearInvitadosEnLote(lista: NuevoInvitado[]): Promise<string[]> {
  const db = obtenerDb();
  const slugs: string[] = [];
  for (let i = 0; i < lista.length; i += 400) {
    const trozo = lista.slice(i, i + 400);
    const lote = writeBatch(db);
    for (const g of trozo) {
      const slug = generarSlug(g.nombre);
      slugs.push(slug);
      lote.set(documento(slug), documentoNuevo(g));
    }
    try {
      await lote.commit();
    } catch (e) {
      console.error(
        `[datos] lote.commit() falló en el trozo ${i}-${i + trozo.length}:`,
        e,
        '\nprimer documento del trozo:',
        documentoNuevo(trozo[0]),
      );
      throw e;
    }
  }
  return slugs;
}

export async function editarInvitado(
  slug: string,
  cambios: Partial<Pick<Invitado, 'nombre' | 'grupo' | 'telefono' | 'pases'>>,
) {
  await updateDoc(documento(slug), cambios);
}

export async function borrarInvitado(slug: string) {
  await deleteDoc(documento(slug));
}

/** Marca que se abrió WhatsApp para este invitado. Suma al contador. */
export async function marcarEnviado(inv: Invitado) {
  await updateDoc(documento(inv.slug), {
    enviadoEn: serverTimestamp(),
    envios: inv.envios + 1,
  });
}

/** Deshace la marca: abrieron WhatsApp pero no llegaron a enviar. */
export async function desmarcarEnviado(slug: string) {
  await updateDoc(documento(slug), { enviadoEn: null, envios: 0 });
}

/** Confirmación registrada a mano, por quien avisó de viva voz. */
export async function confirmarAMano(slug: string, estado: Estado, asistentes: number) {
  await updateDoc(documento(slug), {
    estado,
    asistentes: estado === 'confirmado' ? asistentes : 0,
    confirmadoEn: serverTimestamp(),
  });
}

export async function volverAPendiente(slug: string) {
  await updateDoc(documento(slug), {
    estado: 'pendiente',
    asistentes: null,
    confirmadoEn: null,
  });
}
