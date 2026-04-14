import { motion } from 'framer-motion';
import AnimatedCounter from './AnimatedCounter';

const accentMap = {
  purple: {
    bg: 'bg-aurora-purple/10',
    border: 'border-aurora-purple/20',
    text: 'text-aurora-purple',
    glow: 'shadow-glow-purple',
  },
  cyan: {
    bg: 'bg-aurora-cyan/10',
    border: 'border-aurora-cyan/20',
    text: 'text-aurora-cyan',
    glow: 'shadow-glow-cyan',
  },
  pink: {
    bg: 'bg-aurora-pink/10',
    border: 'border-aurora-pink/20',
    text: 'text-aurora-pink',
    glow: 'shadow-glow-pink',
  },
  gold: {
    bg: 'bg-aurora-gold/10',
    border: 'border-aurora-gold/20',
    text: 'text-aurora-gold',
    glow: 'shadow-glow-gold',
  },
  emerald: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-600',
    glow: '',
  },
  rose: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-500',
    glow: 'shadow-glow-pink',
  },
};

export default function KpiCard({
  icon: Icon,
  label,
  value,
  numericValue,
  prefix = '',
  suffix = '',
  sub,
  trend,
  trendUp,
  accent = 'purple',
  delay = 0,
}) {
  const colors = accentMap[accent] || accentMap.purple;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card p-5 flex gap-4 items-start group"
    >
      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${colors.bg} ${colors.border} transition-all duration-300 group-hover:scale-110 group-hover:${colors.glow}`}>
        <Icon className={`w-5 h-5 ${colors.text}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-400 mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          {numericValue !== undefined ? (
            <AnimatedCounter
              value={numericValue}
              prefix={prefix}
              suffix={suffix}
              className="text-2xl font-display font-bold text-ink-900 tracking-tight"
            />
          ) : (
            <p className="text-2xl font-display font-bold text-ink-900 tracking-tight truncate">{value}</p>
          )}
          {trend && (
            <span className={`text-xs font-bold ${trendUp ? 'text-emerald-500' : 'text-rose-500'}`}>
              {trendUp ? '↑' : '↓'} {trend}
            </span>
          )}
        </div>
        {sub && <p className="text-xs text-ink-400 mt-1 font-medium">{sub}</p>}
      </div>
    </motion.div>
  );
}
