// Shared premium loading state for all pages
import { motion } from 'framer-motion';
import { Scissors } from 'lucide-react';

const STEPS = [
  'Connecting to salon…',
  'Fetching analytics…',
  'Building insights…',
  'Almost ready…',
];

export default function PageLoader({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-8 select-none">
      {/* Animated logo */}
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="w-20 h-20 rounded-full border-2 border-dashed border-aurora-purple/30"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-2 w-16 h-16 rounded-full border-2 border-dashed border-aurora-cyan/40"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-aurora-purple to-aurora-indigo flex items-center justify-center shadow-glow-purple">
            <Scissors className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      {/* Gradient progress bar */}
      <div className="w-56 space-y-2">
        <div className="w-full h-1.5 bg-ink-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 2.4, ease: 'easeInOut' }}
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #8B5CF6, #06B6D4, #EC4899)' }}
          />
        </div>
        <motion.p
          key={label}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-[10px] font-bold uppercase tracking-widest text-ink-400"
        >
          {label || 'Loading…'}
        </motion.p>
      </div>
    </div>
  );
}
