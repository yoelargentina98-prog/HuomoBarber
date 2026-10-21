/** No muestra errores técnicos ni datos internos al usuario. */
export function RouteFailure() {
  return (
    <main className="route-failure">
      <h1>No pudimos abrir esta pantalla</h1>
      <p>Actualizá la página para volver a cargar el sistema.</p>
      <button type="button" onClick={() => window.location.reload()}>
        Volver a cargar
      </button>
    </main>
  );
}
