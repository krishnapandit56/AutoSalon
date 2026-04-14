import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, Clock, CheckCircle, AlertCircle } from 'lucide-react';
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

      setIsSuccess(true);
      setStatusMsg('Appointment confirmed. Check your phone for SMS confirmation.');
      setTimeout(() => setStatusMsg(''), 8000);
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

        {/* Status Banner */}
        <AnimatePresence>
          {statusMsg && (
            <motion.div
              initial={{ opacity: 0, y: -12, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -12, height: 0 }}
              className={`flex items-center gap-3 px-5 py-4 rounded-xl mb-8 text-sm font-medium border ${
                isSuccess
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                  : 'bg-red-50 border-red-100 text-red-600'
              }`}
            >
              {isSuccess
                ? <CheckCircle className="w-4 h-4 shrink-0" />
                : <AlertCircle className="w-4 h-4 shrink-0" />}
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
