import React from 'react';

export type AlertType = 'info' | 'warning' | 'error' | 'success';

interface AlertProps {
  type?: AlertType;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const alertConfig: Record<
  AlertType,
  {
    bg: string;
    border: string;
    color: string;
    icon: string;
  }
> = {
  info: {
    bg: 'var(--color-info-subtle)',
    border: 'rgba(88, 166, 255, 0.3)',
    color: 'var(--color-info)',
    icon: 'ℹ',
  },
  warning: {
    bg: 'var(--color-warning-subtle)',
    border: 'rgba(210, 153, 34, 0.3)',
    color: 'var(--color-warning)',
    icon: '⚠',
  },
  error: {
    bg: 'var(--color-danger-subtle)',
    border: 'rgba(248, 81, 73, 0.3)',
    color: 'var(--color-danger)',
    icon: '✖',
  },
  success: {
    bg: 'var(--color-success-subtle)',
    border: 'rgba(46, 160, 67, 0.3)',
    color: 'var(--color-success)',
    icon: '✔',
  },
};

export const Alert: React.FC<AlertProps> = ({ type = 'info', title, children, className = '' }) => {
  const current = alertConfig[type];

  return (
    <aside
      role={type === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      className={className}
      style={{
        backgroundColor: current.bg,
        border: `1px solid ${current.border}`,
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-4) var(--space-5)',
        display: 'flex',
        gap: 'var(--space-3)',
        alignItems: 'flex-start',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          color: current.color,
          fontSize: '1.15rem',
          fontWeight: 700,
          lineHeight: 1.2,
        }}
      >
        {current.icon}
      </span>
      <div style={{ flex: 1, fontSize: '0.875rem', lineHeight: 1.5 }}>
        {title && (
          <strong
            style={{
              display: 'block',
              color: 'var(--color-text-primary)',
              marginBottom: '0.25rem',
              fontWeight: 600,
            }}
          >
            {title}
          </strong>
        )}
        <div style={{ color: 'var(--color-text-secondary)' }}>{children}</div>
      </div>
    </aside>
  );
};
