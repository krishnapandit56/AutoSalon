import { motion } from 'framer-motion';

export default function InsightCard({
  icon,
  title,
  description,
  action,
  onAction,
  variant = 'purple', // purple | cyan | pink | gold
  delay = 0,
}) {
  const variants = {
    purple: { border: 'border-l-aurora-purple', bg: 'bg-aurora-purple/5', icon_bg: 'bg-aurora-purple/10 text-aurora-purple' },
    cyan:   { border: 'border-l-aurora-cyan',   bg: 'bg-aurora-cyan/5',   icon_bg: 'bg-aurora-cyan/10 text-aurora-cyan' },
    pink:   { border: 'border-l-aurora-pink',   bg: 'bg-aurora-pink/5',   icon_bg: 'bg-aurora-pink/10 text-aurora-pink' },
    gold:   { border: 'border-l-aurora-gold',   bg: 'bg-aurora-gold/5',   icon_bg: 'bg-aurora-gold/10 text-aurora-gold' },
  };
  const v = variants[variant] || variants.purple;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`flex gap-4 p-4 rounded-xl border-l-4 ${v.border} ${v.bg} group hover:shadow-md transition-all duration-300`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-lg ${v.icon_bg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-ink-800 mb-1">{title}</p>
        <p className="text-xs text-ink-500 leading-relaxed">{description}</p>
        {action && onAction && (
          <button
            onClick={onAction}
            className="mt-2 text-[11px] font-bold uppercase tracking-widest text-aurora-purple hover:text-aurora-indigo transition-colors"
          >
            {action} →
          </button>
        )}
      </div>
    </motion.div>
  );
}
