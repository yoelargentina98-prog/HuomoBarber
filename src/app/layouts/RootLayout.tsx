import { Outlet } from 'react-router-dom';
import { NativeBridge } from '../../shared/native/NativeBridge';

/** Marco público: nunca ofrece enlaces a accesos internos. */
export function RootLayout() {
  return (
    <main className="public-area">
      <NativeBridge />
      <Outlet />
    </main>
  );
}
