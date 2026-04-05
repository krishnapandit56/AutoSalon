import { useState, useEffect } from 'react';

export default function Customer() {
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [service, setService] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [city, setCity] = useState('nagpur');
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  const [statusMsg, setStatusMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchSlots();
    const interval = setInterval(fetchSlots, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchSlots = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/slots');
      const data = await res.json();
      setSlots(data);
    } catch (err) {
      console.error(err);
    }
  };

  const lockSlot = async (slot) => {
    if (slot.status !== 'free') return;
    setIsLoading(true);
    setStatusMsg('');
    try {
      const res = await fetch('http://localhost:5000/api/slots/' + slot._id + '/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelectedSlot(data);
      fetchSlots();
    } catch (err) {
      setStatusMsg(err.message);
    }
    setIsLoading(false);
  };

  const bookAppointment = async () => {
    if (!name || !phone || !service || !selectedSlot || !age) {
      setStatusMsg('Please fill all details.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: selectedSlot._id,
          customerName: name,
          phone,
          service,
          sessionId,
          age: Number(age),
          gender,
          city
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setStatusMsg('Booking successful! A confirmation SMS will be sent to ' + phone);
      setSelectedSlot(null);
      setName('');
      setPhone('');
      setAge('');
      setGender('Male');
      setCity('nagpur');
      setService('');
      fetchSlots();
    } catch (err) {
      setStatusMsg(err.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg">Elevate Your Look</h2>
        <p className="mt-4 text-lg text-slate-400 font-medium">Reserve your exclusive slot at AutoSalon.</p>
      </div>

      {statusMsg && (
        <div className="mb-8 p-4 rounded-xl bg-white/10 border border-fuchsia-500/30 backdrop-blur-md text-fuchsia-200 font-semibold text-center shadow-[0_0_15px_rgba(232,121,249,0.2)]">
          {statusMsg}
        </div>
      )}

      {/* Grid wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Slots */}
        <div className="lg:col-span-7 bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-fuchsia-500/20 flex items-center justify-center border border-fuchsia-500/30 text-fuchsia-400 font-bold">1</div>
            <h3 className="text-2xl font-bold text-white">Select a Time</h3>
          </div>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {slots.map(s => {
              const isSelected = selectedSlot?._id === s._id;
              const isFree = s.status === 'free';
              const isLockedByMe = s.status === 'locked' && s.sessionId === sessionId;
              
              let bgClass = "bg-white/5 text-slate-500 border-white/5 cursor-not-allowed";
              if (isSelected || isLockedByMe) {
                bgClass = "bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white border-transparent shadow-[0_0_15px_rgba(217,70,239,0.5)] scale-105 z-10";
              } else if (isFree) {
                bgClass = "bg-white/10 text-slate-200 border-white/10 hover:bg-white/20 hover:border-white/30 hover:-translate-y-1 hover:shadow-lg hover:shadow-white/5 transition-all";
              }

              return (
                <button 
                  key={s._id} 
                  className={'relative py-3 px-2 rounded-xl border text-sm font-semibold flex flex-col items-center justify-center transition-all duration-300 ' + bgClass}
                  onClick={() => lockSlot(s)}
                  disabled={(!isFree && !isLockedByMe) || isLoading}
                >
                  <span className="whitespace-nowrap">{s.startTime}</span>
                  {!isFree && !isLockedByMe && <span className="absolute inset-0 flex items-center justify-center bg-slate-900/70 rounded-xl backdrop-blur-[1px] text-xs font-bold text-fuchsia-200/50 uppercase tracking-widest pointer-events-none">Booked</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="lg:col-span-5 h-full">
          <div className={'h-full bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl transition-all duration-500 origin-top ' + (selectedSlot ? 'opacity-100 translate-y-0 scale-100' : 'opacity-50 translate-y-4 scale-95 pointer-events-none')}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 text-cyan-400 font-bold">2</div>
              <h3 className="text-2xl font-bold text-white">Your Details</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-300">Full Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="w-full bg-black/40 px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all text-white placeholder:text-slate-600 shadow-inner"
                  placeholder="e.g. James Bond"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-300">Phone Number</label>
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  className="w-full bg-black/40 px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all text-white placeholder:text-slate-600 shadow-inner"
                  placeholder="e.g. +1234567890"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-300">Age</label>
                  <input 
                    type="number" 
                    value={age} 
                    onChange={e => setAge(e.target.value)} 
                    className="w-full bg-black/40 px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all text-white placeholder:text-slate-600 shadow-inner"
                    placeholder="e.g. 25"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-300">Gender</label>
                  <select 
                    value={gender} 
                    onChange={e => setGender(e.target.value)} 
                    className="w-full bg-black/40 px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all text-white shadow-inner"
                  >
                    <option className="bg-slate-900">Male</option>
                    <option className="bg-slate-900">Female</option>
                    <option className="bg-slate-900">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-300">City</label>
                  <input 
                    type="text" 
                    value={city} 
                    onChange={e => setCity(e.target.value)} 
                    className="w-full bg-black/40 px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all text-white placeholder:text-slate-600 shadow-inner"
                    placeholder="e.g. nagpur"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-3 text-slate-300">Level of Expertise</label>
                <div className="space-y-3">
                  {['basic', 'intermediate', 'expert'].map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => setService(lvl)}
                      className={'w-full py-3 px-4 rounded-xl border font-bold capitalize transition-all flex items-center justify-between ' + (service === lvl ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-black/20 border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200')}
                    >
                      {lvl}
                      {service === lvl && <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)]"></span>}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={bookAppointment} 
                disabled={isLoading || !name || !phone || !service}
                className="w-full py-4 mt-8 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(34,211,238,0.6)]"
              >
                {isLoading ? 'Processing...' : 'Confirm Appointment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
