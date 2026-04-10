import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function AdminAuth({ mode }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = mode === 'login' ? '/api/admin/login' : '/api/admin/register';
    
    try {
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (mode === 'login') {
        localStorage.setItem('adminToken', data.token);
        navigate('/admin');
      } else {
        navigate('/admin/login');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[85vh] px-4">
      <div className="bg-white p-10 rounded-[40px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-gray-50 w-full max-w-md relative overflow-hidden">
        <div className="flex justify-center mb-8 relative z-10">
           <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center font-black text-white text-xl shadow-xl">A</div>
        </div>

        <h2 className="text-3xl font-light text-gray-900 text-center mb-2 uppercase tracking-tight">
          {mode === 'login' ? 'Admin Login' : 'Register Admin'}
        </h2>
        <p className="text-center text-gray-400 mb-8 text-[10px] uppercase font-black tracking-[0.2em]">
          AutoSalon Security
        </p>

        {error && <div className="bg-rose-50 border border-rose-100 text-rose-500 p-4 rounded-2xl mb-8 text-xs text-center font-bold">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold ml-1">Username</label>
            <input 
              type="text" required value={username} onChange={e => setUsername(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-rose-50 outline-none text-gray-800 transition-all"
              placeholder="e.g. manager1"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold ml-1">Password</label>
            <input 
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-rose-50 outline-none text-gray-800 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button className="w-full py-4 rounded-2xl bg-gray-900 text-white font-black uppercase tracking-widest text-[11px] hover:bg-gray-800 transition-all hover:shadow-xl hover:-translate-y-1 mt-4">
            {mode === 'login' ? 'Access Control' : 'Create Profile'}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-gray-50 text-center text-[10px] uppercase tracking-widest font-black">
          {mode === 'login' ? (
            <p className="text-gray-400">Restricted Area. <Link to="/admin/register" className="text-rose-400 hover:text-rose-500">Apply for Access</Link></p>
          ) : (
            <p className="text-gray-400">Already Registered? <Link to="/admin/login" className="text-rose-400 hover:text-rose-500">Sign In</Link></p>
          )}
        </div>
      </div>
    </div>
  );
}
