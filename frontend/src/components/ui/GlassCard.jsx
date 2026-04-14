import { motion } from 'framer-motion';

export default function GlassCard({
  children,
  className = '',
  hover = true,
  glow = '',
  padding = 'p-6',
  onClick,
}) {
  const glowClass = glow ? `glow-border-${glow}` : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={hover ? { y: -3, transition: { duration: 0.2 } } : {}}
      onClick={onClick}
      className={`glass-card ${padding} ${glowClass} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
}
