import { Routes, Route } from 'react-router-dom';
import Customer from './pages/Customer';
import Admin from './pages/Admin';
import AdminAuth from './pages/AdminAuth';

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-fuchsia-500/30 relative overflow-hidden">
      {/* Decorative background gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] opacity-20 bg-fuchsia-600 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[400px] opacity-20 bg-cyan-600 blur-[100px] rounded-full pointer-events-none"></div>

      {/* Pages render locally. Shared global nav is removed to keep Customer and Admin completely physically isolated as requested. */}
      <main className="relative z-10 w-full min-h-[90vh]">
        <Routes>
          <Route path="/" element={<Customer />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/login" element={<AdminAuth mode="login" />} />
          <Route path="/admin/register" element={<AdminAuth mode="register" />} />
        </Routes>
      </main>

      <footer className="relative z-10 py-6 text-center text-xs text-slate-700">
        <a href="/admin/login" className="hover:text-slate-400 transition-colors">Admin Portal</a>
      </footer>
    </div>
  );
}

export default App;
