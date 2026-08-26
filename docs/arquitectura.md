# Arquitectura y stack — Invitación virtual Luis & Minda

> Actualizado tras la decisión de incorporar panel de control con Firebase.

## 1. El proyecto ahora son dos aplicaciones

Con el panel de control, esto deja de ser un sitio estático y pasa a ser:

1. **La invitación** — pública, mayormente estática, optimizada para cargar rápido en teléfono.
2. **El panel de los novios** — privado, tras autenticación, CRUD de invitados con importación desde Excel y seguimiento de confirmaciones.

Conviene tenerlo claro porque **aproximadamente duplica el alcance**. La recomendación es enviar primero la invitación funcionando con una lista de invitados cargada a mano, y agregar el panel después. Ver el plan por fases al final.

## 2. Astro sigue siendo correcto, con un ajuste

Astro se mantiene para la invitación. Lo que cambia es cómo se resuelve la ruta personalizada.

Antes los invitados vivían en un CSV y las rutas `/i/[slug]` se generaban en build. **Ahora viven en Firestore y pueden crearse en cualquier momento**, así que ya no se pueden prerenderizar todas.

### Opción recomendada: página estática + server island

Astro 5 permite que la página sea completamente estática (servida desde CDN, LCP excelente) y que **solo el bloque personalizado se resuelva en el servidor** con `server:defer`:

```astro
---
// src/pages/i/[slug].astro
export const prerender = false;
---
<Portada />                          <!-- estático, cacheado -->
<SaludoPersonal server:defer slug={Astro.params.slug}>
  <SaludoGenerico slot="fallback" />
</SaludoPersonal>
<RestoDeSecciones />                 <!-- estático -->
```

El invitado ve la invitación completa de inmediato y el saludo con su nombre aparece una fracción de segundo después. El resto del sitio no paga ningún costo de servidor.

**Alternativa para salir rápido:** página 100% estática que lee el slug de la URL y consulta Firestore desde el cliente, con un esqueleto mientras carga. Cero servidor. Se pierde la personalización de la tarjeta de WhatsApp, que de todos modos es un extra.

## 3. Firebase: sí, con dos advertencias

Es buena elección para este caso:

- **Firestore en tiempo real** da gratis la función que describiste: llega una confirmación y la palomita aparece en el panel al instante, sin recargar.
- **Firebase Auth** resuelve el acceso de los novios en minutos.
- El **plan gratuito sobra**: 50.000 lecturas y 20.000 escrituras por día. Una boda de 200 invitados no se acerca ni de lejos.

Las dos advertencias:

1. **Cloud Functions exige el plan Blaze**, que pide tarjeta de crédito aunque el costo real sea de cero. Si prefieres evitarlo, toda la lógica de servidor puede vivir en el adaptador de Astro (Vercel o Cloudflare) y Firebase queda solo como base de datos y autenticación. **Es lo que recomiendo.**
2. **Firestore no tiene consultas SQL.** Para los reportes que va a querer la pareja ("cuántos confirmados por mesa", "quién falta") hay que modelar los datos pensando en cómo se leen, no en cómo se guardan.

> Si prefirieras Postgres y SQL real, **Supabase** cubre lo mismo (base de datos, auth, tiempo real, row-level security) y la importación desde Excel es más natural. Firebase está bien; solo que la comparación es más pareja de lo que suele decirse.

## 4. Modelo de datos

```
bodas/{bodaId}
├── evento        { novios, fecha, sedes, itinerario, vestimenta, versiculos }
├── owners        [uid, uid]              # los novios
├── config        { regalos: 'mesa'|'sobres'|'ambos'|'oculto' }
│
└── invitados/{invitadoId}
      slug         "familia-perez-a7f3"   # nombre + sufijo aleatorio
      nombre       "Familia Pérez López"
      pases        4
      grupo        "Familia de la novia"
      telefono     "+51..."
      estado       "pendiente" | "confirmado" | "declinado"
      asistentes   3                       # nunca mayor que pases
      mensaje      "..."
      confirmadoEn timestamp
```

Un nivel `bodas/{bodaId}` en la raíz parece innecesario para una sola pareja, pero **permite reutilizar todo el sistema para otra boda** sin reescribir nada. Sale casi gratis ahora y es costoso de agregar después.

## 5. Seguridad — el punto que más importa

Aquí está el riesgo real del diseño. Tres reglas:

**La lista de invitados nunca debe poder listarse públicamente.** Si las reglas permiten `list` sobre `invitados`, cualquiera puede descargar la lista completa con nombres y teléfonos. Solo se permite `get` de un documento cuyo ID se conoce:

```js
match /bodas/{boda}/invitados/{invitado} {
  allow get: if true;                    // solo si conoces el slug exacto
  allow list: if esDuenio(boda);         // listar: solo los novios
  allow write: if esDuenio(boda);        // escribir: solo los novios
}
```

**Los slugs deben llevar sufijo aleatorio.** `familia-perez` es adivinable; `familia-perez-a7f3k` no. No es seguridad fuerte, pero evita que un invitado curioso navegue la lista probando apellidos.

**La confirmación no debe escribirse desde el cliente.** Si el invitado escribe directo en Firestore, puede poner `asistentes: 50` o confirmar por otro. El RSVP debe pasar por un endpoint del servidor que valide que `asistentes <= pases` y que solo toque los campos permitidos.

## 6. Panel de control

Especificación detallada en [`panel-admin.md`](./panel-admin.md). En resumen:

- **SPA en el cliente**, sin SSR. Está tras autenticación y no necesita SEO, así que el SDK de Firestore en el navegador más reglas de seguridad bastan. No hace falta escribir backend para el panel.
- **Importación desde Excel** con SheetJS en el navegador: se lee el archivo, se muestra una vista previa con los errores detectados, y solo entonces se escribe en lote.
- **Plantilla de Excel** descargable con las columnas esperadas (`nombre`, `pases`, `grupo`, `telefono`), para que la pareja no tenga que adivinar el formato.
- **Enlaces personalizados** generados automáticamente al crear cada invitado, con botón de copiar y de abrir WhatsApp con el mensaje ya escrito.
- **Tablero de confirmaciones** con listeners en tiempo real: totales, pendientes, confirmados, declinados, y suma de asistentes reales.
- **Exportación a Excel** para la organizadora y el banquete.

## 7. Regalos

**La lista de deseos queda descartada** — la novia confirmó que no es necesaria. Esto simplifica el proyecto: se elimina la colección `regalos`, la pantalla del panel y toda la lógica de reserva atómica.

La sección se reduce a contenido estático: mesa de regalos externa, lluvia de sobres, o ambas. Se mantiene el interruptor `config.regalos` (`'mesa' | 'sobres' | 'ambos' | 'oculto'`) porque no cuesta nada y evita tocar el componente si cambian de opinión sobre la modalidad.

## 8. Stack final

| Capa | Elección |
|---|---|
| Invitación | Astro 5 + adaptador Vercel (o Cloudflare) |
| Estilos | Tailwind v4 + custom properties |
| Base de datos | Firestore |
| Autenticación | Firebase Auth (correo + contraseña para los novios) |
| Lógica de servidor | Endpoints de Astro, no Cloud Functions |
| Importación Excel | SheetJS en el cliente |
| Panel | SPA con Preact o Svelte, misma base de código |
| Imágenes | `astro:assets` → AVIF/WebP |
| Hosting | Vercel o Cloudflare Pages |

## 9. Plan por fases

Los dos primeros carriles corren **en paralelo**, no en secuencia. La dirección de arte no depende de las respuestas de los novios, así que esperar sus datos para empezar a diseñar es tiempo perdido.

```
Carril A (depende de los novios)     Carril B (arranca ya)
─────────────────────────────────    ─────────────────────────────
Enviar cuestionario                  Brief + fotos a Claude Design
       ↓                                      ↓
Recibir respuestas                   Paleta, tipografías, ornamentos
       ↓                                      ↓
Llenar evento.json                   Patrones de sección
       └──────────────┬───────────────────────┘
                      ↓
                  Maquetado
```

**Fase 1 — Invitación (enviable sola)**
Diseño, secciones estáticas, cuenta regresiva, galería. Los invitados se cargan a mano en un archivo. Ya funciona y se puede compartir.

**Fase 2 — Invitados y RSVP**
Firestore, rutas personalizadas, endpoint de confirmación, enlaces por invitado.

**Fase 3 — Panel**
Auth, CRUD, importación desde Excel, tablero en tiempo real, exportación.

### Qué diseñar antes de tener las respuestas

| Se puede ahora | Conviene esperar |
|---|---|
| Paleta y tipografías | Portada definitiva *(ver nota)* |
| Ornamentos y separadores | — |
| Tratamiento fotográfico | — |
| Bloque de cita / versículo | — |
| Tarjeta de sede con mapa | — |
| Timeline del itinerario | — |
| Formulario de RSVP | — |
| Sección de regalos | — |

> **La portada es la única excepción real.** Un hero construido sobre un plano de detalle y uno construido sobre un retrato de la pareja son composiciones distintas. Como aún no hay retrato en buena calidad (pregunta 27 del cuestionario), conviene pedir **dos variantes de portada** desde el primer pase y quedarse con la que aplique.

> **Usar placeholders realistas, nunca lorem.** Nombres completos largos en español y un versículo de longitud típica. Un diseño validado con texto corto se rompe cuando llega el real.

## 10. Decisiones pendientes

- **¿Dominio propio?** Un `luisyminda.com` se ve mucho mejor al compartirse por WhatsApp.
- **¿400 personas o 400 invitaciones?** Es la diferencia entre ~120 enlaces y 400. Cambia por completo el esfuerzo de envío. Ver nota abajo.
- **¿Quién administra el panel?** Si lo usan los novios directamente, la interfaz debe ser a prueba de errores. Si lo usas tú, puede ser más cruda y se ahorra bastante trabajo.
- **¿Fecha límite de confirmación?** Define si la cuenta regresiva apunta al evento o al cierre de RSVP.

## 11. Nota sobre el volumen: 400 invitados

Firestore no se inmuta con 400 invitados — sigue muy por debajo del plan gratuito. **El problema es operativo, no técnico.**

Si son 400 *enlaces individuales*, alguien tiene que abrir WhatsApp 400 veces. A 20 segundos por envío son más de dos horas de trabajo mecánico, y es donde estos proyectos se atoran.

Mitigaciones, de mayor a menor efecto:

1. **Agrupar por familia o unidad.** 400 personas suelen ser unas 120–150 invitaciones. Un enlace para "Familia Pérez López — 4 pases" en vez de cuatro enlaces. Reduce el envío en dos tercios y además es lo culturalmente esperado.
2. **Botón de WhatsApp en cada fila del panel**, con el mensaje ya redactado. No automatiza el envío, pero lo baja a dos toques.
3. **Enlace genérico como respaldo** para quienes no aparezcan en la lista o pidan la invitación de último momento.

> No recomiendo automatizar el envío masivo por WhatsApp. Las herramientas que lo hacen violan los términos de servicio y el riesgo de que bloqueen el número de los novios justo antes de la boda no compensa el ahorro de tiempo.
