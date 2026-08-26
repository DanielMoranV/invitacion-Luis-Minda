// Punto único de importación de las fotografías.
// Los originales viven en /img (catalogados en img/galeria.json);
// astro:assets los procesa a AVIF/WebP en el build.
import espejoCircularJardin from '../img/espejo-circular-jardin.jpg';
import anilloMarcoPareja from '../img/anillo-marco-pareja.jpg';
import manosNucaColor from '../img/manos-nuca-color.jpg';
import manosCollarM from '../img/manos-collar-m.jpg';
import manosUnidasJardin from '../img/manos-unidas-jardin.jpg';
import manosUnidasDetalle from '../img/manos-unidas-detalle.jpg';
import manoAnilloPecho from '../img/mano-anillo-pecho.jpg';
import manosNucaBlancoNegro from '../img/manos-nuca-blanco-negro.jpg';
import luisMinda from '../img/luis-minda.jpeg';

export const fotos = {
  espejoCircularJardin,
  anilloMarcoPareja,
  manosNucaColor,
  manosCollarM,
  manosUnidasJardin,
  manosUnidasDetalle,
  manoAnilloPecho,
  manosNucaBlancoNegro,
  luisMinda,
};

/** Carrusel de la sección Galería, en el orden definido en el canvas. */
export const galeria = [
  { src: manoAnilloPecho, alt: 'La mano de Minda con el anillo, apoyada sobre el pecho de Luis' },
  { src: manosUnidasJardin, alt: 'Las manos de la pareja unidas en el jardín' },
  { src: manosCollarM, alt: 'Manos entrelazadas junto al collar con la inicial M' },
  { src: manosNucaColor, alt: 'Minda abrazando a Luis por la espalda' },
  { src: manosUnidasDetalle, alt: 'Detalle de las manos unidas junto al vestido' },
  { src: anilloMarcoPareja, alt: 'El anillo enmarcando a la pareja a lo lejos' },
];
