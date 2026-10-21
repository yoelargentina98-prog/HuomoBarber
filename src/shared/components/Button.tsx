import React from 'react';
import { Link } from 'react-router-dom';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

interface CommonProps {
  variant?: ButtonVariant;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

interface ButtonAsButtonProps
  extends CommonProps, Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  to?: undefined;
}

interface ButtonAsLinkProps extends CommonProps {
  to: string;
}

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

const getVariantStyle = (variant: ButtonVariant): React.CSSProperties => {
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: 'var(--color-accent-primary)',
        color: 'var(--color-text-inverse)',
        border: '1px solid var(--color-accent-primary)',
        fontWeight: 600,
      };
    case 'secondary':
      return {
        backgroundColor: 'var(--color-bg-subtle)',
        color: 'var(--color-text-primary)',
        border: '1px solid var(--color-border-subtle)',
        fontWeight: 500,
      };
    case 'outline':
      return {
        backgroundColor: 'transparent',
        color: 'var(--color-accent-primary)',
        border: '1px solid var(--color-accent-border)',
        fontWeight: 500,
      };
    case 'ghost':
      return {
        backgroundColor: 'transparent',
        color: 'var(--color-text-secondary)',
        border: '1px solid transparent',
        fontWeight: 500,
      };
  }
};

const baseStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  padding: '0.55rem 1.15rem',
  fontSize: '0.9rem',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  transition: 'all var(--transition-fast)',
  textDecoration: 'none',
  lineHeight: 1.25,
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  children,
  className = '',
  style,
  ...props
}) => {
  const combinedStyle: React.CSSProperties = {
    ...baseStyle,
    ...getVariantStyle(variant),
    ...style,
  };

  if ('to' in props && props.to) {
    return (
      <Link to={props.to} className={className} style={combinedStyle}>
        {children}
      </Link>
    );
  }

  const { to: _, ...buttonProps } = props as ButtonAsButtonProps;
  return (
    <button className={className} style={combinedStyle} {...buttonProps}>
      {children}
    </button>
  );
};
