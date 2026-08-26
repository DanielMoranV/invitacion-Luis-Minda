import { useState } from 'preact/hooks';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { obtenerAuth } from './firebase';

/** Sin registro público: las cuentas de Luis y Minda se crean en la consola. */
export function Entrar() {
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [entrando, setEntrando] = useState(false);

  const enviar = async (e: Event) => {
    e.preventDefault();
    if (entrando) return;
    setError('');
    setEntrando(true);
    try {
      await signInWithEmailAndPassword(obtenerAuth(), correo.trim(), clave);
      // onAuthStateChanged en Panel.tsx se encarga del resto.
    } catch (err: any) {
      // Firebase devuelve el mismo código para usuario inexistente y clave
      // incorrecta, a propósito: no conviene revelar cuál de los dos es.
      const codigo = err?.code ?? '';
      setError(
        codigo === 'auth/invalid-credential' || codigo === 'auth/wrong-password' ||
          codigo === 'auth/user-not-found'
          ? 'Correo o contraseña incorrectos.'
          : codigo === 'auth/too-many-requests'
            ? 'Demasiados intentos. Espera unos minutos.'
            : codigo === 'auth/network-request-failed'
              ? 'Sin conexión. Revisa tu internet.'
              : 'No pudimos iniciar sesión. Inténtalo de nuevo.',
      );
      setEntrando(false);
    }
  };

  return (
    <div class="entrar">
      <div class="entrar__caja">
        <div>
          <h1 class="entrar__titulo">Luis &amp; Minda</h1>
          <p class="entrar__nota">Panel de invitados</p>
        </div>

        <form class="entrar__form" onSubmit={enviar}>
          <label class="campo">
            <span class="campo__etiqueta">Correo</span>
            <input
              class="campo__control"
              type="email"
              autocomplete="username"
              required
              value={correo}
              onInput={(e) => setCorreo((e.target as HTMLInputElement).value)}
            />
          </label>

          <label class="campo">
            <span class="campo__etiqueta">Contraseña</span>
            <input
              class="campo__control"
              type="password"
              autocomplete="current-password"
              required
              value={clave}
              onInput={(e) => setClave((e.target as HTMLInputElement).value)}
            />
          </label>

          {error && <p class="aviso aviso--error">{error}</p>}

          <button class="btn btn--principal" type="submit" disabled={entrando}>
            {entrando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
