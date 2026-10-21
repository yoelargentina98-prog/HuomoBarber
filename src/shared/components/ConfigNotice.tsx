import React from 'react';
import { useSupabaseStatus } from '../hooks/useSupabaseStatus';
import { Badge } from './Badge';

export const ConfigNotice: React.FC = () => {
  const { isConfigured } = useSupabaseStatus();

  if (isConfigured) {
    return (
      <Badge variant="success" aria-label="Estado de backend: Supabase configurado">
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-success)',
          }}
        />
        Supabase Configurado
      </Badge>
    );
  }

  return (
    <Badge variant="warning" aria-label="Estado de backend: Supabase pendiente de credenciales">
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-warning)',
        }}
      />
      Supabase: Sin configurar (.env)
    </Badge>
  );
};
