/**
 * Cliente mínimo de Firestore por API REST. Sin SDK: para leer un documento y
 * actualizarlo bastan dos peticiones, y el SDK web pesa cientos de kilobytes.
 *
 * La configuración es pública a propósito: en Firebase la seguridad está en
 * las reglas, no en ocultar la clave. Las reglas impiden listar la colección
 * y tocar cualquier campo que no sea el de la propia confirmación.
 *
 * La configuración se inyecta desde el HTML en window.__CONFIG_FIRESTORE.
 */
(() => {
  const cfg = window.__CONFIG_FIRESTORE || {};
  const raiz = cfg.emulador
    ? `http://${cfg.emulador}/v1`
    : 'https://firestore.googleapis.com/v1';
  const base = `${raiz}/projects/${cfg.projectId}/databases/(default)/documents/bodas/${cfg.bodaId}/invitados`;
  const clave = cfg.apiKey ? `key=${encodeURIComponent(cfg.apiKey)}` : '';

  /** Convierte el formato de valores de Firestore a JS plano. */
  const desdeValor = (v) => {
    if (!v || typeof v !== 'object') return null;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return Number(v.doubleValue);
    if ('booleanValue' in v) return v.booleanValue;
    if ('nullValue' in v) return null;
    if ('timestampValue' in v) return v.timestampValue;
    return null;
  };

  const aDocumento = (campos) => {
    const salida = {};
    for (const [k, v] of Object.entries(campos || {})) salida[k] = desdeValor(v);
    return salida;
  };

  /** Lee un invitado por slug. Devuelve null si no existe. */
  async function obtenerInvitado(slug) {
    if (!/^[a-z0-9-]{1,120}$/.test(slug)) return null;
    const url = `${base}/${encodeURIComponent(slug)}${clave ? '?' + clave : ''}`;
    const r = await fetch(url, { headers: { accept: 'application/json' } });
    if (r.status === 404 || r.status === 403) return null;
    if (!r.ok) throw new Error('firestore:' + r.status);
    const d = await r.json();
    const c = aDocumento(d.fields);
    return {
      slug,
      nombre: String(c.nombre ?? ''),
      grupo: c.grupo ?? null,
      estado: c.estado ?? 'pendiente',
      asistentes: c.asistentes,
      conRegalo: typeof c.conRegalo === 'boolean' ? c.conRegalo : null,
      // Documentos creados antes de que existiera este campo no lo tienen.
      pases: Number(c.pases ?? cfg.pasesPorDefecto ?? 4),
    };
  }

  /** Lee la configuración pública de cuentas bancarias. */
  async function obtenerCuentas() {
    const url = `${raiz}/projects/${cfg.projectId}/databases/(default)/documents/bodas/${cfg.bodaId}/config/cuentas${clave ? '?' + clave : ''}`;
    try {
      const r = await fetch(url, { headers: { accept: 'application/json' } });
      if (!r.ok) return null;
      const d = await r.json();
      const campos = d.fields || {};
      const novia = campos.novia?.mapValue?.fields || {};
      const novio = campos.novio?.mapValue?.fields || {};
      const grupos = campos.gruposHabilitados?.arrayValue?.values || [];
      return {
        novia: {
          titular: desdeValor(novia.titular) || 'Minda Loren',
          banco: desdeValor(novia.banco) || 'BCP Soles',
          cuenta: desdeValor(novia.cuenta) || '',
          cci: desdeValor(novia.cci) || '',
        },
        novio: {
          titular: desdeValor(novio.titular) || 'Luis Ángel',
          banco: desdeValor(novio.banco) || 'BCP Soles',
          cuenta: desdeValor(novio.cuenta) || '',
          cci: desdeValor(novio.cci) || '',
        },
        gruposHabilitados: grupos.map(desdeValor).filter(Boolean),
      };
    } catch {
      return null;
    }
  }

  /**
   * Guarda la confirmación. Las reglas validan del lado del servidor que no
   * se toque ningún campo fuera de los de la confirmación.
   */
  async function guardarRsvp(slug, datos) {
    const campos = [
      'estado',
      'asistentes',
      'nombreConfirmado',
      'dieta',
      'confirmadoEn',
    ];
    const mascara = campos.map((c) => `updateMask.fieldPaths=${c}`).join('&');
    const url = `${base}/${encodeURIComponent(slug)}?${mascara}${clave ? '&' + clave : ''}`;

    const dieta = (datos.dieta || '').trim().slice(0, 500);
    const cuerpo = {
      fields: {
        estado: { stringValue: datos.asiste ? 'confirmado' : 'declinado' },
        asistentes: { integerValue: String(datos.asiste ? datos.asistentes : 0) },
        nombreConfirmado: { stringValue: datos.nombre.trim().slice(0, 120) },
        dieta: dieta ? { stringValue: dieta } : { nullValue: null },
        confirmadoEn: { timestampValue: new Date().toISOString() },
      },
    };

    const r = await fetch(url, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });

    if (r.status === 403) {
      // Las reglas rechazaron: casi siempre, más asistentes que pases.
      return { ok: false, codigo: 'rechazado' };
    }
    if (!r.ok) return { ok: false, codigo: 'error' };
    return { ok: true };
  }

  window.__firestore = { obtenerInvitado, guardarRsvp, obtenerCuentas };
})();
