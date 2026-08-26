import { useEffect, useState } from 'preact/hooks';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { obtenerAuth } from './firebase';
import { Entrar } from './Entrar';
import { Invitados } from './Invitados';

export function Panel() {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(
    () => onAuthStateChanged(obtenerAuth(), (u) => { setUsuario(u); setListo(true); }),
    [],
  );

  // Evita el parpadeo del login mientras Firebase restaura la sesión.
  if (!listo) return <div class="panel" />;
  if (!usuario) return <div class="panel"><Entrar /></div>;

  return (
    <div class="panel">
      <header class="panel__barra">
        <span class="panel__marca">Luis &amp; Minda <span>· invitados</span></span>
        <div class="panel__barra-final">
          <span class="panel__usuario">{usuario.email}</span>
          <button class="btn btn--pequeno" onClick={() => signOut(obtenerAuth())}>Salir</button>
        </div>
      </header>
      <main class="panel__cuerpo">
        <Invitados />
      </main>
    </div>
  );
}
