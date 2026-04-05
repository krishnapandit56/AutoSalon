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
        // Registration successful
        navigate('/admin/login');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[85vh] px-4 animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-white/[0.03] border border-white/10 backdrop-blur-xl p-10 rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/20 blur-3xl rounded-full"></div>
        
        <div className="flex justify-center mb-8 relative z-10">
           <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-fuchsia-500 to-cyan-500 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-fuchsia-500/20">A</div>
        </div>

        <h2 className="text-3xl font-black text-white text-center mb-2 relative z-10">
          {mode === 'login' ? 'Admin Login' : 'Register Admin'}
        </h2>
        <p className="text-center text-slate-400 mb-8 text-sm relative z-10">
          {mode === 'login' ? 'Authenticate to manage the salon.' : 'Create a highly secure JWT account.'}
        </p>

        {error && <div className="relative z-10 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl mb-6 text-sm text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-300">Username</label>
            <input 
              type="text" 
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-black/40 px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-cyan-500/50 outline-none text-white transition-all shadow-inner placeholder:text-slate-600"
              placeholder="e.g. manager1"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-300">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-black/40 px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-cyan-500/50 outline-none text-white transition-all shadow-inner placeholder:text-slate-600"
              placeholder="••••••••"
            />
          </div>

          <button className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all hover:-translate-y-0.5 mt-4">
            {mode === 'login' ? 'Access Dashboard' : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 text-center text-sm text-slate-400 relative z-10">
          {mode === 'login' ? (
            <p>Need an account? <Link to="/admin/register" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors drop-shadow-md">Register here</Link></p>
          ) : (
            <p>Already have an account? <Link to="/admin/login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors drop-shadow-md">Login here</Link></p>
          )}
        </div>
      </div>
    </div>
  );
}
