import { Outlet } from 'react-router-dom';
/** Marco público: nunca ofrece enlaces a accesos internos. */
export function RootLayout() {
  return (
    <main className="public-area">
      <Outlet />
    </main>
  );
}
