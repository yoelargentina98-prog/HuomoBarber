import React from 'react';
import { Outlet } from 'react-router-dom';
import { Badge } from '../../shared/components/Badge';
import { Alert } from '../../shared/components/Alert';

export const PublicLayout: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
          borderBottom: '1px solid var(--color-border-subtle)',
          paddingBottom: 'var(--space-4)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <h1 style={{ fontSize: '1.75rem' }}>Portal Público de Reservas</h1>
            <Badge variant="info">Público / Clientes</Badge>
          </div>
          <p style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>
            Ruta técnica: <code>/reservar</code> — Catálogo y turnos abiertos para clientes finales
          </p>
        </div>
      </header>

      <Alert type="info" title="Naturaleza de este Portal">
        Este portal es de <strong>acceso público</strong> y no representa un rol de empleado interno
        de la barbería. Permite a los clientes seleccionar servicios, elegir barbero y solicitar un
        turno sin privilegios administrativos.
      </Alert>

      <div>
        <Outlet />
      </div>
    </div>
  );
};
