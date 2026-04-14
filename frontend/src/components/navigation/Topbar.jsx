import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, User, ChevronDown, LogOut, Settings, X, Check, Moon, Volume2, Shield, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const breadcrumbMap = {
  '/admin': 'Dashboard',
  '/admin/customers': 'Customers',
  '/admin/appointments': 'Appointments',
  '/admin/employees': 'Employees',
  '/admin/inventory': 'Inventory',
  '/admin/analytics': 'Analytics',
  '/admin/advanced-analytics': 'Advanced Analytics',
};

// Demo notifications
const NOTIFICATIONS = [
  { id: 1, title: 'Low Stock Alert', desc: 'Hair Color Tubes below 5 units', time: '2m ago', type: 'warning', read: false },
  { id: 2, title: 'New Booking', desc: 'Priya Sharma booked Keratin Treatment', time: '15m ago', type: 'info', read: false },
  { id: 3, title: 'Churn Risk', desc: '3 customers flagged as high risk', time: '1h ago', type: 'danger', read: false },
  { id: 4, title: 'Revenue Milestone', desc: 'Monthly revenue crossed ₹2L 🎉', time: '3h ago', type: 'success', read: true },
  { id: 5, title: 'Staff Update', desc: 'Anjali updated her availability', time: '5h ago', type: 'info', read: true },
];

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchFocused, setSearchFocused] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [settings, setSettings] = useState({
    emailAlerts: true,
    pushNotifications: true,
    autoRefresh: true,
    compactMode: false,
  });

  const pageTitle = breadcrumbMap[location.pathname] || 'Dashboard';
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  const markAllRead = () => setNotifications(n => n.map(x => ({ ...x, read: true })));
  const markRead = (id) => setNotifications(n => n.map(x => x.id === id ? { ...x, read: true } : x));

  const closeAll = () => { setProfileOpen(false); setNotifOpen(false); setSettingsOpen(false); };

  return (
    <header className="glass-topbar sticky top-0 z-30 px-6 h-16 flex items-center justify-between gap-4">
      {/* Left: Breadcrumb */}
      <div>
        <h1 className="text-lg font-display font-bold text-ink-900 tracking-tight">{pageTitle}</h1>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">AutoSalon Control Center</p>
      </div>

      {/* Center: Search */}
      <div className="hidden md:flex flex-1 max-w-md mx-8">
        <div className={`relative w-full transition-all duration-300 ${searchFocused ? 'scale-[1.02]' : ''}`}>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            type="text"
            placeholder="Search customers, bookings, inventory…"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-surface-2/80 border transition-all duration-300 outline-none
              ${searchFocused
                ? 'border-aurora-purple/40 ring-2 ring-aurora-purple/10 bg-white shadow-glow-purple'
                : 'border-ink-200/50 hover:border-ink-300'}`}
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5">

        {/* ── Notifications ── */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(p => !p); setProfileOpen(false); setSettingsOpen(false); }}
            className="relative w-10 h-10 rounded-xl flex items-center justify-center text-ink-500 hover:bg-aurora-purple/5 hover:text-aurora-purple transition-all duration-200"
          >
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] rounded-full bg-gradient-to-r from-aurora-pink to-aurora-rose border-2 border-white flex items-center justify-center text-[9px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={closeAll} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-80 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-float border border-ink-100 z-50 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100/60">
                    <p className="text-xs font-bold uppercase tracking-widest text-ink-500">Notifications</p>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-[10px] font-bold uppercase tracking-widest text-aurora-purple hover:text-aurora-indigo transition-colors">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-ink-100/40">
                    {notifications.map(n => {
                      const typeColor = { warning: 'text-amber-500', danger: 'text-rose-500', success: 'text-emerald-500', info: 'text-aurora-purple' };
                      return (
                        <button
                          key={n.id}
                          onClick={() => markRead(n.id)}
                          className={`w-full text-left px-4 py-3 hover:bg-ink-50 transition-colors flex gap-3 ${!n.read ? 'bg-aurora-purple/[0.02]' : ''}`}
                        >
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.read ? 'bg-aurora-purple' : 'bg-transparent'}`} />
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-bold ${!n.read ? 'text-ink-800' : 'text-ink-500'}`}>{n.title}</p>
                            <p className="text-[11px] text-ink-400 mt-0.5 truncate">{n.desc}</p>
                            <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${typeColor[n.type] || 'text-ink-400'}`}>{n.time}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="px-4 py-2.5 border-t border-ink-100/60 bg-surface-2/30">
                    <p className="text-[10px] text-ink-400 text-center font-medium">All caught up for now!</p>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* ── Settings ── */}
        <div className="relative">
          <button
            onClick={() => { setSettingsOpen(p => !p); setNotifOpen(false); setProfileOpen(false); }}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-ink-500 hover:bg-aurora-purple/5 hover:text-aurora-purple transition-all duration-200"
          >
            <Settings className={`w-[18px] h-[18px] transition-transform duration-300 ${settingsOpen ? 'rotate-90' : ''}`} />
          </button>

          <AnimatePresence>
            {settingsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={closeAll} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-72 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-float border border-ink-100 py-2 z-50"
                >
                  <div className="px-4 py-2 border-b border-ink-100/60 mb-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-ink-500">Quick Settings</p>
                  </div>
                  {[
                    { key: 'emailAlerts',        label: 'Email Alerts',        icon: Bell,    desc: 'Booking confirmations' },
                    { key: 'pushNotifications',  label: 'Push Notifications',  icon: Volume2, desc: 'Real-time alerts' },
                    { key: 'autoRefresh',        label: 'Auto Refresh Data',   icon: Clock,   desc: 'Refresh every 5 min' },
                    { key: 'compactMode',        label: 'Compact Mode',        icon: Shield,  desc: 'Denser table layout' },
                  ].map(s => (
                    <button
                      key={s.key}
                      onClick={() => setSettings(prev => ({ ...prev, [s.key]: !prev[s.key] }))}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-ink-50 transition-colors"
                    >
                      <s.icon className="w-4 h-4 text-ink-400 shrink-0" />
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-xs font-bold text-ink-700">{s.label}</p>
                        <p className="text-[10px] text-ink-400">{s.desc}</p>
                      </div>
                      <div className={`w-9 h-5 rounded-full transition-all duration-200 flex items-center px-0.5 ${settings[s.key] ? 'bg-aurora-purple' : 'bg-ink-200'}`}>
                        <motion.div
                          layout
                          className="w-4 h-4 rounded-full bg-white shadow-sm"
                          style={{ marginLeft: settings[s.key] ? 'auto' : 0 }}
                        />
                      </div>
                    </button>
                  ))}
                  <div className="mt-1 pt-1 border-t border-ink-100/60">
                    <button
                      onClick={() => { closeAll(); }}
                      className="w-full px-4 py-2.5 text-xs font-bold text-ink-500 hover:text-ink-800 hover:bg-ink-50 transition-colors text-left"
                    >
                      Advanced Settings →
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* ── Profile ── */}
        <div className="relative">
          <button
            onClick={() => { setProfileOpen(p => !p); setNotifOpen(false); setSettingsOpen(false); }}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-ink-100/60 transition-all duration-200"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-aurora-purple to-aurora-indigo flex items-center justify-center shadow-sm">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-ink-800">Admin</p>
              <p className="text-[10px] text-ink-400 font-medium">Salon Owner</p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-ink-400 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={closeAll} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-float border border-ink-100 py-1.5 z-50"
                >
                  <button
                    onClick={() => { closeAll(); setSettingsOpen(true); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-ink-600 hover:bg-ink-50 transition-colors"
                  >
                    <Settings className="w-4 h-4" /> Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
