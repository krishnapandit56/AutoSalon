const variantMap = {
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  danger: 'bg-rose-50 text-rose-600 border border-rose-200',
  info: 'bg-sky-50 text-sky-700 border border-sky-200',
  purple: 'bg-aurora-purple/10 text-aurora-purple border border-aurora-purple/20',
  cyan: 'bg-aurora-cyan/10 text-aurora-cyan border border-aurora-cyan/20',
  pink: 'bg-aurora-pink/10 text-aurora-pink border border-aurora-pink/20',
  neutral: 'bg-ink-100 text-ink-600 border border-ink-200',
};

export default function Badge({ children, variant = 'neutral', dot = false, className = '' }) {
  return (
    <span className={`badge ${variantMap[variant] || variantMap.neutral} ${className}`}>
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      )}
      {children}
    </span>
  );
}
