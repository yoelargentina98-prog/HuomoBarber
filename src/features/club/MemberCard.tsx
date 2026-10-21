import './club.css';
export function MemberCard({ number }: { number?: string | null }) {
  return (
    <section className="club-number">
      <span>HuomoClub · Tu número de cliente</span>
      <strong>{number ?? 'No se pudo cargar el número'}</strong>
      <p>Mostralo al pagar para registrar tus servicios.</p>
    </section>
  );
}
