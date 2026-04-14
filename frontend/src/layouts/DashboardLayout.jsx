import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/navigation/Sidebar';
import Topbar from '../components/navigation/Topbar';
import AuroraBackground from '../components/ui/AuroraBackground';
import FloatingAssistant from '../components/ai/FloatingAssistant';

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!token) navigate('/admin/login');
  }, [token, navigate]);

  if (!token) return null;

  return (
    <div className="flex min-h-screen bg-surface-0">
      <AuroraBackground />

      {/* Sidebar */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <Topbar />

        <main className="flex-1 px-6 py-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Floating AI Assistant */}
      <FloatingAssistant />
    </div>
  );
}
