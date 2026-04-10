import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

const SERVICES = {
  Threading: { Basic: "50-100", Intermediate: "100-200", Expert: "200-500" },
  Waxing: { Basic: "200-400", Intermediate: "400-800", Expert: "800-1500+" },
  Cleanup: { Basic: "300-500", Intermediate: "500-800", Expert: "800-1200" },
  Massage: { Basic: "800-1200", Intermediate: "1200-2500", Expert: "2500-5000+" },
  Facial: { Basic: "500-800", Intermediate: "800-1500", Expert: "1500-3000+" },
  Detan: { Basic: "400-600", Intermediate: "600-1000", Expert: "1000-2000" },
  Blowout: { Basic: "300-500", Intermediate: "500-1000", Expert: "1000-2000+" },
  Manicure: { Basic: "400-600", Intermediate: "600-1000", Expert: "1000-1500" },
  Haircut: { Basic: "200-300", Intermediate: "300-500", Expert: "500-1000+" },
  Keratin: { Basic: "2000-3500", Intermediate: "3500-6000", Expert: "6000-10000+" },
  Pedicure: { Basic: "500-700", Intermediate: "700-1200", Expert: "1200-2000" },
  Hair_Color: { Basic: "1000-2000", Intermediate: "2000-4000", Expert: "4000-8000+" }
};

export default function Customer() {
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedService, setSelectedService] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Female');
  const [city, setCity] = useState('nagpur');
  const [userId] = useState(() => Math.random().toString(36).substring(7));
  const [statusMsg, setStatusMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    fetchSlots();
    
    socket.on('slot-updated', (data) => {
      setSlots(prev => prev.map(s => s._id === data.slotId ? { ...s, ...data } : s));
      // If our held slot was released by server (expiry)
      if (selectedSlot?._id === data.slotId && data.status === 'available') {
        setSelectedSlot(null);
        setStatusMsg('Your session has expired. Please select a slot again.');
      }
    });

    return () => socket.off('slot-updated');
  }, [selectedSlot]);

  useEffect(() => {
    let timer;
    if (selectedSlot && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setSelectedSlot(null);
    }
    return () => clearInterval(timer);
  }, [selectedSlot, timeLeft]);

  const fetchSlots = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/slots');
      const data = await res.json();
      setSlots(data);
    } catch (err) {
      console.error(err);
    }
  };

  const holdSlot = async (slot) => {
    if (slot.status !== 'available') return;
    setIsLoading(true);
    setStatusMsg('');
    try {
      const res = await fetch('http://localhost:5000/api/hold-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId: slot._id, userId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelectedSlot(data);
      setTimeLeft(300); // 5 minutes
    } catch (err) {
      setStatusMsg(err.message);
    }
    setIsLoading(false);
  };

  const bookAppointment = async () => {
    if (!name || !phone || !selectedService || !selectedLevel || !selectedSlot) {
      setStatusMsg('Please complete all selections.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/confirm-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: selectedSlot._id,
          userId,
          customerName: name,
          phone,
          service: `${selectedService} - ${selectedLevel}`,
          age: Number(age),
          gender,
          city
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setStatusMsg('Booking confirmed! Check your SMS.');
      setSelectedSlot(null);
      setSelectedService('');
      setSelectedLevel('');
      setName('');
      setPhone('');
      setAge('');
    } catch (err) {
      setStatusMsg(err.message);
    }
    setIsLoading(false);
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 font-sans text-gray-800">
      {/* Header */}
      <header className="text-center mb-16">
        <h1 className="text-5xl font-light tracking-[0.3em] uppercase mb-4 text-gray-900">AutoSalon</h1>
        <div className="h-[1px] w-20 bg-rose-200 mx-auto"></div>
      </header>

      {statusMsg && (
        <div className="max-w-2xl mx-auto mb-10 p-4 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 text-center text-sm font-medium animate-in fade-in zoom-in">
          {statusMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left: Selection Area */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* Section 1: Service Selection */}
          <section className="bg-white rounded-3xl p-8 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] border border-gray-50">
            <div className="flex items-center gap-4 mb-8">
              <span className="text-[10px] uppercase tracking-[0.2em] text-rose-300 font-bold px-3 py-1 rounded-full bg-rose-50">Step 01</span>
              <h2 className="text-xl font-medium tracking-tight">Select Service</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-gray-400 font-bold ml-1">Category</label>
                <select 
                  value={selectedService} 
                  onChange={e => { setSelectedService(e.target.value); setSelectedLevel(''); }}
                  className="w-full bg-gray-50/50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-rose-100 transition-all outline-none"
                >
                  <option value="">Select Category...</option>
                  {Object.keys(SERVICES).map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              {selectedService && (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
                  <label className="text-xs uppercase tracking-widest text-gray-400 font-bold ml-1">Expertise Level</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Basic', 'Intermediate', 'Expert'].map(level => (
                      <button
                        key={level}
                        onClick={() => setSelectedLevel(level)}
                        className={`py-6 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 ${
                          selectedLevel === level 
                            ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-sm' 
                            : 'bg-white border-gray-100 hover:border-rose-100 hover:bg-rose-50/30'
                        }`}
                      >
                        <span className="text-xs font-bold uppercase tracking-tighter">{level}</span>
                        <span className="text-[10px] text-gray-400">₹{SERVICES[selectedService][level]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section 2: Time Selection */}
          <section className={`bg-white rounded-3xl p-8 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] border border-gray-50 transition-opacity duration-500 ${!selectedLevel ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="flex items-center gap-4 mb-8">
              <span className="text-[10px] uppercase tracking-[0.2em] text-rose-300 font-bold px-3 py-1 rounded-full bg-rose-50">Step 02</span>
              <h2 className="text-xl font-medium tracking-tight">Book Appointment</h2>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {slots.map(s => {
                const isSelected = selectedSlot?._id === s._id;
                const isAvailable = s.status === 'available';
                const isHeldByMe = s.status === 'held' && s.heldBy === userId;
                
                let btnStyle = "bg-gray-50 text-gray-300 cursor-not-allowed";
                if (isAvailable || isHeldByMe) {
                  btnStyle = isSelected || isHeldByMe
                    ? "bg-rose-500 text-white shadow-lg shadow-rose-200 scale-105 border-transparent"
                    : "bg-white border border-gray-100 text-gray-600 hover:border-gray-200 hover:bg-gray-50 hover:shadow-sm";
                }

                return (
                  <button 
                    key={s._id}
                    disabled={!isAvailable && !isHeldByMe}
                    onClick={() => holdSlot(s)}
                    className={`py-3 px-1 rounded-full text-[11px] font-bold tracking-tighter transition-all duration-300 ${btnStyle}`}
                  >
                    {s.time}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section 3: Contact Details */}
          <section className={`bg-white rounded-3xl p-8 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] border border-gray-50 transition-all duration-500 ${!selectedSlot ? 'opacity-40 translate-y-4 pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-4">
                <span className="text-[10px] uppercase tracking-[0.2em] text-rose-300 font-bold px-3 py-1 rounded-full bg-rose-50">Step 03</span>
                <h2 className="text-xl font-medium tracking-tight">Patient Details</h2>
              </div>
              {selectedSlot && (
                <div className="text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full bg-amber-50 text-amber-600 animate-pulse">
                  Holding for {formatTimer(timeLeft)}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input 
                type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)}
                className="w-full bg-gray-50/50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-rose-100 transition-all outline-none"
              />
              <input 
                type="tel" placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full bg-gray-50/50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-rose-100 transition-all outline-none"
              />
              <div className="grid grid-cols-3 gap-3">
                <input 
                  type="number" placeholder="Age" value={age} onChange={e => setAge(e.target.value)}
                  className="w-full bg-gray-50/50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-rose-100 transition-all outline-none"
                />
                <select 
                   value={gender} onChange={e => setGender(e.target.value)}
                   className="col-span-1 w-full bg-gray-50/50 border-none rounded-2xl px-3 py-4 focus:ring-2 focus:ring-rose-100 transition-all outline-none text-sm"
                >
                  <option>Female</option>
                  <option>Male</option>
                  <option>Other</option>
                </select>
                <input 
                  type="text" placeholder="City" value={city} onChange={e => setCity(e.target.value)}
                  className="w-full bg-gray-50/50 border-none rounded-2xl px-3 py-4 focus:ring-2 focus:ring-rose-100 font-medium transition-all outline-none text-sm"
                />
              </div>
              <button 
                onClick={bookAppointment}
                disabled={isLoading || !name || !phone}
                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold uppercase tracking-widest text-[11px] hover:bg-gray-800 transition-all hover:shadow-xl hover:-translate-y-1 disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Confirm Book Appointment'}
              </button>
            </div>
          </section>
        </div>

        {/* Right: Summary Sidebar */}
        <div className="lg:col-span-4">
          <div className="sticky top-12 space-y-6">
            <div className="bg-white rounded-3xl p-8 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] border border-gray-50">
              <h3 className="text-xs uppercase tracking-[0.2em] text-gray-400 font-black mb-8">Selected Details</h3>
              
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-tighter">Service</span>
                  <div className="text-right">
                    <p className="font-medium text-sm">{selectedService || '—'}</p>
                    <p className="text-[10px] text-rose-400 font-bold">{selectedLevel || '—'}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-tighter">Time</span>
                  <p className="font-medium text-sm">{selectedSlot?.time || '—'}</p>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-tighter">Location</span>
                  <p className="font-medium text-sm">Nagpur HQ</p>
                </div>

                <div className="pt-6 border-t border-gray-50 flex justify-between items-center">
                  <span className="text-xs text-gray-400 font-black uppercase tracking-widest">Est. Cost</span>
                  <p className="text-lg font-light text-gray-900 tracking-tighter">
                    {selectedService && selectedLevel ? `₹${SERVICES[selectedService][selectedLevel]}` : '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-rose-50/50 border border-rose-100 flex flex-col items-center text-center gap-4">
               <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                 <svg className="w-6 h-6 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                 </svg>
               </div>
               <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                 By booking, you agree to our <span className="text-rose-400 decoration-rose-100 underline cursor-pointer">Terms</span> and <span className="text-rose-400 decoration-rose-100 underline cursor-pointer">Privacy Policy</span>.
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
