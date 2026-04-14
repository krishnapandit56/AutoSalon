import { motion } from 'framer-motion';

export default function GradientButton({
  children,
  onClick,
  variant = 'primary', // primary | pink | outline | ghost
  size = 'md', // sm | md | lg
  icon: Icon,
  iconRight: IconRight,
  disabled = false,
  loading = false,
  className = '',
  type = 'button',
}) {
  const sizeClasses = {
    sm: 'px-4 py-2 text-xs gap-1.5',
    md: 'px-6 py-3 text-sm gap-2',
    lg: 'px-8 py-4 text-base gap-2.5',
  };

  const variantClasses = {
    primary: 'btn-gradient text-white',
    pink: 'btn-gradient btn-gradient-pink text-white',
    outline: 'bg-white border-2 border-aurora-purple/30 text-aurora-purple hover:bg-aurora-purple/5 hover:border-aurora-purple/50',
    ghost: 'bg-transparent text-ink-600 hover:bg-ink-100 hover:text-ink-900',
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled ? { scale: 1.02, y: -1 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      className={`
        relative rounded-xl font-semibold inline-flex items-center justify-center
        transition-all duration-300 overflow-hidden select-none
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {loading ? (
        <>
          <div className="spinner w-4 h-4" />
          <span>Processing…</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4" />}
          {children}
          {IconRight && <IconRight className="w-4 h-4" />}
        </>
      )}
    </motion.button>
  );
}
