import React from 'react';
import { Badge } from '../../../shared/components/Badge';

export const BarberHomePage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <section className="card">
        <h2 style={{ fontSize: '1.35rem', marginBottom: 'var(--space-2)' }}>
          Estación de Trabajo del Barbero
        </h2>
        <p style={{ fontSize: '0.925rem', lineHeight: 1.6 }}>
          Vista técnica optimizada para el profesional en su sillón de trabajo (móvil y tablet).
          Permitirá consultar la cola de clientes del día, iniciar y finalizar servicios, y anotar
          preferencias del corte para fidelizar al cliente.
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
            <h3 style={{ fontSize: '1.1rem' }}>Cola de Turnos del Día</h3>
            <Badge variant="neutral">Pendiente</Badge>
          </div>
          <p style={{ marginTop: 'var(--space-2)', fontSize: '0.875rem' }}>
            Listado ordenado de citas asignadas con nombre del cliente, horario pactado y servicio
            solicitado.
          </p>
        </article>

        <article className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Control de Estados del Servicio</h3>
            <Badge variant="neutral">Pendiente</Badge>
          </div>
          <p style={{ marginTop: 'var(--space-2)', fontSize: '0.875rem' }}>
            Botones de acción rápida: 'Llamar cliente', 'Iniciar corte', 'Completado' para liberar
            el sillón automáticamente en recepción.
          </p>
        </article>

        <article className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Ficha Técnica del Cliente</h3>
            <Badge variant="neutral">Pendiente</Badge>
          </div>
          <p style={{ marginTop: 'var(--space-2)', fontSize: '0.875rem' }}>
            Historial de cortes anteriores, números de alza utilizados en degradé y preferencias de
            peinado.
          </p>
        </article>
      </section>
    </div>
  );
};
