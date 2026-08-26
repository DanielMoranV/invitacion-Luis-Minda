import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth, connectAuthEmulator, type Auth,
} from 'firebase/auth';
import {
  getFirestore, connectFirestoreEmulator, type Firestore,
} from 'firebase/firestore';

/**
 * Firebase para el panel. A diferencia de la invitación pública —que usa un
 * cliente REST de 3,5 KB— aquí sí conviene el SDK: los listeners en tiempo
 * real y Auth no se hacen a mano de forma razonable, y como el panel vive
 * tras login, su peso no afecta a los invitados.
 */
const config = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  authDomain: `${import.meta.env.PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`,
};

export const BODA_ID = import.meta.env.PUBLIC_BODA_ID ?? 'luis-minda';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function iniciar() {
  if (app) return;
  app = getApps()[0] ?? initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);

  const emulador = import.meta.env.PUBLIC_FIRESTORE_EMULATOR;
  if (emulador) {
    const [host, puerto] = emulador.split(':');
    connectFirestoreEmulator(db, host, Number(puerto));
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  }
}

export function obtenerAuth(): Auth {
  iniciar();
  return auth!;
}

export function obtenerDb(): Firestore {
  iniciar();
  return db!;
}
