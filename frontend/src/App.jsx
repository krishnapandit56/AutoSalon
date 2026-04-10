import { Routes, Route } from 'react-router-dom';
import Customer from './pages/Customer';
import Admin from './pages/Admin';
import AdminAuth from './pages/AdminAuth';

function App() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-gray-800 font-sans selection:bg-rose-100 relative overflow-hidden">
      {/* Subtle Pastel Background Accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] opacity-30 bg-rose-50 blur-[120px] rounded-full pointer-events-none"></div>

      <main className="relative z-10 w-full min-h-[90vh]">
        <Routes>
          <Route path="/" element={<Customer />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/login" element={<AdminAuth mode="login" />} />
          <Route path="/admin/register" element={<AdminAuth mode="register" />} />
        </Routes>
      </main>

      <footer className="relative z-10 py-10 text-center text-[10px] uppercase tracking-[0.2em] text-gray-400">
        <a href="/admin/login" className="hover:text-gray-600 transition-colors">Admin Portal</a>
      </footer>
    </div>
  );
}

export default App;
