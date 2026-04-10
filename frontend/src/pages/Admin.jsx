import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const checkSlotExpired = (booking, isToday) => {
  if (!isToday) return true;
  if (!booking.slotId) return true;
  try {
    // Current time is e.g. "11am", "1.30pm"
    const str = booking.slotId.time.toLowerCase().replace(/\s/g, '');
    const ampm = str.includes('pm') ? 'pm' : 'am';
    const timePart = str.replace(ampm, '');
    let [h, m] = timePart.split('.');
    h = parseInt(h);
    m = m ? parseInt(m) : 0;
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    const now = new Date();
    const slotTime = new Date();
    slotTime.setHours(h, m, 0, 0);
    // Give 30 min buffer
    slotTime.setMinutes(slotTime.getMinutes() + 30);
    return now >= slotTime;
  } catch(e) { return false; }
};

export default function Admin() {
  const [bookings, setBookings] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [churnPredictions, setChurnPredictions] = useState({});
  const [invForm, setInvForm] = useState({ name: '', quantity: 0 });
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!token) { navigate('/admin/login'); return; }
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

  const handlePredictChurn = async (phone) => {
    try {
      setChurnPredictions(prev => ({...prev, [phone]: 'loading'}));
      const res = await fetch('http://localhost:5000/api/churn/predict', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (res.ok) {
        setChurnPredictions(prev => ({...prev, [phone]: data}));
      } else {
        setChurnPredictions(prev => ({...prev, [phone]: { error: data.error }}));
      }
    } catch(err) {
      setChurnPredictions(prev => ({...prev, [phone]: { error: err.message }}));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  const groupedBookings = bookings.reduce((acc, booking) => {
    const dateStr = new Date(booking.createdAt).toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'short', day: 'numeric'
    });
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(booking);
    return acc;
  }, {});

  if (!token) return null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      {/* Admin Header */}
      <div className="flex items-center justify-between p-8 bg-white rounded-3xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] border border-gray-50">
        <div>
          <h2 className="text-3xl font-light tracking-tight text-gray-900 uppercase">Admin <span className="font-black">Dashboard</span></h2>
          <p className="text-gray-400 text-xs uppercase tracking-[0.2em] mt-2">AutoSalon Control Center</p>
        </div>
        <button onClick={handleLogout} className="px-6 py-2 rounded-full border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-all">
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Bookings Section */}
        <div className="lg:col-span-8">
          <section className="bg-white rounded-3xl p-8 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] border border-gray-50 min-h-[600px]">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-8 border-b border-gray-50 pb-4">Appointment Schedule</h3>
            
            <div className="space-y-8">
              {Object.entries(groupedBookings).map(([date, dateBookings]) => {
                const isToday = date === new Date().toLocaleDateString(undefined, {
                  weekday: 'long', year: 'numeric', month: 'short', day: 'numeric'
                });

                return (
                  <div key={date} className="space-y-4">
                    <div className="flex items-center gap-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-rose-300">{date}</p>
                      <div className="h-[1px] flex-1 bg-gray-50"></div>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-widest text-gray-300">
                            <th className="py-4 px-2">Customer</th>
                            <th className="py-4 px-2">Service</th>
                            <th className="py-4 px-2">Time</th>
                            <th className="py-4 px-2 text-right">Analytics</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {dateBookings.map(b => (
                            <tr key={b._id} className="group hover:bg-gray-50/50 transition-all">
                              <td className="py-6 px-2">
                                <p className="text-sm font-bold text-gray-800">{b.customerName}</p>
                                <p className="text-[10px] text-gray-400 font-medium">{b.phone}</p>
                              </td>
                              <td className="py-6 px-2">
                                <span className="text-[10px] font-black uppercase tracking-tighter text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                                  {b.service}
                                </span>
                              </td>
                              <td className="py-6 px-2">
                                <p className="text-xs font-bold text-gray-600 uppercase tracking-tighter">
                                  {b.slotId ? b.slotId.time : 'N/A'}
                                </p>
                              </td>
                              <td className="py-6 px-2 text-right">
                                <div className="flex justify-end items-center gap-3">
                                  {churnPredictions[b.phone] === 'loading' ? (
                                    <span className="text-[10px] font-bold text-indigo-400 animate-pulse uppercase tracking-widest">Analysing...</span>
                                  ) : churnPredictions[b.phone] && !churnPredictions[b.phone].error ? (
                                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                                      churnPredictions[b.phone].churn == 1 
                                        ? 'bg-rose-50 text-rose-500 border-rose-100 shadow-[0_5px_15px_rgba(244,63,94,0.1)]' 
                                        : 'bg-emerald-50 text-emerald-500 border-emerald-100 shadow-[0_5px_15px_rgba(16,185,129,0.1)]'
                                    }`}>
                                      {churnPredictions[b.phone].churn == 1 ? 'Churn Risk' : 'Loyal'} 
                                      <span className="ml-2 opacity-50">{Math.round(churnPredictions[b.phone].churn_risk)}%</span>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => handlePredictChurn(b.phone)}
                                      className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-indigo-500 transition-colors"
                                    >
                                      {churnPredictions[b.phone]?.error ? 'Retry Prediction' : 'Predict Churn'}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
              {bookings.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                  <p className="text-xs uppercase tracking-[0.3em] font-medium">Clear Sky: No Bookings</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Inventory Section */}
        <div className="lg:col-span-4 space-y-8">
          <section className="bg-white rounded-3xl p-8 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] border border-gray-50 min-h-[400px]">
             <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-8 border-b border-gray-50 pb-4">Resources</h3>
             
             <form onSubmit={addInventory} className="flex gap-2 mb-8">
                <input 
                  required type="text" placeholder="Item Name" 
                  className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-rose-50 transition-all outline-none"
                  value={invForm.name} onChange={e=>setInvForm({...invForm, name: e.target.value})} 
                />
                <input 
                  required type="number" 
                  className="w-16 bg-gray-50 border-none rounded-xl px-2 py-3 text-xs focus:ring-2 focus:ring-rose-50 transition-all outline-none text-center"
                  value={invForm.quantity} onChange={e=>setInvForm({...invForm, quantity: Number(e.target.value)})} 
                />
                <button className="bg-gray-900 text-white w-12 rounded-xl flex items-center justify-center hover:bg-gray-800 transition-all shadow-lg">+</button>
             </form>

             <div className="space-y-4">
                {inventory.map(item => (
                  <div key={item._id} className="p-5 rounded-2xl bg-gray-50/50 border border-gray-100 flex items-center justify-between group hover:bg-white transition-all hover:shadow-sm">
                    <div>
                      <p className="text-xs font-black uppercase tracking-tighter text-gray-700">{item.name}</p>
                      <p className={`text-[10px] font-bold mt-1 ${item.quantity < 5 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {item.quantity} in stock
                      </p>
                    </div>
                    <div className="flex bg-white rounded-lg p-1 border border-gray-100 shadow-sm opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => updateInventory(item._id, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center text-xs font-bold text-gray-400 hover:text-gray-900">-</button>
                      <button onClick={() => updateInventory(item._id, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center text-xs font-bold text-gray-400 hover:text-gray-900">+</button>
                      <button onClick={() => deleteInventory(item._id)} className="w-6 h-6 flex items-center justify-center text-[10px] text-rose-300 hover:text-rose-500">×</button>
                    </div>
                  </div>
                ))}
                {inventory.length === 0 && <p className="text-center text-gray-200 text-[10px] py-10 uppercase tracking-widest font-bold">Empty Vault</p>}
             </div>
          </section>
        </div>
      </div>
    </div>
  );
}
