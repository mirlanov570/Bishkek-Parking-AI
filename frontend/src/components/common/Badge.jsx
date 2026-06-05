const BADGE_VARIANT_ALIASES = {
  low: 'success',
  green: 'success',
  free: 'success',
  medium: 'warning',
  yellow: 'warning',
  busy: 'warning',
  high: 'danger',
  red: 'danger',
  full: 'danger',
  error: 'danger',
};

function Badge({ children, variant = 'neutral', className = '' }) {
  const normalizedVariant = BADGE_VARIANT_ALIASES[variant] || variant || 'neutral';

  return (
    <span
      className={`badge badge--${normalizedVariant} ${className}`.trim()}
      data-variant={normalizedVariant}
    >
      {children}
    </span>
  );
}

export default Badge;