import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, ChevronRight, Check } from 'lucide-react';

const SERVICES = {
  Threading:  { Basic: "50-100",    Intermediate: "100-200",  Expert: "200-500"    },
  Waxing:     { Basic: "200-400",   Intermediate: "400-800",  Expert: "800-1500+"  },
  Cleanup:    { Basic: "300-500",   Intermediate: "500-800",  Expert: "800-1200"   },
  Massage:    { Basic: "800-1200",  Intermediate: "1200-2500",Expert: "2500-5000+" },
  Facial:     { Basic: "500-800",   Intermediate: "800-1500", Expert: "1500-3000+" },
  Detan:      { Basic: "400-600",   Intermediate: "600-1000", Expert: "1000-2000"  },
  Blowout:    { Basic: "300-500",   Intermediate: "500-1000", Expert: "1000-2000+" },
  Manicure:   { Basic: "400-600",   Intermediate: "600-1000", Expert: "1000-1500"  },
  Haircut:    { Basic: "200-300",   Intermediate: "300-500",  Expert: "500-1000+"  },
  Keratin:    { Basic: "2000-3500", Intermediate: "3500-6000",Expert: "6000-10000+"},
  Pedicure:   { Basic: "500-700",   Intermediate: "700-1200", Expert: "1200-2000"  },
  Hair_Color: { Basic: "1000-2000", Intermediate: "2000-4000",Expert: "4000-8000+" },
};

const LEVEL_META = {
  Basic:        { desc: 'Essential care', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  Intermediate: { desc: 'Enhanced finish', color: 'text-amber-600 bg-amber-50 border-amber-100'     },
  Expert:       { desc: 'Luxury treatment', color: 'text-accent-600 bg-accent-50 border-accent-100' },
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.035 } } };
const item      = { hidden: { opacity: 0, y: 12, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 320, damping: 26 } } };

export default function ServiceSelector({ selectedService, setSelectedService, selectedLevel, setSelectedLevel }) {
  return (
    <div className="card p-6 md:p-8 space-y-8">

      {/* Section header */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-ink-900 flex items-center justify-center shrink-0">
          <Scissors className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-display font-semibold text-xl text-ink-900">Choose Your Service</h2>
          <p className="text-sm text-ink-400 mt-0.5">Select category then stylist experience level</p>
        </div>
      </div>

      {/* Service Grid */}
      <motion.div
        variants={container} initial="hidden" animate="show"
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5"
      >
        {Object.keys(SERVICES).map(service => {
          const active = selectedService === service;
          return (
            <motion.button
              key={service}
              variants={item}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setSelectedService(service); setSelectedLevel(''); }}
              className={`relative group py-3.5 px-4 rounded-xl text-left text-sm font-medium transition-all duration-200 border ${
                active
                  ? 'bg-ink-900 text-white border-ink-900 shadow-float'
                  : 'bg-white text-ink-600 border-ink-200 hover:border-ink-400 hover:text-ink-900'
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                {service.replace('_', ' ')}
                {active && <Check className="w-3.5 h-3.5 shrink-0 text-accent-300" />}
              </span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Level Selection */}
      <AnimatePresence>
        {selectedService && (
          <motion.div
            initial={{ opacity: 0, y: -12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="overflow-hidden"
          >
            <div className="pt-6 border-t border-ink-100">
              <div className="flex items-center gap-2 mb-4">
                <ChevronRight className="w-4 h-4 text-accent-500" />
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">
                  {selectedService.replace('_', ' ')} — Stylist Tier
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.entries(LEVEL_META).map(([level, meta]) => {
                  const active = selectedLevel === level;
                  return (
                    <motion.button
                      key={level}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedLevel(level)}
                      className={`relative p-5 rounded-xl border-2 text-left transition-all duration-250 ${
                        active
                          ? 'border-ink-900 bg-ink-900 shadow-float'
                          : 'border-ink-100 bg-white hover:border-ink-300'
                      }`}
                    >
                      {active && (
                        <motion.div
                          layoutId="level-bg"
                          className="absolute inset-0 rounded-xl bg-ink-900"
                          style={{ zIndex: -1 }}
                        />
                      )}
                      <div className="flex items-end justify-between mb-2">
                        <span className={`font-display font-semibold text-lg ${active ? 'text-white' : 'text-ink-800'}`}>
                          {level}
                        </span>
                        {active && <Check className="w-4 h-4 text-accent-300" />}
                      </div>
                      <span className={`text-[11px] font-medium block mb-2 ${active ? 'text-ink-300' : 'text-ink-400'}`}>
                        {meta.desc}
                      </span>
                      <span className={`font-mono text-sm font-semibold ${active ? 'text-accent-300' : 'text-ink-600'}`}>
                        ₹{SERVICES[selectedService][level]}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
