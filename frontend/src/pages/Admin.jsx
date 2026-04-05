import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Admin() {
  const [bookings, setBookings] = useState([]);
  const [inventory, setInventory] = useState([]);
  
  const [invForm, setInvForm] = useState({ name: '', quantity: 0 });
  
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchBookings();
    fetchInventory();
  }, [token, navigate]);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });

  const handleAuthError = (res) => {
    if (res.status === 401 || res.status === 400) {
      localStorage.removeItem('adminToken');
      navigate('/admin/login');
      return true;
    }
    return false;
  };

  const fetchBookings = async () => {
    const res = await fetch('http://localhost:5000/api/bookings', { headers: getHeaders() });
    if (handleAuthError(res)) return;
    setBookings(await res.json());
  };
  const fetchInventory = async () => {
    const res = await fetch('http://localhost:5000/api/inventory', { headers: getHeaders() });
    if (handleAuthError(res)) return;
    setInventory(await res.json());
  };

  const addInventory = async (e) => {
    e.preventDefault();
    await fetch('http://localhost:5000/api/inventory', { method: 'POST', headers: getHeaders(), body: JSON.stringify(invForm) });
    setInvForm({ name: '', quantity: 0 });
    fetchInventory();
  };
  const deleteInventory = async (id) => {
    await fetch('http://localhost:5000/api/inventory/' + id, { method: 'DELETE', headers: getHeaders() });
    fetchInventory();
  };
  const updateInventory = async (id, quantity) => {
    await fetch('http://localhost:5000/api/inventory/' + id, { method: 'PUT', headers: getHeaders(), body: JSON.stringify({ quantity }) });
    fetchInventory();
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  const groupedBookings = bookings.reduce((acc, booking) => {
    const dateStr = new Date(booking.createdAt).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(booking);
    return acc;
  }, {});

  if (!token) return null; // Avoid UI flicker before redirect

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between bg-white/[0.02] border border-white/10 p-6 rounded-3xl backdrop-blur-md">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-fuchsia-500 to-cyan-500 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">A</div>
             <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-lg">Command Center</h2>
          </div>
          <p className="text-slate-400 mt-2 font-medium">Manage your salon's operations gracefully.</p>
        </div>
        <button onClick={handleLogout} className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-rose-500 hover:text-white transition-all shadow-[0_0_10px_rgba(244,63,94,0.1)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Bookings & Churn */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-white relative z-10">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-fuchsia-500/20">📅</span> 
              Live Bookings
            </h3>
            <div className="overflow-x-auto relative z-10">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="pb-3 px-2 font-medium">Customer</th>
                    <th className="pb-3 px-2 font-medium">Phone</th>
                    <th className="pb-3 px-2 font-medium">Service</th>
                    <th className="pb-3 px-2 font-medium">Time Slot</th>
                    <th className="pb-3 px-2 font-medium text-right">Booked At</th>
                    <th className="pb-3 px-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {Object.entries(groupedBookings).map(([date, dateBookings]) => {
                    const isToday = date === new Date().toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    });
                    
                    return (
                    <React.Fragment key={date}>
                      <tr className="bg-white/[0.02]">
                        <td colSpan="6" className="py-2 px-2 font-bold text-fuchsia-400 text-xs tracking-widest uppercase border-y border-white/10 shadow-[inset_0_1px_rgba(255,255,255,0.05)]">
                          {date}
                        </td>
                      </tr>
                      {dateBookings.map(b => (
                        <tr key={b._id} className="hover:bg-white/[0.04] transition-colors">
                          <td className="py-4 px-2 font-bold text-white flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-400">{b.customerName.charAt(0).toUpperCase()}</div>
                            {b.customerName}
                          </td>
                          <td className="py-4 px-2 text-slate-400">{b.phone}</td>
                          <td className="py-4 px-2">
                            <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 capitalize text-xs font-semibold shadow-[0_0_10px_rgba(34,211,238,0.1)]">{b.service}</span>
                          </td>
                          <td className="py-4 px-2 text-slate-300 font-medium tracking-wide">
                            {b.slotId ? `${b.slotId.startTime} - ${b.slotId.endTime}` : <span className="text-slate-500 italic">Slot Expired</span>}
                          </td>
                          <td className="py-4 px-2 text-slate-500 text-right font-medium">{new Date(b.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                          <td className="py-4 px-2 text-right">
                            {!isToday && (
                              <button className="px-3 py-1.5 text-xs font-bold rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20 hover:bg-pink-500 hover:text-white transition-colors whitespace-nowrap">
                                Predict Churn
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  )})}
                  {bookings.length === 0 && <tr><td colSpan="6" className="py-8 text-center text-slate-500 italic">No bookings yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          {/* Churn flow form has been automated implicitly by booking logic */}
        </div>

        {/* Right Col: Inventory */}
        <div className="space-y-8">
          <section className="bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl sticky top-24 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-white relative z-10">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/20">📦</span> 
              Inventory
            </h3>
            
            <form onSubmit={addInventory} className="flex gap-2 mb-8 relative z-10">
              <input required type="text" placeholder="Add Item..." className="flex-1 min-w-0 bg-black/40 px-4 py-3 border border-white/10 rounded-xl text-white outline-none focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all" value={invForm.name} onChange={e=>setInvForm({...invForm, name: e.target.value})} />
              <input required type="number" className="w-16 bg-black/40 px-3 py-3 border border-white/10 rounded-xl text-white outline-none focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all text-center" value={invForm.quantity} onChange={e=>setInvForm({...invForm, quantity: Number(e.target.value)})} />
              <button className="bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white w-12 rounded-xl font-black text-xl flex items-center justify-center transition-all shadow-lg hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:-translate-y-0.5">+</button>
            </form>

            <div className="space-y-3 relative z-10 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {inventory.map(item => (
                <div key={item._id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between group hover:bg-white/10 transition-all hover:border-cyan-500/30">
                  <div>
                    <h4 className="font-bold text-white text-sm">{item.name}</h4>
                    <p className="text-xs text-slate-400 mt-1">Stock: <span className={item.quantity < 5 ? "text-rose-400 font-bold drop-shadow-[0_0_5px_rgba(244,63,94,0.5)]" : "text-emerald-400 font-medium"}>{item.quantity}</span></p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
                      <button type="button" onClick={() => updateInventory(item._id, item.quantity - 1)} className="w-8 h-8 rounded hover:bg-white/10 text-slate-300 font-bold flex items-center justify-center transition-colors">-</button>
                      <div className="w-8 h-8 flex items-center justify-center font-bold text-white tracking-widest">{item.quantity}</div>
                      <button type="button" onClick={() => updateInventory(item._id, item.quantity + 1)} className="w-8 h-8 rounded hover:bg-white/10 text-slate-300 font-bold flex items-center justify-center transition-colors">+</button>
                    </div>
                    <button onClick={() => deleteInventory(item._id)} className="text-rose-400/50 hover:text-rose-400 text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-opacity">Remove</button>
                  </div>
                </div>
              ))}
              {inventory.length === 0 && <p className="text-slate-500 text-sm py-4 italic text-center">Your inventory is empty.</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
