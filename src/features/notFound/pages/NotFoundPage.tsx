import React from 'react';
import { Button } from '../../../shared/components/Button';
import { APP_ROUTES } from '../../../app/router/routes';

export const NotFoundPage: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 'var(--space-12) var(--space-4)',
        gap: 'var(--space-4)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '4.5rem',
          fontWeight: 800,
          color: 'var(--color-accent-primary)',
          lineHeight: 1,
        }}
      >
        404
      </span>
      <h1 style={{ fontSize: '1.75rem' }}>Página no encontrada</h1>
      <p style={{ maxWidth: '480px', fontSize: '1rem', color: 'var(--color-text-secondary)' }}>
        La ruta a la que intentas acceder no existe en Huomo o ha sido movida. Puedes regresar al
        portal principal para acceder a las áreas disponibles.
      </p>
      <div style={{ marginTop: 'var(--space-4)' }}>
        <Button to={APP_ROUTES.HOME} variant="primary">
          Volver al Inicio
        </Button>
      </div>
    </div>
  );
};
