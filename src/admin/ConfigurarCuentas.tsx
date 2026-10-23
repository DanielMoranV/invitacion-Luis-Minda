import { useState } from 'preact/hooks';
import { type CuentasBancarias, avisoAlGuardar } from './datos';

interface Props {
  cuentas: CuentasBancarias;
  grupos: string[];
  alCerrar: () => void;
  alGuardar: (nuevas: CuentasBancarias) => Promise<void>;
}

export function ConfigurarCuentas({ cuentas, grupos, alCerrar, alGuardar }: Props) {
  const [noviaTitular, setNoviaTitular] = useState(cuentas.novia.titular);
  const [noviaBanco, setNoviaBanco] = useState(cuentas.novia.banco);
  const [noviaCuenta, setNoviaCuenta] = useState(cuentas.novia.cuenta);
  const [noviaCci, setNoviaCci] = useState(cuentas.novia.cci);

  const [novioTitular, setNovioTitular] = useState(cuentas.novio.titular);
  const [novioBanco, setNovioBanco] = useState(cuentas.novio.banco);
  const [novioCuenta, setNovioCuenta] = useState(cuentas.novio.cuenta);
  const [novioCci, setNovioCci] = useState(cuentas.novio.cci);

  const [gruposSeleccionados, setGruposSeleccionados] = useState<Set<string>>(
    new Set(cuentas.gruposHabilitados),
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [guardadoOk, setGuardadoOk] = useState(false);

  const alternarGrupo = (g: string) => {
    setGruposSeleccionados((prev) => {
      const sig = new Set(prev);
      if (sig.has(g)) sig.delete(g);
      else sig.add(g);
      return sig;
    });
  };

  const guardar = async (e: Event) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    setGuardadoOk(false);

    try {
      await alGuardar({
        novia: {
          titular: noviaTitular.trim() || 'Minda Loren',
          banco: noviaBanco.trim() || 'BCP Soles',
          cuenta: noviaCuenta.trim(),
          cci: noviaCci.trim(),
        },
        novio: {
          titular: novioTitular.trim() || 'Luis Ángel',
          banco: novioBanco.trim() || 'BCP Soles',
          cuenta: novioCuenta.trim(),
          cci: novioCci.trim(),
        },
        gruposHabilitados: [...gruposSeleccionados],
      });
      setGuardadoOk(true);
      setTimeout(() => {
        setGuardadoOk(false);
        alCerrar();
      }, 1000);
    } catch (err) {
      setError(avisoAlGuardar(err));
      setGuardando(false);
    }
  };

  const gruposFiltrados = grupos.filter((g) => g !== '(sin grupo)');

  return (
    <div class="tarjeta alta-caja">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="margin: 0; font-size: 16px; font-weight: 600;">
          💳 Cuentas bancarias para regalo (Transferencia)
        </h3>
        <button class="btn btn--pequeno btn--fantasma" onClick={alCerrar} type="button">
          ✕
        </button>
      </div>

      <p style="margin: 0 0 16px; font-size: 13px; color: var(--suave); line-height: 1.5;">
        Los datos aquí configurados se mostrarán en la invitación web únicamente a los invitados
        de los grupos seleccionados o a quienes tengan activada la opción individualmente.
      </p>

      <form onSubmit={guardar} class="alta">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
          {/* Cuentas Novia */}
          <div style="padding: 12px; border: 1px solid var(--borde); border-radius: 8px; background: #fafbfc;">
            <strong style="display: block; margin-bottom: 10px; font-size: 14px; color: var(--texto);">
              👰 Novia ({noviaTitular})
            </strong>
            <div style="display: grid; gap: 8px;">
              <label class="campo">
                <span class="campo__etiqueta">Banco / Moneda</span>
                <input
                  class="campo__control"
                  value={noviaBanco}
                  onInput={(e: any) => setNoviaBanco(e.target.value)}
                  placeholder="BCP Soles"
                />
              </label>
              <label class="campo">
                <span class="campo__etiqueta">Número de cuenta</span>
                <input
                  class="campo__control"
                  value={noviaCuenta}
                  onInput={(e: any) => setNoviaCuenta(e.target.value)}
                  placeholder="47503534419078"
                />
              </label>
              <label class="campo">
                <span class="campo__etiqueta">Código Interbancario (CCI)</span>
                <input
                  class="campo__control"
                  value={noviaCci}
                  onInput={(e: any) => setNoviaCci(e.target.value)}
                  placeholder="00247510353441907825"
                />
              </label>
            </div>
          </div>

          {/* Cuentas Novio */}
          <div style="padding: 12px; border: 1px solid var(--borde); border-radius: 8px; background: #fafbfc;">
            <strong style="display: block; margin-bottom: 10px; font-size: 14px; color: var(--texto);">
              🤵 Novio ({novioTitular})
            </strong>
            <div style="display: grid; gap: 8px;">
              <label class="campo">
                <span class="campo__etiqueta">Banco / Moneda</span>
                <input
                  class="campo__control"
                  value={novioBanco}
                  onInput={(e: any) => setNovioBanco(e.target.value)}
                  placeholder="BCP Soles"
                />
              </label>
              <label class="campo">
                <span class="campo__etiqueta">Número de cuenta</span>
                <input
                  class="campo__control"
                  value={novioCuenta}
                  onInput={(e: any) => setNovioCuenta(e.target.value)}
                  placeholder="47572217761090"
                />
              </label>
              <label class="campo">
                <span class="campo__etiqueta">Código Interbancario (CCI)</span>
                <input
                  class="campo__control"
                  value={novioCci}
                  onInput={(e: any) => setNovioCci(e.target.value)}
                  placeholder="00247517221776109022"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Selección de grupos */}
        <div style="margin-top: 10px; padding: 12px; border: 1px solid var(--borde); border-radius: 8px; background: #fafbfc;">
          <strong style="display: block; margin-bottom: 6px; font-size: 14px; color: var(--texto);">
            🏷️ Grupos que verán los números de cuenta en su invitación web:
          </strong>
          <p style="margin: 0 0 10px; font-size: 12px; color: var(--tenue);">
            Marca los grupos a cuyos invitados deseas mostrar los datos bancarios:
          </p>
          {gruposFiltrados.length === 0 ? (
            <p style="margin: 0; font-size: 13px; color: var(--tenue); font-style: italic;">
              No hay grupos registrados aún. Puedes asignarle un grupo a tus invitados al crearlos o editarlos.
            </p>
          ) : (
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
              {gruposFiltrados.map((g) => {
                const activo = gruposSeleccionados.has(g);
                return (
                  <label
                    key={g}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      background: activo ? 'rgba(35, 68, 143, 0.08)' : '#ffffff',
                      border: `1px solid ${activo ? 'var(--acento)' : 'var(--borde)'}`,
                      fontSize: '13px',
                      cursor: 'pointer',
                      fontWeight: activo ? 600 : 400,
                      color: activo ? 'var(--acento)' : 'var(--texto)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={activo}
                      onChange={() => alternarGrupo(g)}
                    />
                    {g}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {error && <p class="campo__error" style="color: var(--error); margin: 4px 0 0;">{error}</p>}
        {guardadoOk && <p class="alta__hecho">✓ Cuentas guardadas correctamente.</p>}

        <div class="alta__botones" style="margin-top: 8px;">
          <button class="btn btn--principal" type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar configuración'}
          </button>
          <button class="btn" type="button" onClick={alCerrar}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
