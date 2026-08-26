# Panel de control — Especificación y estado

Panel privado para que Luis y Minda gestionen su lista de invitados y sigan las
confirmaciones.

> **Estado: construido** (24 de agosto de 2026) — login, tabla de invitados,
> alta manual e **importación desde Excel**, probados contra los emuladores de
> Auth y Firestore. Faltan el tablero y la exportación.
> Vive en `/admin`, código en `src/admin/`.

---

## Qué hay ya montado

No se parte de cero. Esto ya existe y funciona en producción:

| Pieza | Estado |
|---|---|
| Modelo de datos de invitados | Listo, en uso |
| Índices de Firestore (`estado+nombre`, `grupo+nombre`) | Desplegados |
| Regla de dueño `esDuenio()` | Escrita, **sin activar** (ver bloqueantes) |
| Generación de slugs con sufijo aleatorio | Listo |
| Importación con validación y vista previa | Listo, **como script de terminal** |
| Exportación de enlaces (`enlaces-invitados.csv`) | Listo, como salida del importador |

### Documento de invitado

```
bodas/luis-minda/invitados/<slug>

  nombre            "Familia Martínez Zapata"
  grupo             "Familia de la novia" | null
  telefono          "+51 987 654 321" | null
  estado            "pendiente" | "confirmado" | "declinado"
  asistentes        3 | null
  enviadoEn         timestamp | null    — último envío del enlace
  envios            0                   — cuántas veces se ha enviado
  creadoEn          timestamp

  — se añaden al confirmar —
  nombreConfirmado  quien respondió
  dieta             restricciones alimentarias | null
  confirmadoEn      timestamp
```

---

## Bloqueantes antes de escribir una línea

1. **El documento `bodas/luis-minda` no existe.** Las reglas comprueban
   `request.auth.uid in bodas/{boda}.owners`, y ese documento devuelve
   `NOT_FOUND`. Mientras no exista con un array `owners`, **`esDuenio()` es
   siempre falso y el panel no podrá leer ni escribir nada.**
2. ~~Firebase Auth no está habilitado~~ → habilitado. **Faltan las cuentas de
   Luis y Minda y sus UID.**
3. ~~El SDK de Firebase no está instalado.~~ → instalado. El sitio público lo evita a
   propósito (usa REST, 3,5 KB), pero el panel sí lo quiere: los listeners en
   tiempo real y Auth no se hacen a mano de forma razonable. Está tras
   autenticación, así que su peso no afecta a los invitados.
4. ~~¿Quién lo usa?~~ **Decidido: lo usan los novios.** Cargan la lista ellos
   mismos, por importación o con un formulario. Eso fija tres cosas:
   la interfaz debe ser a prueba de errores y funcionar en el móvil, la
   importación web deja de ser opcional, y hace falta un alta manual de
   invitado (que la especificación original no contemplaba).

---

## Acceso

- Firebase Auth con correo y contraseña. Dos cuentas, una por cada uno.
- Sin registro público: las cuentas se crean a mano desde la consola.
- Ruta `/admin`, con `noindex` (ya cubierto por el prop `noIndex` del layout).

---

## Pantalla 1 — Tablero

Cifras en vivo con listeners de Firestore.

| Dato | ¿Hay datos? |
|---|---|
| Total de invitados | Sí |
| Confirmados + suma de asistentes reales | Sí |
| Pendientes | Sí |
| Declinados | Sí |
| Pases asignados vs. confirmados | Sí |
| Cuenta regresiva al cierre (30 dic 2026) | Sí, en `evento.json` |
| Últimas confirmaciones, cronológicas | Sí, por `confirmadoEn` |
| Invitaciones enviadas | Sí — campos `enviadoEn` y `envios` |

### Seguimiento de envíos

Se modela con dos campos en vez de un booleano, porque hace falta poder
**reenviar**:

- `enviadoEn` — cuándo se envió por última vez
- `envios` — cuántas veces; distingue "nunca enviado" de "reenviado tres veces"

El botón de la fila cambia según el estado: **Enviar** si `envios` es 0,
**Reenviar** si ya se envió, mostrando la fecha del último.

> **Lo que estos campos significan, con precisión.** El botón abre `wa.me`;
> desde ahí no hay forma de saber si la persona llegó a pulsar enviar. Así que
> `enviadoEn` registra *"abrimos WhatsApp para este invitado"*, no una entrega
> confirmada.
>
> Por eso el panel debe permitir **desmarcar** un envío: si abren WhatsApp y se
> arrepienten, la lista tiene que poder volver atrás. Ya está cubierto por las
> reglas y probado.

## Pantalla 2 — Invitados

Tabla con búsqueda, filtro por estado y por grupo, y orden por columna.

Columnas: nombre · grupo · estado · asistentes · **dieta** · enlace · acciones

Por fila:
- Indicador de estado — verde confirmado, gris pendiente, rojo declinado
- **Copiar enlace** personalizado
- **Enviar por WhatsApp** — abre `wa.me` con el mensaje redactado y el enlace
- **Editar** y **eliminar**

Acciones en lote: eliminar seleccionados, cambiar de grupo, exportar selección.

> **Los novios deben poder marcar una confirmación a mano.** Siempre hay quien
> confirma por teléfono o en persona; si el panel no lo permite, la lista deja
> de reflejar la realidad y dejan de usarlo. Las reglas ya lo permiten para
> `esDuenio()`.

> **Añadido en esta revisión: la columna `dieta`.** El RSVP ya la captura y es
> exactamente el dato que la organizadora necesita para el banquete. La
> especificación original la omitía.

## Pantalla 3 — Importar  *(obligatoria)*

**Ya existe como script de terminal** (`npm run importar`), con la validación
completa: detecta filas sin nombre, `pases` inválidos, duplicados dentro del
archivo y nombres que ya están en la base. Es idempotente. Esa lógica se
reaprovecha tal cual.

Falta:

- Interfaz web con el flujo de tres pasos (plantilla → subir → vista previa)
- Lectura de `.xlsx` con SheetJS en el navegador (hoy solo CSV)
- Plantilla `.xlsx` descargable con las columnas y una fila de ejemplo

### Consecuencia: la cuenta de servicio deja de hacer falta

El script escribe con **cuenta de servicio**, que se salta las reglas. Si los
novios cargan desde el panel, escriben con sus propias credenciales y las
reglas se aplican. **Eso elimina la necesidad de generar una clave privada**,
que era el único secreto real del proyecto. Una preocupación menos.

El script de terminal se queda como herramienta de desarrollo.

### Consecuencia: las reglas de alta se endurecieron

Con las altas viniendo del navegador, `allow create` ya no puede limitarse a
comprobar que seas dueño. Ahora valida la forma del documento —nombre no vacío
y de hasta 120 caracteres, `estado` inicial `pendiente`, `asistentes` nulo,
topes en grupo y teléfono, y una lista cerrada de campos— para que un fallo del
panel no ensucie la base. **Ya desplegado.**

## Sin cupo por invitación

**En esta boda no se restringe por pases.** Cada invitado dice cuántas personas
vienen; el campo `pases` se eliminó del modelo, de las reglas, de la plantilla
y de toda la interfaz.

Lo que sí queda es un **tope de sanidad de 20** en las reglas. No es un cupo por
invitado: evita que un dedazo meta un 900 y descuadre el conteo del banquete.

### Generación de slugs desde el cliente

El script comprueba los slugs existentes antes de escribir. Desde el navegador
no hace falta: Firestore rechaza un `create` si el documento ya existe, así que
basta con generar el slug, intentar crearlo y, si choca, generar otro sufijo.
Los 400 invitados caben en un solo lote (el límite es 500).

| nombre | grupo | telefono |
|---|---|---|
| Familia Pérez López | Familia del novio | +51 987 654 321 |

## Pantalla 3b — Alta manual  *(nueva)*

No estaba en la especificación original, pero si los novios cargan la lista,
van a querer añadir invitados sueltos según se acuerden: el primo que faltaba,
la pareja de alguien. Formulario corto —nombre, pases, grupo, teléfono— pensado
para el móvil, porque este es el flujo que más se va a usar desde el celular.

## Pantalla 4 — Exportar

Nada construido. Es de lo más barato del panel: leer la colección y generar el
archivo en el navegador.

- **Excel completo** para la organizadora
- **Solo confirmados** con nombres, asistentes y dieta, para el banquete
- **Pendientes con teléfono** para dar seguimiento

## Pantalla 5 — Contenido del evento

**Probablemente ya no hace falta.** Se pensó cuando faltaban datos; hoy los
novios respondieron casi todo y `evento.json` está completo. Editar un JSON y
volver a desplegar es más barato que construir y mantener un formulario.

> Parte de esta pantalla quedó obsoleta: mencionaba "la modalidad de la sección
> de regalos", y esa sección se eliminó (los novios pidieron no poner nada).

---

## Notas de implementación

- SPA en el cliente, sin SSR. No necesita SEO y está tras autenticación.
- Preact o Svelte para mantener el bundle pequeño.
- Listeners en tiempo real solo en el tablero y la tabla. En el resto, lecturas
  puntuales para no gastar cuota.
- Toda escritura pasa por las reglas, que verifican `owners`.
- **Diseñar la tabla para el móvil**: es muy probable que la revisen desde el
  celular, no desde un escritorio.

### Contraste

Los colores de `src/styles/panel.css` no se eligieron a ojo: salen de calcular
el mínimo que cumple **WCAG AA** —4.5 para texto, 3.0 para bordes de control
(1.4.11)— sobre cada fondo real. Los 12 pares medidos cumplen.

> **Cuidado con la especificidad al tocar el CSS.** El reset de controles vivía
> en `.panel button` (0,1,1) y ganaba a `.btn--principal` (0,1,0): el
> `color: #fff` del botón principal se perdía y el texto salía en tinta oscura
> sobre verde oscuro, con un contraste de 1.36. Ahora el reset usa `:where()`,
> que no aporta especificidad. Si añades reglas de control, mantén ese patrón.

## Orden sugerido

1. Crear `bodas/luis-minda` con `owners`, habilitar Auth y las dos cuentas
2. Decidir lo de `enviadoEn` **antes** de importar los 400 invitados
3. Login + tabla de invitados + **alta manual** (el grueso del valor)
4. Importación web
5. Tablero
6. Exportar
6. Importación web con SheetJS
