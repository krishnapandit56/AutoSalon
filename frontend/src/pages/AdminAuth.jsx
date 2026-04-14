import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';

export default function AdminAuth({ mode }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const endpoint = mode === 'login' ? '/api/admin/login' : '/api/admin/register';
    try {
      const res  = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      if (mode === 'login') {
        localStorage.setItem('adminToken', data.token);
        navigate('/admin');
      } else {
        navigate('/admin/login');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mesh-bg min-h-screen flex items-center justify-center px-4">
      {/* Subtle glowing orbs */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-80 h-80 bg-accent-600/4 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Header mark */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-ink-900 shadow-float mb-6">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-display font-semibold text-ink-900 tracking-tight">
            {mode === 'login' ? 'Admin Access' : 'Create Admin'}
          </h1>
          <p className="text-ink-400 mt-2 text-sm font-medium">
            AutoSalon · Restricted Area
          </p>
        </div>

        {/* Card */}
        <div className="card p-8 space-y-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl font-medium"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-ink-400">Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input
                  type="text" required value={username} placeholder="e.g. manager1"
                  onChange={e => setUsername(e.target.value)}
                  className="field pl-10"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-ink-400">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input
                  type="password" required value={password} placeholder="••••••••"
                  onChange={e => setPassword(e.target.value)}
                  className="field pl-10"
                />
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full mt-2 py-3.5 rounded-xl bg-ink-900 text-white font-semibold text-sm tracking-wide
                         flex items-center justify-center gap-2 shadow-float hover:bg-ink-800 transition-colors
                         disabled:opacity-60 disabled:cursor-wait"
            >
              {loading ? (
                <><div className="spinner w-4 h-4" /> Processing…</>
              ) : (
                <>{mode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight className="w-4 h-4" /></>
              )}
            </motion.button>
          </form>

          {/* Footer link */}
          <p className="text-center text-xs text-ink-400 font-medium pt-2 border-t border-ink-100">
            {mode === 'login' ? (
              <>New admin?{' '}
                <Link to="/admin/register" className="text-accent-600 hover:text-accent-700 font-semibold">
                  Request access
                </Link>
              </>
            ) : (
              <>Already registered?{' '}
                <Link to="/admin/login" className="text-accent-600 hover:text-accent-700 font-semibold">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </div>

        {/* Security watermark */}
        <p className="text-center text-[11px] text-ink-300 font-medium mt-6 tracking-widest uppercase">
          256-bit encrypted · AutoSalon v2
        </p>
      </motion.div>
    </div>
  );
}
