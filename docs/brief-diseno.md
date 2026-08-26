# Brief de diseño — Invitación virtual Luis & Minda

> Documento pensado para pasarse a **Claude Design** como requerimiento.
> Basado en el análisis del referente `susideasinvitaciones.com/demo-nuestra-boda-e-r`.

---

## 1. Análisis del referente

### 1.1 Estructura de secciones (en orden de aparición)

| # | Sección | Contenido |
|---|---|---|
| 1 | **Portada / Save the date** | "SAVE THE DATE" en serif espaciada sobre fondo navy. Nombres de la pareja. Fecha desglosada en bloques (mes / año / día / día de la semana). |
| 2 | **Reproductor de música** | Texto "Haz clic para escuchar nuestra canción" — activación manual, no autoplay. |
| 3 | **Foto full-bleed** | Fotografía a sangre completa, sin márgenes, ocupa el viewport. |
| 4 | **Nuestra Boda** | Título display + ornamento floral acuarela. Texto: "Con la bendición de Dios y en compañía de nuestras familias tenemos el honor de invitarles a la celebración de". |
| 5 | **Frase destacada** | Cita en cursiva con comilla tipográfica gigante y línea divisoria: "El amor nos unió y juntos elegimos caminar por siempre." |
| 6 | **Foto polaroid** | Imagen con marco blanco grueso e inclinación leve, sombra suave. |
| 7 | **Nuestros Padres** | Dos parejas de nombres en versalitas. |
| 8 | **Nuestros Padrinos** | Una pareja de nombres. Título en caligrafía script. |
| 9 | **Ceremonia** | Lugar + hora + mapa embebido + botón "cómo llegar". |
| 10 | **Recepción** | Misma estructura que ceremonia. |
| 11 | **El gran día** | Itinerario/timeline: ceremonia 5pm, recepción 6pm, vals 8pm, brindis 9pm, cena 9pm. |
| 12 | **Hashtag** | `#bodaErnesto&Roxanna` + invitación a usarlo en Instagram. |
| 13 | **No niños** | Aviso: "Aunque amamos a los pequeños, este día está diseñado para que los adultos disfruten al máximo." |
| 14 | **Mesa de regalos** | Enlace a mesa + "lluvia de sobres" con N° de evento y N° de cuenta. |
| 15 | **Confirmación de asistencia** | Texto + botón RSVP. |
| 16 | **Cierre** | "gracias / Por acompañarnos". |

### 1.2 Lenguaje visual

- **Paleta:** azul marino profundo (`#101c33`–`#12203f`) como color dominante, blanco puro, y dorado en degradado (`#e8c87a` → `#b8892f`) para acentos y botones.
- **Alternancia de fondos:** las secciones alternan navy ↔ blanco, lo que marca ritmo al hacer scroll.
- **Tipografías:** tres niveles — serif display de alto contraste para títulos grandes, script caligráfica para nombres de sección ("Nuestros Padrinos"), y serif en versalitas para nombres propios. Cuerpo en serif ligera.
- **Ornamentos:** acuarelas florales en azules y marfil, manchas de tinta al alcohol azul con contorno dorado, líneas divisorias finas.
- **Botones:** píldora con degradado dorado metálico, borde redondeado completo, texto en versalitas oscuras.
- **Animación:** revelado al entrar en viewport (fade + desplazamiento vertical). Cada bloque aparece por separado.
- **Mobile-first:** la composición está pensada para vertical; en desktop el contenido se centra en una columna angosta.

### 1.3 Qué mejoraría respecto al referente

Puntos débiles detectados que conviene no copiar:

- **Sin cuenta regresiva.** Es un elemento esperado en este formato y el referente no lo tiene.
- **Mapas con iframe de Google Maps.** Pesan cientos de KB, cargan cookies de terceros y bloquean el render. Mejor un mapa estático + enlace a direcciones.
- **Sin personalización por invitado.** Todos ven el mismo texto genérico. Un enlace por invitado ("Familia Pérez — 4 lugares") es el mayor diferenciador posible.
- **Erratas visibles** en el demo ("comfirmar asistencia", mayúsculas inconsistentes en nombres). Cuidar la revisión de copy.
- **Datos bancarios expuestos en texto plano** sin ninguna protección ni contexto.

---

## 2. Requerimientos de diseño para Luis & Minda

### 2.1 Dirección de arte

**Paleta definitiva: azul cobalto con celeste pastel**, la temática que eligió
la novia. La crema se conserva como fondo porque también está en sus colores
reservados.

| Papel | Valor |
|---|---|
| Marco de la página | `#0f1c3d` |
| Secciones oscuras | `#1b3161` |
| Acento (botones, títulos) | `#23448f` cobalto |
| Acento claro sobre oscuro | `#a8cde8` celeste pastel |
| Fondo claro | `#f6f1e8` crema |
| Fondo alterno | `#e9eff6` celeste muy diluido |
| Tinta | `#1b2540` |

Los 11 pares de color medidos cumplen WCAG AA.

> **Esto reemplaza la recomendación anterior de oliva y dorado.** Yo la había
> propuesto a partir de las fotos —jardín verde al atardecer— sin saber la
> temática de la boda. Al conocerla, manda la de los novios.
>
> El riesgo que preveía era que un azul chocara con el verde del follaje de
> todas las fotos. Se resuelve con los velos: todos son de tinte navy, así que
> las fotos se leen en frío y quedan integradas en lugar de pelearse con el
> fondo. Los velos viven en `tokens.css` (`--velo-*`), no en los componentes.

### 2.2 Uso de las fotografías

El catálogo está en `img/galeria.json`. Asignación sugerida:

| Foto | Sección |
|---|---|
| `espejo-circular-jardin.jpg` | Portada / hero a sangre |
| `anillo-marco-pareja.jpg` | Sección "Nuestra Boda" o transición |
| `manos-nuca-color.jpg` | Fondo de la frase destacada |
| `mano-anillo-pecho.jpg` | Detalle junto a "Nuestros Padres" |
| `manos-collar-m.jpg` | Detalle en formato polaroid |
| `manos-unidas-jardin.jpg` | Transición antes del itinerario |
| `manos-unidas-detalle.jpg` | Acompañando el RSVP |
| `manos-nuca-blanco-negro.jpg` | Cierre "gracias por acompañarnos" |

> **Hueco de contenido importante:** de las 10 fotos, solo 3 muestran a la pareja completa y **ninguna de buena calidad muestra sus rostros con claridad**. La única con rostros visibles (`abrazo-sonrisa-ia.jpg`) tiene marca de agua de Meta AI y pesa 72 KB. El resto son planos de detalle de manos y anillo.
>
> Para una portada sólida hace falta **al menos un retrato de la pareja en buena resolución**. Conviene pedirlo antes de cerrar el diseño, o bien asumir una dirección de arte deliberadamente basada en detalles y siluetas, que también funciona pero es una decisión, no un accidente.

### 2.3 Secciones a construir

Mismo esqueleto que el referente, con estos ajustes:

1. **Portada** — nombres, fecha, foto a sangre, indicador de scroll.
2. **Cuenta regresiva** — días / horas / minutos / segundos hasta el evento. *(nuevo)*
3. **Invitación** — texto de bienvenida + ornamento.
4. **Frase destacada** — cita sobre fotografía.
5. **Padres y padrinos.**
6. **Lugar** — ceremonia y recepción son en el mismo predio (la recepción es atrás del templo), así que **va una sola sección con un mapa y dos horarios**, no dos bloques repetidos como en el referente. Es una simplificación real respecto al modelo original.
8. **Itinerario** — timeline vertical con iconos.
9. **Código de vestimenta** — con muestra de colores sugeridos. *(nuevo, muy pedido)*
10. **Regalos** — mesa externa y/o lluvia de sobres. Sin lista de deseos (descartada por los novios).
11. **Galería** — carrusel con el resto de las fotos. *(nuevo)*
12. **Hashtag de Instagram.**
13. **RSVP** — formulario con nombre, número de acompañantes, restricciones alimentarias, y confirmación/declinación.
14. **Cierre** — agradecimiento sobre la foto en blanco y negro.

### 2.4 Requisitos transversales

- **Mobile-first estricto.** El 95% del tráfico llegará por WhatsApp en teléfono. Diseñar a 390 px de ancho y escalar hacia arriba.
- **Música opcional**, activada por gesto del usuario, con botón flotante persistente y estado visible. Nunca autoplay.
- **Animaciones de revelado** sutiles al hacer scroll, respetando `prefers-reduced-motion`.
- **Contraste accesible** (AA mínimo) — cuidado con texto claro sobre fotos: usar overlay o degradado.
- **Presupuesto de peso:** menos de 1 MB en la primera carga. Las fotos originales pesan hasta 2.7 MB cada una, así que la optimización no es negociable.
- **Open Graph** cuidado: al compartir por WhatsApp debe verse una tarjeta con foto, nombres y fecha.

### 2.5 Datos pendientes de confirmar

Antes de generar el diseño final hace falta:

- [x] ~~Nombres de la pareja~~ → Luis Ángel Morán Vílchez y Minda Loren Martínez Zapata *(confirmar tildes)*
- [x] ~~Tipo de evento~~ → boda, ceremonia religiosa
- [x] ~~Fecha y hora~~ → sábado 30 de enero de 2027, ceremonia 4:00 pm
- [x] ~~Nombres y direcciones de las sedes~~ → Iglesia del Nazareno, Monte Sullón. Jr. Narihualá #164
- [x] ~~Padres y padrinos~~ → ver `datos-evento.json`
- [ ] Itinerario del día
- [ ] Código de vestimenta
- [ ] Modalidad de regalos: mesa externa, lluvia de sobres o ambas
- [x] ~~Versículos y versión~~ → **NVI**. Marcos 10:9 (portada), Cantares 8:6 (destacado, elegido por la novia), Eclesiastés 4:12 (divisor), 1 Juan 4:19 (cierre)
- [ ] Nombre del pastor y del templo
- [x] ~~¿Habrá brindis con alcohol?~~ → **Habrá brindis, sin bebidas alcohólicas**
- [ ] Canción para el reproductor
- [ ] Hashtag deseado
- [ ] Lista de invitados (si se quiere personalización por invitado)

---

## 3. Adaptación al contexto evangélico

Los novios son evangélicos, y el referente está escrito en clave católica. Esto no es un detalle decorativo: varias fórmulas del demo se leerían fuera de lugar.

### 3.1 Lenguaje a ajustar

| En el referente | Para esta invitación |
|---|---|
| "Iglesia Nuestra Señora de Guadalupe" | Nombre del templo o congregación |
| Sacerdote / padre | **Pastor** |
| "Padrinos" en sentido sacramental | "Padrinos de honor", o retirar la sección si no aplica |
| "Con la bendición de Dios" | Funciona bien, se puede conservar |
| Iconografía mariana o de santos | Evitar por completo |

La sección de padrinos conviene consultarla: en muchas bodas evangélicas existe, pero con un rol distinto al católico, y en otras simplemente no la hay.

**El brindis merece una pregunta.** Parte de las congregaciones evangélicas son abstemias. Si es el caso, el itinerario debería decir "brindis" sin más, o directamente omitir la copa en la ilustración. Vale la pena preguntarlo antes de diseñar el icono.

### 3.2 Versículos

Ubicaciones naturales, sin saturar. **Tres o cuatro en toda la invitación**, no más: si cada sección lleva versículo, pierden peso y la pieza se vuelve pesada.

1. **Bajo los nombres en la portada** — un versículo corto, una línea.
2. **En la sección de la frase destacada** — el más largo, en lugar de la cita genérica del referente.
3. **Antes del itinerario o entre secciones** — como divisor.
4. **En el cierre**, junto al agradecimiento.

Referencias habituales en bodas, de corta a larga:

| Cita | Nota |
|---|---|
| **Marcos 10:9** | "Lo que Dios juntó, no lo separe el hombre." Muy breve, ideal para portada. |
| **Colosenses 3:14** | El amor como vínculo perfecto. Cabe en una línea. |
| **Proverbios 18:22** | Sobre hallar esposa. Breve y clásico. |
| **1 Juan 4:19** | "Nosotros le amamos a él, porque él nos amó primero." |
| **Cantares 8:7** | Las muchas aguas no pueden apagar el amor. Muy visual, buena para superponer sobre foto. |
| **Génesis 2:24** | Serán una sola carne. Clásico de ceremonia. |
| **Eclesiastés 4:9-12** | "Cordón de tres dobleces no se rompe pronto." Excelente para la frase destacada; es el más citado en bodas evangélicas. |
| **1 Corintios 13:4-7** | El pasaje del amor. El más conocido; considerar que por lo mismo es el más repetido. |
| **Rut 1:16** | "Dondequiera que tú fueres, iré yo." Bello, aunque su contexto original no es conyugal. |

**Dos consideraciones prácticas:**

- **Versión definida: NVI**, en los cuatro versículos. La cita la indica: *Eclesiastés 4:12 · NVI*.
- **Cantares 8:6 quedó en redacción NVI, no en la que envió la novia.** Ella mandó «Ponme como un sello sobre tu corazón, como una marca sobre tu brazo», que es RVR1960. Al fijar NVI para toda la invitación, ese versículo pasó a «Grábame como un sello sobre tu corazón; llévame como una marca sobre tu brazo». Conviene que ella lo confirme: es *su* versículo y la diferencia se nota.
- **Verificar el texto exacto contra una Biblia de esa versión antes de publicar.** Las diferencias entre versiones son reales y un versículo mal citado se nota de inmediato en este público.

### 3.3 Tratamiento tipográfico

Los versículos deben distinguirse del resto del copy sin gritar:

- Cursiva de la serif, un escalón más pequeña que el texto de la sección.
- La referencia (*Eclesiastés 4:12*) en versalitas, tamaño menor, con más espaciado entre letras.
- Alineación centrada, ancho de línea corto — 30 a 40 caracteres.
- Sobre fotografía, siempre con overlay para garantizar el contraste.
- El ornamento floral funciona bien como separador antes del versículo, igual que en el referente.
