import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, ChevronLeft, ChevronRight,
} from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import Badge from '../components/ui/Badge';
import PageLoader from '../components/ui/PageLoader';

const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function AppointmentsPage() {
  const token = localStorage.getItem('adminToken');
  const [bookings, setBookings]               = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [currentDate, setCurrentDate]         = useState(new Date());
  const [selectedDay, setSelectedDay]         = useState(null);   // ← NEW: clicked day
  const [churnPredictions, setChurnPredictions] = useState({});

  useEffect(() => {
    if (!token) return;
    fetch('http://localhost:5000/api/bookings', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
      .then(r => r.ok ? r.json() : [])
      .then(setBookings)
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [token]);

  const handlePredictChurn = async (name) => {
    setChurnPredictions(prev => ({ ...prev, [name]: 'loading' }));
    try {
      const res = await fetch('http://localhost:5000/api/churn/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      setChurnPredictions(prev => ({ ...prev, [name]: res.ok ? data : { error: data.error } }));
    } catch (err) {
      setChurnPredictions(prev => ({ ...prev, [name]: { error: err.message } }));
    }
  };

  const year       = currentDate.getFullYear();
  const month      = currentDate.getMonth();
  const firstDay   = new Date(year, month, 1).getDay();
  const daysInMonth= new Date(year, month + 1, 0).getDate();
  const today      = new Date();

  const getBookingsForDay = (day) =>
    bookings.filter(b => {
      const d = new Date(b.createdAt);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });

  // Bookings shown in right panel:
  // If a day is selected → show only that day; else show all grouped by date
  const panelBookings = selectedDay
    ? getBookingsForDay(selectedDay)
    : bookings;

  // Group for right panel
  const grouped = panelBookings.reduce((acc, b) => {
    const dateStr = new Date(b.createdAt).toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'short', day: 'numeric',
    });
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(b);
    return acc;
  }, {});

  const prevMonth = () => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDay(null); };
  const nextMonth = () => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDay(null); };

  if (loading) return <PageLoader label="Loading Appointments…" />;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-ink-900 tracking-tight">Appointments</h1>
        <p className="text-sm text-ink-400 mt-1">
          {selectedDay
            ? `Showing bookings for ${MONTHS[month]} ${selectedDay}, ${year}`
            : 'Click a date to view its bookings.'}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Calendar — 7 cols */}
        <GlassCard className="lg:col-span-7" padding="p-6">
          {/* Month Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-display font-bold text-ink-900">{MONTHS[month]} {year}</h2>
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="w-9 h-9 rounded-xl flex items-center justify-center text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setCurrentDate(new Date()); setSelectedDay(today.getDate()); }}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide text-aurora-purple bg-aurora-purple/5 border border-aurora-purple/15 hover:bg-aurora-purple/10 transition-all"
              >
                Today
              </button>
              <button onClick={nextMonth} className="w-9 h-9 rounded-xl flex items-center justify-center text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Day Labels */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold uppercase tracking-widest text-ink-400 py-2">{d}</div>
            ))}
          </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }, (_, i) => <div key={`e-${i}`} className="aspect-square" />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day          = i + 1;
              const dayBookings  = getBookingsForDay(day);
              const isToday      = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const isSelected   = day === selectedDay;
              const hasBookings  = dayBookings.length > 0;

              return (
                <motion.button
                  key={day}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-all relative cursor-pointer
                    ${isSelected
                      ? 'bg-gradient-to-br from-aurora-cyan to-aurora-indigo text-white shadow-glow-cyan ring-2 ring-aurora-cyan/40 font-bold'
                      : isToday
                        ? 'bg-gradient-to-br from-aurora-purple to-aurora-indigo text-white shadow-glow-purple font-bold'
                        : hasBookings
                          ? 'bg-aurora-purple/8 text-ink-800 hover:bg-aurora-purple/15 border border-aurora-purple/10'
                          : 'text-ink-500 hover:bg-ink-100/70'
                    }
                  `}
                >
                  {day}
                  {hasBookings && (
                    <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-white' : isToday ? 'bg-white' : dayBookings.length > 3 ? 'bg-aurora-pink' : 'bg-aurora-purple'
                    }`} />
                  )}
                  {hasBookings && !isSelected && !isToday && (
                    <span className="absolute top-1 right-1 text-[8px] font-bold text-aurora-purple">{dayBookings.length}</span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-ink-100/40">
            {[
              { color: 'bg-aurora-purple', label: 'Today' },
              { color: 'bg-aurora-cyan',   label: 'Selected' },
              { color: 'bg-aurora-pink',   label: '> 3 bookings' },
              { color: 'bg-aurora-purple/30 border border-aurora-purple/20', label: 'Has bookings' },
            ].map(l => (
              <span key={l.label} className="flex items-center gap-1.5 text-[10px] font-semibold text-ink-400">
                <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} /> {l.label}
              </span>
            ))}
          </div>
        </GlassCard>

        {/* Bookings Panel — 5 cols */}
        <div className="lg:col-span-5">
          <GlassCard padding="p-6" className="h-full">
            <div className="flex items-center gap-2 mb-5">
              <Clock className="w-4 h-4 text-aurora-purple" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-ink-400">
                {selectedDay ? `${MONTHS[month]} ${selectedDay}` : 'All Bookings'}
              </h3>
              <span className="ml-auto badge bg-aurora-purple/10 text-aurora-purple border border-aurora-purple/20 text-[9px]">
                {panelBookings.length} {panelBookings.length === 1 ? 'booking' : 'bookings'}
              </span>
              {selectedDay && (
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-[9px] font-bold uppercase tracking-widest text-ink-400 hover:text-ink-700 transition-colors ml-1"
                >
                  Clear ×
                </button>
              )}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={selectedDay ?? 'all'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-5 max-h-[520px] overflow-y-auto pr-1"
              >
                {Object.entries(grouped).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-ink-300">
                    <Calendar className="w-8 h-8 mb-3 opacity-40" />
                    <p className="text-xs uppercase tracking-widest font-medium">
                      {selectedDay ? `No bookings on ${MONTHS[month]} ${selectedDay}` : 'No bookings yet'}
                    </p>
                  </div>
                ) : (
                  Object.entries(grouped).map(([date, dateBookings]) => {
                    const isToday = date === today.toLocaleDateString('en-IN', {
                      weekday: 'long', year: 'numeric', month: 'short', day: 'numeric',
                    });
                    return (
                      <div key={date} className="space-y-2">
                        <div className="flex items-center gap-3">
                          <p className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? 'text-aurora-purple' : 'text-ink-300'}`}>
                            {isToday ? '📍 Today' : date}
                          </p>
                          <div className="h-px flex-1 bg-ink-100/60" />
                        </div>
                        {dateBookings.map((b, i) => (
                          <motion.div
                            key={b._id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="flex items-center justify-between p-3 rounded-xl bg-surface-2/40 hover:bg-aurora-purple/[0.04] transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-aurora-purple/20 to-aurora-cyan/20 flex items-center justify-center text-sm font-bold text-aurora-purple shrink-0">
                                {b.customerName?.charAt(0) || '?'}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-ink-800 truncate">{b.customerName}</p>
                                <p className="text-[10px] text-ink-400">{b.service} · <span className="font-mono">{b.phone}</span></p>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-2 flex flex-col items-end gap-1">
                              <Badge variant="purple">{b.slotId?.time || 'N/A'}</Badge>
                              {churnPredictions[b.customerName] === 'loading' ? (
                                <span className="text-[9px] text-aurora-purple animate-pulse font-bold uppercase tracking-widest">Analysing…</span>
                              ) : churnPredictions[b.customerName] && !churnPredictions[b.customerName].error ? (
                                <span className={`text-[9px] font-bold uppercase tracking-widest ${churnPredictions[b.customerName].risk_level === 'High Risk' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                  {churnPredictions[b.customerName].risk_level}
                                </span>
                              ) : (
                                <button onClick={() => handlePredictChurn(b.customerName)}
                                  className="text-[9px] font-bold uppercase tracking-widest text-ink-300 hover:text-aurora-purple transition-colors">
                                  {churnPredictions[b.customerName]?.error ? 'Retry' : 'Predict'}
                                </button>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    );
                  })
                )}
              </motion.div>
            </AnimatePresence>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
