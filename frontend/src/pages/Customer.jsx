import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, Clock, CheckCircle, AlertCircle, X, MessageSquare } from 'lucide-react';
import ServiceSelector from '../components/customer/ServiceSelector';
import SlotPicker from '../components/customer/SlotPicker';
import BookingDrawer from '../components/customer/BookingDrawer';

const socket = io('http://localhost:5000');

const steps = [
  { id: 1, icon: Scissors, label: 'Service' },
  { id: 2, icon: Clock, label: 'Time' },
  { id: 3, icon: CheckCircle, label: 'Confirm' },
];

export default function Customer() {
  const [slots, setSlots]                   = useState([]);
  const [selectedSlot, setSelectedSlot]     = useState(null);
  const [selectedService, setSelectedService] = useState('');
  const [selectedLevel, setSelectedLevel]   = useState('');
  const [name, setName]             = useState('');
  const [phone, setPhone]           = useState('');
  const [age, setAge]               = useState('');
  const [gender, setGender]         = useState('Female');
  const [city, setCity]             = useState('');
  const [userId]                    = useState(() => Math.random().toString(36).substring(7));
  const [statusMsg, setStatusMsg]   = useState('');
  const [isSuccess, setIsSuccess]   = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [bookedDetails, setBookedDetails]       = useState(null);

  const activeStep = selectedLevel ? (selectedSlot ? 3 : 2) : 1;

  const fetchSlots = async (serviceName = '') => {
    try {
      const url = serviceName
        ? `http://localhost:5000/api/slots?service=${encodeURIComponent(serviceName)}`
        : 'http://localhost:5000/api/slots';
      const res  = await fetch(url);
      const data = await res.json();
      setSlots(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    setSelectedSlot(null);
    setStatusMsg('');
    if (selectedService && selectedLevel) fetchSlots(`${selectedService} - ${selectedLevel}`);
    else fetchSlots();
  }, [selectedService, selectedLevel]);

  useEffect(() => {
    const refresh = () => {
      if (selectedService && selectedLevel) fetchSlots(`${selectedService} - ${selectedLevel}`);
    };
    socket.on('booking-confirmed', refresh);
    return () => socket.off('booking-confirmed', refresh);
  }, [selectedService, selectedLevel]);

  const handleSlotSelect = (slot) => {
    if (slot.status !== 'available') return;
    setStatusMsg('');
    setSelectedSlot(slot);
  };

  const bookAppointment = async () => {
    if (!name || !phone || !selectedService || !selectedLevel || !selectedSlot) {
      setStatusMsg('Please complete all fields before confirming.');
      setIsSuccess(false);
      return;
    }
    setIsLoading(true);
    try {
      const res  = await fetch('http://localhost:5000/api/confirm-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: selectedSlot._id, userId, customerName: name, phone,
          service: `${selectedService} - ${selectedLevel}`,
          age: Number(age), gender, city,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message);

      // Save details for the success modal BEFORE resetting state
      setBookedDetails({
        name,
        phone,
        service: selectedService,
        level: selectedLevel,
        time: selectedSlot.time,
      });
      setShowSuccessModal(true);

      setIsSuccess(true);
      setStatusMsg('');
      setSelectedSlot(null); setSelectedService(''); setSelectedLevel('');
      setName(''); setPhone(''); setAge(''); setCity('');
    } catch (err) {
      setIsSuccess(false);
      setStatusMsg(err.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="mesh-bg min-h-screen pb-24 font-sans">

      {/* ══════════════════════════ SUCCESS MODAL ══════════════════════════ */}
      <AnimatePresence>
        {showSuccessModal && bookedDetails && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-[100]"
              onClick={() => setShowSuccessModal(false)}
            />
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="fixed inset-0 flex items-center justify-center z-[101] pointer-events-none px-4"
            >
              <div className="bg-white rounded-3xl shadow-float border border-ink-100 w-full max-w-sm p-8 pointer-events-auto text-center relative">
                {/* Close */}
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-ink-400 hover:bg-ink-100 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
                  className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center mx-auto mb-5"
                >
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                </motion.div>

                <h2 className="text-2xl font-display font-bold text-ink-900 mb-1">Appointment Confirmed!</h2>
                <p className="text-sm text-ink-400 mb-6">Your booking has been secured successfully.</p>

                {/* Details */}
                <div className="bg-surface-2/60 rounded-2xl p-4 space-y-2.5 text-left mb-6">
                  {[
                    { label: 'Name',    value: bookedDetails.name },
                    { label: 'Service', value: `${bookedDetails.service.replace('_', ' ')} · ${bookedDetails.level}` },
                    { label: 'Time',    value: bookedDetails.time },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-ink-400">{label}</span>
                      <span className="text-xs font-semibold text-ink-800">{value}</span>
                    </div>
                  ))}
                </div>

                {/* SMS Note */}
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-aurora-purple/5 border border-aurora-purple/10 mb-6">
                  <MessageSquare className="w-4 h-4 text-aurora-purple shrink-0" />
                  <p className="text-[11px] text-aurora-purple font-medium text-left">
                    An SMS confirmation has been sent to <span className="font-bold">+91 {bookedDetails.phone}</span>
                  </p>
                </div>

                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full py-3.5 rounded-xl bg-ink-900 text-white font-semibold text-sm hover:bg-ink-800 transition-all shadow-float"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Top Nav Bar */}
      <header className="sticky top-0 z-50 border-b border-ink-100/60 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-ink-900 flex items-center justify-center">
              <Scissors className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-semibold text-ink-900 text-lg tracking-tight">AutoSalon</span>
          </div>
          {/* Step indicator */}
          <div className="hidden md:flex items-center gap-1">
            {steps.map((step, i) => {
              const done   = activeStep > step.id;
              const active = activeStep === step.id;
              return (
                <div key={step.id} className="flex items-center gap-1">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                    done   ? 'bg-accent-500 text-white' :
                    active ? 'bg-ink-900 text-white' :
                             'bg-ink-100 text-ink-400'
                  }`}>
                    <step.icon className="w-3 h-3" />
                    {step.label}
                  </div>
                  {i < steps.length - 1 && <div className={`w-6 h-px transition-colors ${done ? 'bg-accent-400' : 'bg-ink-200'}`} />}
                </div>
              );
            })}
          </div>
          <div className="text-xs text-ink-400 font-medium hidden md:block">Nagpur · Est. 2024</div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-500 mb-3">Premium Booking</p>
          <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight text-ink-900 leading-tight">
            Reserve your<br />
            <span className="text-ink-500 font-light">style session.</span>
          </h1>
        </motion.div>

        {/* Error Banner (only for errors) */}
        <AnimatePresence>
          {statusMsg && !isSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -12, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -12, height: 0 }}
              className="flex items-center gap-3 px-5 py-4 rounded-xl mb-8 text-sm font-medium border bg-red-50 border-red-100 text-red-600"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {statusMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          <div className="xl:col-span-8 space-y-6">
            <ServiceSelector
              selectedService={selectedService} setSelectedService={setSelectedService}
              selectedLevel={selectedLevel}     setSelectedLevel={setSelectedLevel}
            />
            <SlotPicker
              slots={slots} selectedSlot={selectedSlot}
              handleSlotSelect={handleSlotSelect} isDisabled={!selectedLevel}
            />
          </div>
          <div className="xl:col-span-4 sticky top-24">
            <BookingDrawer
              selectedService={selectedService} selectedLevel={selectedLevel} selectedSlot={selectedSlot}
              name={name} setName={setName} phone={phone} setPhone={setPhone}
              age={age} setAge={setAge} gender={gender} setGender={setGender}
              city={city} setCity={setCity}
              bookAppointment={bookAppointment} isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
