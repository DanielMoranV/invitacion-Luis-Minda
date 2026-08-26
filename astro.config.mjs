// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import preact from '@astrojs/preact';

// Astro no vuelca .env en process.env dentro de este archivo, así que hay que
// leerlo a mano. Sin esto, `site` se quedaba con el valor por defecto y el
// og:image apuntaba a un dominio equivocado.
const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');

/**
 * En producción, Firebase Hosting reescribe /i/** a invitacion/index.html.
 * `astro dev` no sabe nada de firebase.json, así que sin esto los enlaces de
 * invitado daban 404 en desarrollo y no se podían probar.
 */
const reescrituraInvitado = {
  name: 'reescritura-invitado',
  configureServer(servidor) {
    servidor.middlewares.use((req, _res, siguiente) => {
      if (req.url && /^\/i\/[^/?#]+/.test(req.url)) req.url = '/invitacion';
      siguiente();
    });
  },
};

export default defineConfig({
  // De aquí salen el canonical y la URL absoluta de og:image, sin la que
  // WhatsApp no arma la vista previa.
  site: env.SITIO ?? 'https://luisyminda.web.app',

  // Todo estático. Los datos del invitado los pide el navegador a Firestore,
  // que valida los pases con las reglas de seguridad: sin backend, sin Blaze.
  output: 'static',

  // Solo el panel usa Preact; la invitación sigue sin JavaScript de framework.
  integrations: [preact()],

  vite: { plugins: [reescrituraInvitado] },

  image: { responsiveStyles: true },
  build: { inlineStylesheets: 'auto' },
});
