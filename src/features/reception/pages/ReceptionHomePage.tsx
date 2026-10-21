import React from 'react';
import { Badge } from '../../../shared/components/Badge';

export const ReceptionHomePage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <section className="card">
        <h2 style={{ fontSize: '1.35rem', marginBottom: 'var(--space-2)' }}>
          Mostrador y Atención de Recepción
        </h2>
        <p style={{ fontSize: '0.925rem', lineHeight: 1.6 }}>
          Punto operativo para la recepción de clientes con turno previo o por orden de llegada.
          Desde aquí se confirmará la llegada, se asignará el sillón disponible y se registrarán los
          cobros al finalizar el servicio.
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
            <h3 style={{ fontSize: '1.1rem' }}>Recepción de Clientes</h3>
            <Badge variant="neutral">Pendiente</Badge>
          </div>
          <p style={{ marginTop: 'var(--space-2)', fontSize: '0.875rem' }}>
            Check-in de clientes con cita previa y registro express de clientes en espera sin turno.
          </p>
        </article>

        <article className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Cobro y Registro de Caja</h3>
            <Badge variant="neutral">Pendiente</Badge>
          </div>
          <p style={{ marginTop: 'var(--space-2)', fontSize: '0.875rem' }}>
            Emisión de comprobante, selección de medio de pago (efectivo, débito, transferencia) y
            asignación de propinas/comisiones al barbero.
          </p>
        </article>

        <article className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Disponibilidad en Tiempo Real</h3>
            <Badge variant="neutral">Pendiente</Badge>
          </div>
          <p style={{ marginTop: 'var(--space-2)', fontSize: '0.875rem' }}>
            Visualización rápida del estado de cada sillón de la barbería (libre, ocupado, próximo a
            desocuparse).
          </p>
        </article>
      </section>
    </div>
  );
};
