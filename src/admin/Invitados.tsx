import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  escucharInvitados, crearInvitado, editarInvitado, borrarInvitado,
  marcarEnviado, desmarcarEnviado, confirmarAMano, volverAPendiente,
  PASES_POR_DEFECTO,
  type Invitado, type Estado,
} from './datos';
import { Importar } from './Importar';

const ESTADOS: Record<Estado, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  declinado: 'No asiste',
};

const sinTildes = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const SIN_GRUPO = '(sin grupo)';

const fechaCorta = (d: Date | null) =>
  d ? d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }) : '';

function enlaceDe(slug: string) {
  return `${location.origin}/i/${slug}`;
}

function mensajeWhatsApp(inv: Invitado) {
  return (
    `¡Hola! 🤍\n\n` +
    `Luis Ángel y Minda Loren te invitan a su boda el sábado 30 de enero de 2027.\n\n` +
    `Aquí está tu invitación:\n${enlaceDe(inv.slug)}\n\n` +
    `Te pedimos confirmar antes del 30 de diciembre. ¡Nos encantará verte!`
  );
}

export function Invitados() {
  const [lista, setLista] = useState<Invitado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | Estado>('todos');
  const [filtroGrupo, setFiltroGrupo] = useState('todos');
  const [soloSinEnviar, setSoloSinEnviar] = useState(false);
  const [filaAbierta, setFilaAbierta] = useState<string | null>(null);
  const [gruposAbiertos, setGruposAbiertos] = useState<Set<string>>(new Set());
  const [mostrarAlta, setMostrarAlta] = useState(false);
  const [mostrarImportar, setMostrarImportar] = useState(false);

  useEffect(
    () =>
      escucharInvitados(
        (l) => { setLista(l); setCargando(false); setError(''); },
        (e) => {
          setCargando(false);
          setError(
            e.message.includes('permission')
              ? 'Tu cuenta no tiene acceso a esta lista. Falta añadir tu usuario a "owners".'
              : 'No pudimos cargar la lista. Revisa tu conexión.',
          );
        },
      ),
    [],
  );

  const grupos = useMemo(() => {
    const nombrados = [...new Set(lista.map((i) => i.grupo).filter(Boolean))].sort() as string[];
    return lista.some((i) => !i.grupo) ? [...nombrados, SIN_GRUPO] : nombrados;
  }, [lista]);

  const visibles = useMemo(() => {
    const q = sinTildes(busqueda.trim());
    return lista.filter((i) => {
      if (filtroEstado !== 'todos' && i.estado !== filtroEstado) return false;
      if (filtroGrupo === SIN_GRUPO ? i.grupo != null : filtroGrupo !== 'todos' && i.grupo !== filtroGrupo) return false;
      if (soloSinEnviar && i.envios > 0) return false;
      if (!q) return true;
      return sinTildes(i.nombre).includes(q) || sinTildes(i.grupo ?? '').includes(q);
    });
  }, [lista, busqueda, filtroEstado, filtroGrupo, soloSinEnviar]);

  // Agrupadas para que 400 invitaciones sean navegables: una sección
  // colapsable por `grupo`, con su propio conteo, en vez de una lista plana.
  const porGrupo = useMemo(() => {
    const mapa = new Map<string, Invitado[]>();
    for (const inv of visibles) {
      const clave = inv.grupo || SIN_GRUPO;
      (mapa.get(clave) ?? mapa.set(clave, []).get(clave)!).push(inv);
    }
    return [...mapa.entries()].sort(([a], [b]) => {
      if (a === SIN_GRUPO) return 1;
      if (b === SIN_GRUPO) return -1;
      return a.localeCompare(b, 'es');
    });
  }, [visibles]);

  // Con búsqueda o filtro activo no tiene sentido que el usuario tenga que
  // abrir cada grupo a mano para ver sus propios resultados.
  const filtrosActivos =
    busqueda.trim() !== '' || filtroEstado !== 'todos' || filtroGrupo !== 'todos' || soloSinEnviar;

  const alternarGrupo = (g: string) =>
    setGruposAbiertos((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(g)) siguiente.delete(g); else siguiente.add(g);
      return siguiente;
    });

  const resumen = useMemo(() => {
    const conf = lista.filter((i) => i.estado === 'confirmado');
    return {
      total: lista.length,
      confirmados: conf.length,
      asistentes: conf.reduce((s, i) => s + (i.asistentes ?? 0), 0),
      pendientes: lista.filter((i) => i.estado === 'pendiente').length,
      declinados: lista.filter((i) => i.estado === 'declinado').length,
      sinEnviar: lista.filter((i) => i.envios === 0).length,
    };
  }, [lista]);

  if (error) return <p class="aviso aviso--error">{error}</p>;

  return (
    <div class="invitados">
      <div class="resumen">
        <Cifra valor={resumen.total} etiqueta="invitaciones" />
        <Cifra valor={resumen.confirmados} etiqueta="confirmadas" tono="ok" />
        <Cifra valor={resumen.asistentes} etiqueta="asistentes" tono="ok" />
        <Cifra valor={resumen.pendientes} etiqueta="pendientes" />
        <Cifra valor={resumen.declinados} etiqueta="no asisten" tono="alerta" />
        <Cifra valor={resumen.sinEnviar} etiqueta="sin enviar" tono="alerta" />
      </div>

      <div class="controles">
        <input
          class="campo__control controles__buscar"
          type="search"
          placeholder="Buscar por nombre o grupo…"
          value={busqueda}
          onInput={(e) => setBusqueda((e.target as HTMLInputElement).value)}
        />
        <select
          class="campo__control controles__filtro"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado((e.target as HTMLSelectElement).value as any)}
        >
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="confirmado">Confirmados</option>
          <option value="declinado">No asisten</option>
        </select>
        {grupos.length > 0 && (
          <select
            class="campo__control controles__filtro"
            value={filtroGrupo}
            onChange={(e) => setFiltroGrupo((e.target as HTMLSelectElement).value)}
          >
            <option value="todos">Todos los grupos</option>
            {grupos.map((g) => <option value={g}>{g}</option>)}
          </select>
        )}
        <label class="controles__casilla">
          <input
            type="checkbox"
            checked={soloSinEnviar}
            onChange={(e) => setSoloSinEnviar((e.target as HTMLInputElement).checked)}
          />
          Sin enviar
        </label>
        {!filtrosActivos && porGrupo.length > 1 && (
          <button
            class="btn btn--pequeno btn--fantasma"
            onClick={() =>
              setGruposAbiertos((prev) =>
                prev.size === porGrupo.length ? new Set() : new Set(porGrupo.map(([g]) => g)),
              )
            }
          >
            {gruposAbiertos.size === porGrupo.length ? 'Colapsar todo' : 'Expandir todo'}
          </button>
        )}
        <button class="btn" onClick={() => { setMostrarImportar(true); setMostrarAlta(false); }}>
          Importar lista
        </button>
        <button
          class="btn btn--principal"
          onClick={() => { setMostrarAlta(true); setMostrarImportar(false); }}
        >
          + Añadir
        </button>
      </div>

      {mostrarAlta && <FormularioAlta alCerrar={() => setMostrarAlta(false)} />}
      {mostrarImportar && (
        <Importar existentes={lista} alCerrar={() => setMostrarImportar(false)} />
      )}

      {cargando ? (
        <p class="aviso aviso--info">Cargando…</p>
      ) : lista.length === 0 ? (
        <p class="aviso aviso--info">
          Todavía no hay invitados. Usa <strong>Importar lista</strong> para
          cargarlos desde un archivo, o <strong>+ Añadir</strong> para meterlos
          uno a uno.
        </p>
      ) : visibles.length === 0 ? (
        <p class="aviso aviso--info">Ningún invitado coincide con el filtro.</p>
      ) : (
        <>
          <p class="conteo">
            {visibles.length === lista.length
              ? `${lista.length} invitaciones`
              : `${visibles.length} de ${lista.length}`}
            {porGrupo.length > 1 && ` · ${porGrupo.length} grupos`}
          </p>
          <div class="grupos">
            {porGrupo.map(([grupo, items]) => {
              const abierto = filtrosActivos || porGrupo.length === 1 || gruposAbiertos.has(grupo);
              const confirmados = items.filter((i) => i.estado === 'confirmado').length;
              const pendientes = items.filter((i) => i.estado === 'pendiente').length;
              const sinEnviar = items.filter((i) => i.envios === 0).length;
              return (
                <section class="grupo" key={grupo}>
                  {porGrupo.length > 1 && (
                    <button
                      class="grupo__cabecera"
                      onClick={() => alternarGrupo(grupo)}
                      aria-expanded={abierto}
                    >
                      <span class="grupo__flecha" aria-hidden="true">{abierto ? '▾' : '▸'}</span>
                      <span class="grupo__nombre">{grupo}</span>
                      <span class="grupo__cifras">
                        <span class="grupo__total">{items.length}</span>
                        {confirmados > 0 && (
                          <span class="grupo__mini grupo__mini--ok">{confirmados} conf.</span>
                        )}
                        {pendientes > 0 && <span class="grupo__mini">{pendientes} pend.</span>}
                        {sinEnviar > 0 && (
                          <span class="grupo__mini grupo__mini--alerta">{sinEnviar} sin enviar</span>
                        )}
                      </span>
                    </button>
                  )}
                  {abierto && (
                    <ul class="filas">
                      {items.map((inv) => (
                        <Fila
                          key={inv.slug}
                          inv={inv}
                          abierto={filaAbierta === inv.slug}
                          alAlternar={() => setFilaAbierta(filaAbierta === inv.slug ? null : inv.slug)}
                        />
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Cifra({ valor, etiqueta, tono }: { valor: number; etiqueta: string; tono?: string }) {
  return (
    <div class="cifra">
      <span class={`cifra__valor ${tono ? `cifra__valor--${tono}` : ''}`}>{valor}</span>
      <span class="cifra__etiqueta">{etiqueta}</span>
    </div>
  );
}

function Fila({
  inv, abierto, alAlternar,
}: { inv: Invitado; abierto: boolean; alAlternar: () => void }) {
  const [copiado, setCopiado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  // Nada de prompt()/confirm(): son modales del navegador, se comportan mal en
  // móvil y algunos navegadores los bloquean.
  const [confirmando, setConfirmando] = useState(false);
  const [cuantos, setCuantos] = useState(String(inv.pases));
  const [borrando, setBorrando] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlaceDe(inv.slug));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      /* algunos navegadores lo bloquean sin gesto directo */
    }
  };

  const enviar = async () => {
    // Se abre WhatsApp y se marca. No hay forma de saber si llegó a enviarse:
    // por eso existe "Desmarcar".
    const tel = (inv.telefono ?? '').replace(/[^\d]/g, '');
    const url = tel
      ? `https://wa.me/${tel}?text=${encodeURIComponent(mensajeWhatsApp(inv))}`
      : `https://wa.me/?text=${encodeURIComponent(mensajeWhatsApp(inv))}`;
    window.open(url, '_blank', 'noopener');
    try { await marcarEnviado(inv); } catch { /* el envío ya se abrió igual */ }
  };

  const conBloqueo = async (fn: () => Promise<unknown>) => {
    setOcupado(true);
    try { await fn(); } finally { setOcupado(false); }
  };

  return (
    <li class={`fila ${abierto ? 'fila--abierta' : ''}`}>
      <button class="fila__cabecera" onClick={alAlternar} aria-expanded={abierto}>
        <span class="fila__nombre">
          {inv.nombre}
          {inv.envios > 0 && (
            <span class="fila__enviado" title={`Enviado ${inv.envios} ${inv.envios === 1 ? 'vez' : 'veces'}, último el ${fechaCorta(inv.enviadoEn)}`}>
              ✓ enviado{inv.envios > 1 ? ` ×${inv.envios}` : ''}
            </span>
          )}
        </span>
        <span class="fila__meta">
          {inv.grupo && <span class="fila__grupo">{inv.grupo}</span>}
          <span class="fila__pases">{inv.pases === 1 ? '1 pase' : `${inv.pases} pases`}</span>
          {inv.estado === 'confirmado' && (
            <span class="fila__asistentes">
              {inv.asistentes === 1 ? '1 persona' : `${inv.asistentes} personas`}
            </span>
          )}
          <span class={`pastilla pastilla--${inv.estado}`}>{ESTADOS[inv.estado]}</span>
        </span>
      </button>

      {abierto && (
        <div class="fila__detalle">
          {inv.dieta && (
            <p class="fila__dieta"><strong>Alimentación:</strong> {inv.dieta}</p>
          )}
          {inv.nombreConfirmado && inv.nombreConfirmado !== inv.nombre && (
            <p class="fila__dato">Respondió: {inv.nombreConfirmado}</p>
          )}
          {inv.confirmadoEn && (
            <p class="fila__dato">Respondió el {fechaCorta(inv.confirmadoEn)}</p>
          )}
          <p class="fila__enlace">{enlaceDe(inv.slug)}</p>

          {editando ? (
            <FormularioEdicion inv={inv} alCerrar={() => setEditando(false)} />
          ) : confirmando ? (
            <div class="fila__enlinea">
              <span class="fila__enlinea-texto">
                ¿Cuántas personas asistirán? (tiene {inv.pases === 1 ? '1 pase' : `${inv.pases} pases`})
              </span>
              <input
                class="campo__control fila__enlinea-numero"
                type="number"
                min="1"
                max={20}
                inputMode="numeric"
                autofocus
                value={cuantos}
                onInput={(e) => setCuantos((e.target as HTMLInputElement).value)}
              />
              <button
                class="btn btn--principal btn--pequeno"
                disabled={ocupado}
                onClick={() => {
                  const n = Math.min(Math.max(parseInt(cuantos, 10) || 1, 1), 20);
                  conBloqueo(async () => {
                    await confirmarAMano(inv.slug, 'confirmado', n);
                    setConfirmando(false);
                  });
                }}
              >
                Confirmar
              </button>
              <button class="btn btn--pequeno" onClick={() => setConfirmando(false)}>Cancelar</button>
            </div>
          ) : borrando ? (
            <div class="fila__enlinea">
              <span class="fila__enlinea-texto">
                Se eliminará <strong>{inv.nombre}</strong> y su enlace dejará de
                funcionar. No se puede deshacer.
              </span>
              <button
                class="btn btn--pequeno btn--peligro"
                disabled={ocupado}
                onClick={() => conBloqueo(() => borrarInvitado(inv.slug))}
              >
                Sí, eliminar
              </button>
              <button class="btn btn--pequeno" onClick={() => setBorrando(false)}>Cancelar</button>
            </div>
          ) : (
            <div class="fila__acciones">
              <button class="btn btn--pequeno" onClick={copiar}>
                {copiado ? '✓ Copiado' : 'Copiar enlace'}
              </button>
              <button class="btn btn--pequeno" onClick={enviar}>
                {inv.envios > 0 ? 'Reenviar' : 'Enviar'} por WhatsApp
              </button>
              {inv.envios > 0 && (
                <button
                  class="btn btn--pequeno btn--fantasma"
                  disabled={ocupado}
                  onClick={() => conBloqueo(() => desmarcarEnviado(inv.slug))}
                >
                  Desmarcar envío
                </button>
              )}
              <button class="btn btn--pequeno" onClick={() => setEditando(true)}>Editar</button>

              {inv.estado === 'pendiente' ? (
                <>
                  <button class="btn btn--pequeno" onClick={() => setConfirmando(true)}>
                    Confirmar a mano
                  </button>
                  <button
                    class="btn btn--pequeno"
                    disabled={ocupado}
                    onClick={() => conBloqueo(() => confirmarAMano(inv.slug, 'declinado', 0))}
                  >
                    Marcar que no asiste
                  </button>
                </>
              ) : (
                <button
                  class="btn btn--pequeno btn--fantasma"
                  disabled={ocupado}
                  onClick={() => conBloqueo(() => volverAPendiente(inv.slug))}
                >
                  Volver a pendiente
                </button>
              )}

              <button class="btn btn--pequeno btn--peligro" onClick={() => setBorrando(true)}>
                Eliminar
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function FormularioEdicion({ inv, alCerrar }: { inv: Invitado; alCerrar: () => void }) {
  const [nombre, setNombre] = useState(inv.nombre);
  const [grupo, setGrupo] = useState(inv.grupo ?? '');
  const [telefono, setTelefono] = useState(inv.telefono ?? '');
  const [pases, setPases] = useState(String(inv.pases));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const guardar = async (e: Event) => {
    e.preventDefault();
    if (!nombre.trim()) return setError('El nombre no puede quedar vacío.');
    const n = Math.min(Math.max(parseInt(pases, 10) || 1, 1), 20);
    setGuardando(true);
    setError('');
    try {
      await editarInvitado(inv.slug, {
        nombre: nombre.trim(),
        grupo: grupo.trim() || null,
        telefono: telefono.trim() || null,
        pases: n,
      });
      alCerrar();
    } catch (e) {
      console.error('[invitados] falló editarInvitado:', e);
      const codigo = (e as { code?: string })?.code;
      setError(`No se pudo guardar.${codigo ? ` (${codigo})` : ''}`);
      setGuardando(false);
    }
  };

  return (
    <form class="alta" onSubmit={guardar}>
      <Campos
        nombre={nombre} setNombre={setNombre}
        grupo={grupo} setGrupo={setGrupo}
        telefono={telefono} setTelefono={setTelefono}
        pases={pases} setPases={setPases}
      />
      {error && <p class="campo__error">{error}</p>}
      <div class="alta__botones">
        <button class="btn btn--principal btn--pequeno" type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        <button class="btn btn--pequeno" type="button" onClick={alCerrar}>Cancelar</button>
      </div>
    </form>
  );
}

function FormularioAlta({ alCerrar }: { alCerrar: () => void }) {
  const [nombre, setNombre] = useState('');
  const [grupo, setGrupo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [pases, setPases] = useState(String(PASES_POR_DEFECTO));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [ultimo, setUltimo] = useState('');

  const guardar = async (e: Event) => {
    e.preventDefault();
    if (!nombre.trim()) return setError('Escribe un nombre.');
    setGuardando(true);
    setError('');
    try {
      await crearInvitado({
        nombre,
        grupo: grupo.trim() || null,
        telefono: telefono.trim() || null,
        pases: Math.min(Math.max(parseInt(pases, 10) || 1, 1), 20),
      });
      // Se queda abierto: normalmente se añaden varios seguidos.
      setUltimo(nombre.trim());
      setNombre('');
      setTelefono('');
      setGuardando(false);
    } catch (e) {
      console.error('[invitados] falló crearInvitado:', e);
      const codigo = (e as { code?: string })?.code;
      setError(
        codigo === 'permission-denied'
          ? 'Firestore rechazó el alta (permission-denied). Revisa las reglas y "owners".'
          : `No se pudo guardar. Revisa tu conexión.${codigo ? ` (${codigo})` : ''}`,
      );
      setGuardando(false);
    }
  };

  return (
    <div class="tarjeta alta-caja">
      <form class="alta" onSubmit={guardar}>
        <Campos
          nombre={nombre} setNombre={setNombre}
            grupo={grupo} setGrupo={setGrupo}
          telefono={telefono} setTelefono={setTelefono}
          pases={pases} setPases={setPases}
          autoFoco
        />
        {ultimo && !error && (
          <p class="alta__hecho">Añadido: {ultimo}. Puedes seguir con el siguiente.</p>
        )}
        {error && <p class="campo__error">{error}</p>}
        <div class="alta__botones">
          <button class="btn btn--principal btn--pequeno" type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Añadir'}
          </button>
          <button class="btn btn--pequeno" type="button" onClick={alCerrar}>Cerrar</button>
        </div>
      </form>
    </div>
  );
}

function Campos(p: any) {
  return (
    <div class="alta__campos">
      <label class="campo alta__nombre">
        <span class="campo__etiqueta">Nombre</span>
        <input
          class="campo__control"
          value={p.nombre}
          autofocus={p.autoFoco}
          placeholder="Familia Pérez López"
          onInput={(e: any) => p.setNombre(e.target.value)}
        />
      </label>
      <label class="campo">
        <span class="campo__etiqueta">Grupo</span>
        <input
          class="campo__control"
          value={p.grupo}
          placeholder="Familia de la novia"
          onInput={(e: any) => p.setGrupo(e.target.value)}
        />
      </label>
      <label class="campo">
        <span class="campo__etiqueta">Teléfono</span>
        <input
          class="campo__control"
          type="tel"
          inputMode="tel"
          value={p.telefono}
          placeholder="+51 987 654 321"
          onInput={(e: any) => p.setTelefono(e.target.value)}
        />
      </label>
      <label class="campo">
        <span class="campo__etiqueta">Pases</span>
        <input
          class="campo__control"
          type="number"
          min="1"
          max="20"
          inputMode="numeric"
          value={p.pases}
          onInput={(e: any) => p.setPases(e.target.value)}
        />
      </label>
    </div>
  );
}
