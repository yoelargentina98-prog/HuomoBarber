import React from 'react';
import { Badge } from '../../../shared/components/Badge';

export const BookingHomePage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <section className="card">
        <h2 style={{ fontSize: '1.35rem', marginBottom: 'var(--space-2)' }}>
          Reserva de Turnos en Línea
        </h2>
        <p style={{ fontSize: '0.925rem', lineHeight: 1.6 }}>
          Portal público accesible para los clientes finales de Huomo. Ofrecerá una experiencia de
          reserva ágil, permitiendo seleccionar los servicios deseados, el barbero de su preferencia
          o la primera disponibilidad horaria.
        </p>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--space-5)',
        }}
      >
        <article className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Paso 1: Selección de Servicios</h3>
            <Badge variant="neutral">Pendiente</Badge>
          </div>
          <p style={{ marginTop: 'var(--space-2)', fontSize: '0.875rem' }}>
            Catálogo interactivo con precios, duración en minutos y descripción de cortes de
            cabello, barba y spa capilar.
          </p>
        </article>

        <article className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Paso 2: Barbero y Horario</h3>
            <Badge variant="neutral">Pendiente</Badge>
          </div>
          <p style={{ marginTop: 'var(--space-2)', fontSize: '0.875rem' }}>
            Selección del barbero o asignación automática inteligente según disponibilidad de agenda
            y calendario en tiempo real.
          </p>
        </article>

        <article className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Paso 3: Confirmación y Datos</h3>
            <Badge variant="neutral">Pendiente</Badge>
          </div>
          <p style={{ marginTop: 'var(--space-2)', fontSize: '0.875rem' }}>
            Ingreso de nombre, teléfono y correo electrónico para envío automático del comprobante y
            recordatorio por mensajería.
          </p>
        </article>
      </section>
    </div>
  );
};
