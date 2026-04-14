import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, MapPin, ChevronRight, CheckCircle2, Calendar, AlertCircle } from 'lucide-react';

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

const GENDERS = [
  { value: 'Female', label: 'Female', icon: '👩' },
  { value: 'Male', label: 'Male', icon: '👨' },
  { value: 'Other', label: 'Other', icon: '🧑' },
];

function SummaryRow({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-ink-100 last:border-0">
      <span className="text-xs font-medium text-ink-400 uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-semibold text-ink-800 ${mono ? 'font-mono' : 'font-display'}`}>{value || '—'}</span>
    </div>
  );
}

export default function BookingDrawer({
  selectedService, selectedLevel, selectedSlot,
  name, setName, phone, setPhone, age, setAge,
  gender, setGender, city, setCity,
  bookAppointment, isLoading,
}) {
  const isReady = name && phone && phone.length === 10 && selectedService && selectedLevel && selectedSlot;
  const cost    = selectedService && selectedLevel ? `₹${SERVICES[selectedService][selectedLevel]}` : null;

  // Phone validation
  const phoneError = phone && !/^\d{10}$/.test(phone);
  // Age validation
  const ageNum = Number(age);
  const ageError = age && (isNaN(ageNum) || ageNum < 5 || ageNum > 120);
  // Name validation
  const nameError = name && name.trim().length < 2;

  return (
    <div className="space-y-4">

      {/* Summary Card */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <Calendar className="w-4 h-4 text-accent-500" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-ink-500">Reservation Summary</h3>
        </div>

        <SummaryRow label="Service"  value={selectedService?.replace('_', ' ')} />
        <SummaryRow label="Tier"     value={selectedLevel} />
        <SummaryRow label="Time"     value={selectedSlot?.time} mono />

        {/* Cost Display */}
        <div className="mt-5 pt-4 border-t border-ink-100 flex items-end justify-between">
          <div>
            <p className="text-xs text-ink-400 font-medium uppercase tracking-wider mb-1">Est. Total</p>
            <p className="text-3xl font-display font-semibold tracking-tight text-ink-900">
              {cost ?? <span className="text-ink-300 font-light">—</span>}
            </p>
          </div>
          {cost && (
            <span className="badge bg-accent-50 text-accent-600 border border-accent-100">
              INR
            </span>
          )}
        </div>
      </div>

      {/* Guest Details Card – appears when slot is selected */}
      <AnimatePresence>
        {selectedSlot && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: 16 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="overflow-hidden"
          >
            <div className="card p-6 space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-ink-500 mb-1">Guest Details</p>

              {/* Name */}
              <div>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
                  <input
                    type="text" placeholder="Full Name" value={name}
                    onChange={e => setName(e.target.value)}
                    className={`field pl-9 ${nameError ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : ''}`}
                  />
                </div>
                {nameError && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Name must be at least 2 characters
                  </p>
                )}
              </div>

              {/* Phone — Strict 10-digit validation */}
              <div>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
                  <span className="absolute left-9 top-1/2 -translate-y-1/2 text-ink-400 text-xs font-mono select-none">+91</span>
                  <input
                    type="tel"
                    placeholder="10 digit number"
                    value={phone}
                    maxLength={10}
                    onChange={e => {
                      // Only allow digits, max 10
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(val);
                    }}
                    className={`field pl-16 font-mono tracking-wider ${phoneError ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : ''}`}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  {phoneError ? (
                    <p className="text-[10px] text-rose-500 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Must be exactly 10 digits
                    </p>
                  ) : (
                    <span />
                  )}
                  <p className={`text-[10px] font-mono font-bold ${phone?.length === 10 ? 'text-emerald-500' : 'text-ink-300'}`}>
                    {phone?.length || 0}/10
                  </p>
                </div>
              </div>

              {/* Age + Gender */}
              <div className="grid grid-cols-5 gap-3">
                {/* Age — col-span-2 */}
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="Age"
                    value={age}
                    min={5}
                    max={120}
                    onChange={e => setAge(e.target.value)}
                    className={`field text-center ${ageError ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : ''}`}
                  />
                  {ageError && (
                    <p className="text-[10px] text-rose-500 font-medium mt-1">5–120</p>
                  )}
                </div>

                {/* Gender — Visual selector, col-span-3 */}
                <div className="col-span-3 flex gap-1.5">
                  {GENDERS.map(g => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGender(g.value)}
                      className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-center transition-all duration-200 border-2 ${
                        gender === g.value
                          ? 'border-ink-900 bg-ink-900 text-white shadow-float'
                          : 'border-ink-200 bg-white text-ink-600 hover:border-ink-400'
                      }`}
                    >
                      <span className="text-base leading-none">{g.icon}</span>
                      <span className="text-[9px] font-bold uppercase tracking-widest">{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* City */}
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
                <input type="text" placeholder="City" value={city}
                  onChange={e => setCity(e.target.value)} className="field pl-9" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Validation Summary */}
      {selectedSlot && (phoneError || ageError || nameError) && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Please fix the highlighted errors above before proceeding.</span>
        </div>
      )}

      {/* CTA Button */}
      <motion.button
        onClick={bookAppointment}
        disabled={isLoading || !isReady || phoneError || ageError || nameError}
        whileHover={isReady && !isLoading && !phoneError && !ageError && !nameError ? { scale: 1.01, y: -2 } : {}}
        whileTap={isReady && !isLoading && !phoneError && !ageError && !nameError ? { scale: 0.98 } : {}}
        className={`w-full py-4 rounded-xl font-semibold text-sm tracking-wide flex items-center justify-center gap-2 transition-all duration-300
          ${isLoading   ? 'bg-ink-100 text-ink-400 cursor-wait border border-ink-200' :
            isReady && !phoneError && !ageError && !nameError
                        ? 'bg-ink-900 text-white shadow-float hover:bg-ink-800'       :
                          'bg-ink-100 text-ink-400 border border-ink-200 cursor-not-allowed'}`}
      >
        {isLoading ? (
          <><div className="spinner w-4 h-4" /> Processing…</>
        ) : isReady && !phoneError && !ageError && !nameError ? (
          <>Confirm Booking <CheckCircle2 className="w-4 h-4" /></>
        ) : (
          <>Fill Details to Continue <ChevronRight className="w-4 h-4" /></>
        )}
      </motion.button>

      <p className="text-[10px] text-center text-ink-300 font-medium">
        By booking you agree to our Terms & Conditions
      </p>
    </div>
  );
}
