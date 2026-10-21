import React from 'react';

export type BadgeVariant = 'neutral' | 'accent' | 'warning' | 'info' | 'success' | 'danger';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  neutral: {
    backgroundColor: 'var(--color-bg-subtle)',
    color: 'var(--color-text-secondary)',
    border: '1px solid var(--color-border-subtle)',
  },
  accent: {
    backgroundColor: 'var(--color-accent-subtle)',
    color: 'var(--color-accent-primary)',
    border: '1px solid var(--color-accent-border)',
  },
  warning: {
    backgroundColor: 'var(--color-warning-subtle)',
    color: 'var(--color-warning)',
    border: '1px solid rgba(210, 153, 34, 0.4)',
  },
  info: {
    backgroundColor: 'var(--color-info-subtle)',
    color: 'var(--color-info)',
    border: '1px solid rgba(88, 166, 255, 0.4)',
  },
  success: {
    backgroundColor: 'var(--color-success-subtle)',
    color: 'var(--color-success)',
    border: '1px solid rgba(46, 160, 67, 0.4)',
  },
  danger: {
    backgroundColor: 'var(--color-danger-subtle)',
    color: 'var(--color-danger)',
    border: '1px solid rgba(248, 81, 73, 0.4)',
  },
};

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '' }) => {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.2rem 0.65rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        borderRadius: 'var(--radius-full)',
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        ...variantStyles[variant],
      }}
    >
      {children}
    </span>
  );
};
