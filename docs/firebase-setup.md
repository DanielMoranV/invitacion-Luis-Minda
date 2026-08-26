# Crear el proyecto en Firebase

Todo lo que sigue cabe en el **plan gratuito (Spark)**. No hace falta tarjeta
de crédito: el sitio no usa Cloud Functions.

Al terminar tendrás cuatro valores para poner en `.env` y uno en `.firebaserc`.

---

## 1. Crear el proyecto

**El ID del proyecto es la dirección que van a ver 400 personas** —
`https://<id>.web.app`— y **no se puede cambiar nunca**. Vale la pena
elegirlo con calma.

1. Entra en [console.firebase.google.com](https://console.firebase.google.com)
   con la cuenta de Google que vaya a administrar la boda.
2. **Crear un proyecto** → nombre: `Boda Luis y Minda`.
3. **Aquí está el detalle que se pasa por alto:** debajo del nombre, Firebase
   propone un ID con un sufijo aleatorio (`boda-luis-y-minda-a1b2c3`). Pulsa
   el **lápiz de editar** que hay al lado y cámbialo por:

   ```
   luisyminda
   ```

   Si aparece como no disponible, prueba en este orden:
   `luisyminda2027` · `bodaluisyminda` · `luisminda`

   **No aceptes el sufijo aleatorio.** `luisyminda-a1b2c3.web.app` se ve mal
   en un WhatsApp y es imposible de dictar por teléfono.

4. Google Analytics: **desactivado**. No aporta nada aquí y añade cookies.

> **Anota el PROJECT_ID.** Va en dos sitios: `.env` y `.firebaserc`.

### Reglas del ID

6 a 30 caracteres · minúsculas, números y guiones · empieza por letra ·
no termina en guión · único en todo Firebase.

Evita guiones si puedes: hay que dictarlos por teléfono y se escriben mal.

---

## 2. Registrar la app web

Esto es lo que genera la clave que usa el navegador.

1. En la pantalla principal del proyecto, pulsa el icono **Web** `</>`.
2. Alias: `Invitación`. **No** marques "Firebase Hosting" aquí — el hosting
   se configura después desde la terminal.
3. Firebase muestra un bloque `firebaseConfig`. Solo necesitas `apiKey`:

   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy...",        // <- este valor
     projectId: "luisyminda",    // <- ya lo tenías
     // el resto no se usa
   };
   ```

> **Anota el apiKey.** No es un secreto: queda incrustado en el JavaScript del
> sitio a propósito. La seguridad la dan las reglas, no ocultar la clave.

---

## 3. Crear la base de datos

1. Menú lateral → **Firestore Database** → **Crear base de datos**.
2. Modo: **producción**. Empieza cerrada a todo; nuestras reglas la abren solo
   donde toca. No elijas modo de prueba: deja la base abierta 30 días.
3. Ubicación: **`southamerica-east1`** (São Paulo) es la más cercana a Piura
   con soporte completo. **No se puede cambiar después.**

> A este volumen —400 invitados leyendo un documento cada uno— la región
> apenas cambia nada: son décimas de segundo y la cuota gratuita es la misma.
> Importa solo porque es permanente.

---

## 4. Rellenar la configuración local

```bash
cp .env.example .env
```

Edita `.env` y reemplaza:

```
PUBLIC_FIREBASE_PROJECT_ID=luisyminda
PUBLIC_FIREBASE_API_KEY=AIzaSy...
SITIO=https://luisyminda.web.app
```

Y el mismo ID en `.firebaserc`, que es lo que usa `firebase deploy`
(ese archivo no lee variables de entorno):

```json
{ "projects": { "default": "luisyminda" } }
```

---

## 5. Conectar la terminal y publicar las reglas

```bash
firebase login
firebase use luisyminda

# Publica firestore.rules y los índices. Hazlo ANTES de cargar invitados:
# la base se queda cerrada hasta que existan las reglas.
firebase deploy --only firestore
```

---

## 6. Cargar los invitados

El script escribe con permisos de administrador, así que necesita una cuenta
de servicio **solo para esto**. El sitio publicado nunca la usa.

1. Consola → ⚙ **Configuración del proyecto** → **Cuentas de servicio** →
   **Generar nueva clave privada**. Descarga el JSON.
2. Pégalo entero, en una línea, en `FIREBASE_SERVICE_ACCOUNT` dentro de `.env`.
3. **Comenta las dos líneas del emulador** (`PUBLIC_FIRESTORE_EMULATOR` y
   `FIRESTORE_EMULATOR_HOST`), o seguirás escribiendo en local.

```bash
npm run importar -- invitados.csv              # vista previa, no escribe
npm run importar -- invitados.csv --escribir   # escribe de verdad
```

El script imprime contra qué base va a escribir antes de hacer nada:

```
  proyecto: luisyminda · boda: luis-minda
  destino:  *** FIRESTORE REAL ***
```

Genera `enlaces-invitados.csv` con el enlace de cada familia. Ese archivo
lleva nombres y teléfonos: está en `.gitignore` y no debe subirse.

> **Esa clave privada da acceso total al proyecto.** Cuando termines de
> importar, bórrala de `.env` y revócala desde la consola.

---

## 6b. Habilitar el panel de los novios

El panel comprueba que tu usuario esté en el array `owners` del documento
`bodas/luis-minda`. Ese documento **hay que crearlo a mano una sola vez**: no se
puede crear desde el propio panel porque las reglas exigen ser dueño para
escribir ahí, y todavía no hay ninguno.

1. Consola → **Authentication** → método **Correo electrónico/contraseña**
   habilitado, y una cuenta para cada uno en la pestaña **Users**.
2. Copia el **UID** de cada cuenta (columna "User UID").
3. Consola → **Firestore Database** → **Iniciar colección**
   - ID de la colección: `bodas`
   - ID del documento: `luis-minda`  *(debe coincidir con `PUBLIC_BODA_ID`)*
   - Campo `nombre` · tipo **string** · valor `Luis & Minda`
   - Campo `owners` · tipo **array** · dos elementos **string**, un UID en cada uno
4. Entra en `/admin` con cualquiera de las dos cuentas.

Si el UID no coincide, el panel no da un error críptico: dice
*"Tu cuenta no tiene acceso a esta lista"*.

## 7. Publicar el sitio

```bash
npm run desplegar
```

Queda en `https://<project-id>.web.app`.

`firebase.json` sirve `dist/` y reescribe `/i/**` a `invitacion/index.html`.
El `SITIO` de `.env` lo lee `astro.config.mjs` con `loadEnv` de Vite: Astro no
vuelca `.env` en `process.env` dentro del archivo de configuración, así que sin
eso el `og:image` se quedaba con el valor por defecto. Para dominio propio: Hosting →
**Añadir dominio personalizado**, y actualiza `SITIO` en `.env` y vuelve a
desplegar (el `og:image` se genera con ese valor).

---

## Resumen de valores

| Valor | Dónde se saca | Dónde se pone |
|---|---|---|
| `PROJECT_ID` | Configuración del proyecto → General | `.env` **y** `.firebaserc` |
| `apiKey` | Configuración → Tus apps → app web | `.env` |
| Dominio | Hosting, tras desplegar | `.env` (`SITIO`) |
| Clave de servicio | Configuración → Cuentas de servicio | `.env`, temporal |

## Comprobación rápida

Antes de dar por bueno el despliegue:

- [ ] `https://<project-id>.web.app` carga la invitación
- [ ] Un enlace `/i/<slug>` real muestra el nombre y los pases correctos
- [ ] Confirmar más personas de las asignadas da error
- [ ] Un `/i/inventado` redirige a la 404
- [ ] Compartir el enlace en WhatsApp muestra la tarjeta con la foto
