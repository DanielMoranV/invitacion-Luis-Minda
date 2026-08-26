# Invitación de boda — Luis Ángel & Minda Loren

Invitación digital para el 30 de enero de 2027, Iglesia del Nazareno de Monte Sullón (Piura, Perú).

Implementa el canvas de Claude Design `Invitacion Luis y Minda.dc.html`.

## Correr el proyecto

El sitio es **100% estático**: no hay servidor ni Cloud Functions. El navegador
habla directamente con Firestore, que valida todo con las reglas de seguridad.
Eso lo mantiene dentro del **plan gratuito (Spark)** de Firebase.

```bash
npm install

# Terminal 1 — emulador de Firestore (no toca datos reales)
npm run emulador

# Terminal 2 — Astro (lee PUBLIC_FIRESTORE_EMULATOR de .env)
npm run dev                  # http://localhost:4321

# Cargar invitados de prueba
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=luisyminda \
  npm run importar -- invitados.csv --escribir
```

Copia `.env.example` a `.env` — cada variable lleva anotado de dónde se saca.
Con las dos líneas del emulador puestas, nada toca datos reales.

**Para crear el proyecto en Firebase desde cero: [`docs/firebase-setup.md`](docs/firebase-setup.md).**
Todo cabe en el plan gratuito; no hace falta tarjeta.

## Invitados y confirmaciones

Los invitados viven en `bodas/{BODA_ID}/invitados/{slug}`. El slug es el
nombre normalizado más un sufijo aleatorio de 4 caracteres —`familia-perez-a7f3`—
para que un invitado no adivine el enlace de otro probando apellidos.

**Importar desde CSV** (columnas `nombre`, `pases`, `grupo`, `telefono`; solo
`nombre` es obligatoria):

```bash
npm run importar -- invitados.csv              # vista previa, no escribe
npm run importar -- invitados.csv --escribir   # escribe y genera enlaces-invitados.csv
```

El script lee `.env` solo y **avisa contra qué base va a escribir** antes de
hacer nada:

```
  proyecto: luisyminda · boda: luis-minda
  destino:  *** FIRESTORE REAL ***
```

Sin `--escribir` solo muestra qué haría, marcando duplicados, filas sin nombre
y pases inválidos. Reimportar el mismo archivo no duplica nada.

**La validación vive en las reglas de Firestore**, no en un backend. Firestore
las evalúa del lado del servidor, así que manipular el formulario desde la
consola no sirve de nada: `firestore.rules` impide confirmar más gente de la
asignada, alterar los pases y tocar cualquier otro campo.

**El enlace genérico (`/`) no lleva formulario**: muestra la invitación y remite
al enlace personal. Así no hace falta una regla de escritura abierta, que sería
una puerta para spam.

## Desplegar

```bash
npm run desplegar        # build + firebase deploy
```

Todo sale del CDN de Firebase Hosting. Los enlaces `/i/<slug>` funcionan con
una **reescritura estática** —`/i/**` sirve `invitacion/index.html`— y el
navegador lee el slug de la ruta. Las reescrituras estáticas entran en el plan
gratuito; las Cloud Functions no.

## Estructura

```
img/                     fotos originales (fuente de verdad, ver galeria.json)
src/
├── content/evento.json  ÚNICA fuente de los textos y datos del evento
├── fotos.ts             importa las fotos una sola vez
├── styles/tokens.css    paleta, tipografías y utilidades compartidas
├── layouts/Base.astro   <head>, Open Graph, fuentes, revelado al scroll
├── components/          una sección por componente
└── pages/index.astro    ensambla las secciones en orden
docs/                    brief de diseño, arquitectura, cuestionario
```

**Para cambiar un texto, una hora o un versículo se toca `evento.json`, nunca un componente.**

## Personalización por invitado

El navegador accede a cada invitado vía `/i/<slug>` (ver slug arriba). Cada
documento trae su propio `pases`: el selector de "personas que
asistirán" en `/i/<slug>` solo ofrece hasta ese número, y `firestore.rules`
rechaza cualquier confirmación que lo exceda (aunque se manipule el
formulario desde la consola). El campo con el nombre del invitado en el
formulario es de solo lectura —puede ser una familia entera, no una
persona— y no hay forma de confirmar "a nombre de" otro invitado.

El enlace genérico (`/`) no lee ningún documento: muestra la invitación sin
formulario y remite a abrir el enlace personal enviado por WhatsApp.

## Panel de los novios

`/admin` (Preact, autenticado con Firebase Auth) permite:

- **Importar** una lista desde Excel/CSV (`nombre`, `grupo`, `telefono`,
  `pases`; solo `nombre` es obligatoria — `pases` cae al valor por defecto de
  `evento.json` si no se especifica) o **añadir** invitados uno a uno.
- Ver el estado de cada invitación (pendiente / confirmado / no asiste),
  cuántos pases y cuántos asistentes reales tiene cada una, y editar nombre,
  grupo, teléfono o pases en cualquier momento.
- Generar y copiar el enlace de WhatsApp de cada invitado, y marcarlo como
  enviado.
- **Confirmar a mano** (por quien avisó por teléfono) o **volver a
  pendiente** una invitación.

Los dueños del documento `bodas/{BODA_ID}` (`owners` en Firestore) pueden
tocar cualquier campo sin las restricciones que sí aplican al formulario
público — así el panel puede corregir pases o asistentes sin pelear con sus
propias reglas.

## Decisiones que se apartan del canvas

| Canvas | Implementación | Por qué |
|---|---|---|
| Fotos como `background-image` | `<Image>` posicionada + velo aparte | Permite `srcset`: la portada pasó de 2761 KB a 154 KB |
| `style-focus` en el input | `:focus` real en CSS | El runtime del canvas ignora ese atributo; no existe |
| Velo del hero a `.28` en el centro | Franja media a `.58` | Sobre la foto real ahí cae el espejo iluminado y los nombres se perdían |
| `grid-template-rows: 1fr auto auto` | `auto 1fr auto` | En pantallas bajas los bloques se pegaban entre sí |
| Google Fonts por `<link>` | Fontsource self-hosted, subconjunto latino | Evita una conexión extra y el parpadeo de fuente |
| Mapa | Imagen estática generada con tiles de OpenStreetMap + botón a Google Maps | Sin iframe: ahorra peso y evita cookies de terceros, sin depender de una API key (`scripts/build-static-map.py` la regenera) |

## Pendiente

**Confirmado por la novia** (23 ago 2026): nombres juntos "Luis & Minda", padrinos
llamados "Nuestros padrinos", pastor Juan Sosa Sernaque, versículo principal
Cantares 8:6a, 400 personas, sí habrá niños, confirmación hasta un mes antes,
vestimenta formal, sin sección de regalos, canción "Qué suerte tenerte" de
Fonseca, sí quieren hashtag.

**Actualizado** (26 ago 2026): se quitó del todo la sección de itinerario del
día ("El gran día" — ceremonia, recepción, cena, brindis, coreografía); ahora
solo se muestra la hora de la ceremonia. La recepción resultó ser un local
aparte, no "el jardín detrás del templo" como se pensaba al inicio — tiene su
propio pin en el mapa y su propio botón de "Cómo llegar". Falta el nombre y
la dirección exacta de ese local (hoy dice "por confirmar").

**Ya resuelto** (era "bloqueante" antes, verificado en esta sesión):

- Proyecto de Firebase creado (`luisyminda`) y **Firestore ya tiene datos
  reales**: los enlaces `/i/<slug>` funcionan.
- El dominio apunta correctamente a `https://luisyminda.web.app` (no a
  `luisyminda.com`, que no existe) — el `og:image` sí resuelve.
- El **panel de los novios** (`/admin`) ya está en uso: importan y editan
  invitados, confirman a mano, ven el resumen de asistentes. Ya no es
  "Fase 3 pendiente", es la forma en que se cargan los invitados hoy.
- **Límite de pases por invitación**: cada invitado tiene su propio `pases`,
  editable desde el panel o al importar, y `firestore.rules` lo hace cumplir
  del lado del servidor. Antes no existía ninguna restricción.
- **Mapa.** Ya no es un marcador de posición: es una imagen real generada con
  tiles de OpenStreetMap.

**Sigue pendiente:**

1. **El hashtag exacto.** Se dieron opciones a la pareja (`#LuisYMinda2027`,
   variantes con la fecha, con temática del versículo de Marcos 10:9); falta
   que decidan y se actualice `evento.json` (`hashtag.valor` y quitar la nota
   "hashtag por confirmar").
2. **Nombre y dirección del local de recepción**, para reemplazar el
   "por confirmar" en `evento.json` (`lugar.recepcion`).
3. **La versión de la Biblia** — la atribución sigue oculta en toda la página.
4. **Imagen de compartir.** El retrato mide 743x665. WhatsApp da tarjeta
   grande desde ~600x315 con relación cercana a 1.91:1, así que hoy mostrará
   una miniatura. Conviene recortar una versión apaisada del original.
5. **¿Cuántos enlaces generar?** Respondieron "400 personas", que resuelve el
   total de asistentes pero no cuántas invitaciones (documentos) hay que
   crear ni cuántos pases lleva cada una. El sistema ya soporta pases por
   invitación; falta la lista real. Ver `docs/arquitectura.md` §11.

## Seguridad

`firestore.rules` cumple la regla de oro del proyecto: **la lista de invitados
no se puede volcar**. Verificado contra el emulador sin autenticar:

| Operación | Resultado |
|---|---|
| `get` de un invitado por slug conocido | 200 — permitido |
| `list` de la colección de invitados | 403 — denegado |
| `list` de confirmacionesSueltas | 403 — denegado |
| `patch` para alterar los pases | 403 — denegado |

Y sobre las escrituras desde el navegador, comprobado también sin autenticar:

| Intento | Resultado |
|---|---|
| Confirmar 3 de 4 pases | 200 — permitido |
| Confirmar 20 teniendo 4 | 403 — denegado |
| Subirse los pases a 99 | 403 — denegado |
| Cambiar su propio teléfono | 403 — denegado |
| Declinar contando 3 asistentes | 403 — denegado |
| Estado inventado o nombre vacío | 403 — denegado |

Toda la tabla se reproduce con `npm run probar-reglas` (32 casos) contra el
emulador — no son afirmaciones sueltas, es lo que corre en cada cambio a
`firestore.rules`.

La configuración de Firebase va incrustada en el JS a propósito: en Firebase la
seguridad está en las reglas, no en ocultar la clave.

Nunca se comitean `enlaces-invitados.csv` ni ningún `*-service-account.json`.

## Identidad

La marca es un anillo geométrico —aro y solitario— derivado de las propias
fotos; el rombo es el mismo ornamento que se repite en toda la invitación.
Se dibuja dos veces: como SVG en `public/favicon.svg` y con dos elementos CSS
en `components/NoEncontrado.astro`. **Si cambia una, hay que cambiar la otra.**
