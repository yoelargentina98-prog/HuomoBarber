import { useState } from 'react';
import { useNetworkStatus } from './useNetworkStatus';

export function OfflineBanner() {
  const { isOnline, checkConnection } = useNetworkStatus();
  const [checking, setChecking] = useState(false);

  if (isOnline) return null;

  async function handleRetry() {
    setChecking(true);
    try {
      await checkConnection();
    } finally {
      setTimeout(() => setChecking(false), 600);
    }
  }

  return (
    <aside
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        background: '#852d2d',
        color: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        borderRadius: '8px',
        padding: '0.65rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
        fontSize: '0.88rem',
        maxWidth: 'calc(100vw - 2rem)',
        animation: 'slideDown 0.25s ease-out',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: '1.1rem' }}>
        ⚠️
      </span>
      <span>Sin conexión a internet. Verificá tu red.</span>
      <button
        type="button"
        onClick={() => void handleRetry()}
        disabled={checking}
        style={{
          background: 'rgba(255, 255, 255, 0.2)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          borderRadius: '4px',
          padding: '0.3rem 0.6rem',
          fontSize: '0.8rem',
          fontWeight: 600,
          cursor: checking ? 'wait' : 'pointer',
        }}
      >
        {checking ? 'Reconectando…' : 'Reintentar'}
      </button>
    </aside>
  );
}
