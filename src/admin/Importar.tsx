import { useState } from 'preact/hooks';
import { crearInvitadosEnLote, PASES_POR_DEFECTO, type Invitado, type NuevoInvitado } from './datos';

/** SheetJS pesa bastante: se carga solo cuando se abre esta pantalla. */
async function sheetjs() {
  return await import('xlsx');
}

const COLUMNAS = ['nombre', 'grupo', 'telefono', 'pases'] as const;

interface FilaLeida {
  linea: number;
  nombre: string;
  grupo: string;
  telefono: string;
  pases: number;
  problema: 'sin-nombre' | 'duplicado-archivo' | 'ya-existe' | null;
}

interface Props {
  existentes: Invitado[];
  alCerrar: () => void;
}

export function Importar({ existentes, alCerrar }: Props) {
  const [filas, setFilas] = useState<FilaLeida[] | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [error, setError] = useState('');
  const [leyendo, setLeyendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [hecho, setHecho] = useState<number | null>(null);

  const descargarPlantilla = async () => {
    const XLSX = await sheetjs();
    const hoja = XLSX.utils.aoa_to_sheet([
      COLUMNAS as unknown as string[],
      ['Familia Pérez López', 'Familia de la novia', '+51 987 654 321', 4],
      ['Ana María Rojas', 'Amigos', '+51 999 111 222', 2],
    ]);
    hoja['!cols'] = [{ wch: 32 }, { wch: 24 }, { wch: 20 }, { wch: 10 }];
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Invitados');
    XLSX.writeFile(libro, 'plantilla-invitados.xlsx');
  };

  const leerArchivo = async (e: Event) => {
    const archivo = (e.target as HTMLInputElement).files?.[0];
    if (!archivo) return;

    setLeyendo(true);
    setError('');
    setHecho(null);
    setNombreArchivo(archivo.name);

    try {
      const XLSX = await sheetjs();
      const libro = XLSX.read(await archivo.arrayBuffer());
      const hoja = libro.Sheets[libro.SheetNames[0]];
      const crudo: Record<string, unknown>[] = XLSX.utils.sheet_to_json(hoja, { defval: '' });

      // Las cabeceras llegan como las escribió la pareja: se normalizan.
      const clave = (fila: Record<string, unknown>, quiero: string) => {
        const k = Object.keys(fila).find(
          (x) =>
            x
              .normalize('NFD')
              .replace(/[̀-ͯ]/g, '')
              .trim()
              .toLowerCase() === quiero,
        );
        return k ? String(fila[k] ?? '').trim() : '';
      };

      const vistos = new Set<string>();
      const yaEnBase = new Set(existentes.map((i) => i.nombre.trim().toLowerCase()));

      const leidas: FilaLeida[] = crudo.map((f, i) => {
        const nombre = clave(f, 'nombre');
        const min = nombre.toLowerCase();
        let problema: FilaLeida['problema'] = null;
        if (!nombre) problema = 'sin-nombre';
        else if (vistos.has(min)) problema = 'duplicado-archivo';
        else if (yaEnBase.has(min)) problema = 'ya-existe';
        if (nombre) vistos.add(min);
        const pasesTexto = clave(f, 'pases');
        const pasesLeidos = parseInt(pasesTexto, 10);
        const pases = Number.isFinite(pasesLeidos)
          ? Math.min(Math.max(pasesLeidos, 1), 20)
          : PASES_POR_DEFECTO;

        return {
          linea: i + 2, // +1 por cabecera, +1 porque Excel empieza en 1
          nombre,
          grupo: clave(f, 'grupo'),
          telefono: clave(f, 'telefono'),
          pases,
          problema,
        };
      });

      if (leidas.length === 0) {
        setError('El archivo no tiene filas. ¿Está vacío o los datos están en otra hoja?');
        setFilas(null);
      } else if (leidas.every((f) => !f.nombre)) {
        setError(
          'No encontramos ninguna columna llamada "nombre". Descarga la plantilla y usa sus mismas cabeceras.',
        );
        setFilas(null);
      } else {
        setFilas(leidas);
      }
    } catch (e) {
      console.error('[importar] falló la lectura del archivo:', e);
      setError('No pudimos leer el archivo. Debe ser .xlsx, .xls o .csv.');
      setFilas(null);
    } finally {
      setLeyendo(false);
      (e.target as HTMLInputElement).value = '';
    }
  };

  const nuevas = filas?.filter((f) => !f.problema) ?? [];
  const omitidas = filas?.filter((f) => f.problema) ?? [];

  const importar = async () => {
    if (!nuevas.length) return;
    setGuardando(true);
    setError('');
    try {
      const lista: NuevoInvitado[] = nuevas.map((f) => ({
        nombre: f.nombre,
        grupo: f.grupo || null,
        telefono: f.telefono || null,
        pases: f.pases,
      }));
      await crearInvitadosEnLote(lista);
      setHecho(lista.length);
      setFilas(null);
    } catch (e) {
      console.error('[importar] falló crearInvitadosEnLote:', e);
      const codigo = (e as { code?: string })?.code;
      setError(
        codigo === 'permission-denied'
          ? 'Firestore rechazó el alta (permission-denied). Revisa que las reglas estén desplegadas y que tu usuario esté en "owners".'
          : `No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.${codigo ? ` (${codigo})` : ''}`,
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div class="tarjeta importar">
      <div class="importar__cabecera">
        <h2 class="importar__titulo">Importar lista de invitados</h2>
        <button class="btn btn--pequeno" onClick={alCerrar}>Cerrar</button>
      </div>

      <ol class="importar__pasos">
        <li>
          <strong>Descarga la plantilla</strong> y llénala con tus invitados.
          Solo el nombre es obligatorio; si no pones "pases", se usa{' '}
          {PASES_POR_DEFECTO} por defecto.
          <div class="importar__accion">
            <button class="btn btn--pequeno" onClick={descargarPlantilla}>
              Descargar plantilla (.xlsx)
            </button>
          </div>
        </li>

        <li>
          <strong>Sube el archivo.</strong> Se lee aquí mismo, en tu navegador;
          no se envía a ningún lado hasta que confirmes.
          <div class="importar__accion">
            <label class="btn btn--pequeno importar__subir">
              {leyendo ? 'Leyendo…' : 'Elegir archivo'}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                hidden
                disabled={leyendo}
                onChange={leerArchivo}
              />
            </label>
            {nombreArchivo && !error && <span class="importar__archivo">{nombreArchivo}</span>}
          </div>
        </li>

        <li>
          <strong>Revisa y confirma.</strong> Te mostramos qué se va a añadir
          antes de guardar nada.
        </li>
      </ol>

      {error && <p class="aviso aviso--error">{error}</p>}

      {hecho !== null && (
        <p class="aviso aviso--ok">
          Listo: se añadieron {hecho} {hecho === 1 ? 'invitado' : 'invitados'}.
          Ya aparecen en la lista con su enlace.
        </p>
      )}

      {filas && (
        <div class="importar__vista">
          <p class="importar__resumen">
            <strong>{nuevas.length}</strong> {nuevas.length === 1 ? 'se añadirá' : 'se añadirán'}
            {omitidas.length > 0 && <> · <strong>{omitidas.length}</strong> se omitirán</>}
          </p>

          <div class="importar__tabla-caja">
            <table class="importar__tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Grupo</th>
                  <th>Teléfono</th>
                  <th>Pases</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr class={f.problema ? 'importar__fila--omitida' : ''}>
                    <td>{f.nombre || <em>(vacío)</em>}</td>
                    <td>{f.grupo || '—'}</td>
                    <td>{f.telefono || '—'}</td>
                    <td>{f.pases}</td>
                    <td>
                      {f.problema === 'sin-nombre' && 'Sin nombre'}
                      {f.problema === 'duplicado-archivo' && 'Repetido en el archivo'}
                      {f.problema === 'ya-existe' && 'Ya está en la lista'}
                      {!f.problema && <span class="importar__ok">Se añadirá</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div class="importar__botones">
            <button
              class="btn btn--principal"
              disabled={guardando || nuevas.length === 0}
              onClick={importar}
            >
              {guardando
                ? 'Guardando…'
                : `Añadir ${nuevas.length} ${nuevas.length === 1 ? 'invitado' : 'invitados'}`}
            </button>
            <button class="btn" onClick={() => { setFilas(null); setNombreArchivo(''); }}>
              Descartar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
