import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.025 } } };
const item = {
  hidden: { opacity: 0, scale: 0.85, y: 8 },
  show:   { opacity: 1, scale: 1,    y: 0, transition: { type: 'spring', stiffness: 340, damping: 22 } }
};

export default function SlotPicker({ slots, selectedSlot, handleSlotSelect, isDisabled }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: isDisabled ? 0.35 : 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`card p-6 md:p-8 space-y-6 ${isDisabled ? 'pointer-events-none grayscale-[30%]' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-accent-500 flex items-center justify-center shrink-0 shadow-accent">
          <Clock className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-display font-semibold text-xl text-ink-900">Pick a Time Slot</h2>
          <p className="text-sm text-ink-400 mt-0.5">
            {isDisabled ? 'Select a service & tier first' : `${slots.filter(s => s.status === 'available').length} slots available`}
          </p>
        </div>
      </div>

      {/* Slot Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate={isDisabled ? 'hidden' : 'show'}
        className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-2"
      >
        {slots.map(s => {
          const sel   = selectedSlot?._id === s._id;
          const avail = s.status === 'available';

          return (
            <motion.button
              key={s._id}
              variants={item}
              whileTap={avail ? { scale: 0.88 } : {}}
              whileHover={avail && !sel ? { scale: 1.06 } : {}}
              disabled={!avail}
              onClick={() => handleSlotSelect(s)}
              title={avail ? `Book ${s.time}` : 'Already booked'}
              className={`
                py-2.5 px-1 rounded-xl text-[11px] font-mono font-medium
                flex items-center justify-center select-none transition-all duration-150
                ${sel   ? 'bg-ink-900 text-white shadow-float ring-2 ring-ink-900/20 scale-105' :
                  avail ? 'bg-white border border-ink-200 text-ink-600 hover:border-ink-500 hover:text-ink-900' :
                          'bg-ink-50 border border-ink-100 text-ink-300 cursor-not-allowed line-through'}
              `}
            >
              {s.time}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Legend */}
      {!isDisabled && (
        <div className="flex items-center gap-5 pt-2 border-t border-ink-100">
          <span className="flex items-center gap-1.5 text-[11px] text-ink-400 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-ink-900 inline-block" /> Selected
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-ink-400 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-white border border-ink-300 inline-block" /> Available
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-ink-400 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-ink-100 inline-block" /> Booked
          </span>
        </div>
      )}
    </motion.div>
  );
}
