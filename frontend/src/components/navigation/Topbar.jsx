import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, User, ChevronDown, LogOut, X, Check } from 'lucide-react';
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

// Searchable pages (ones that support ?q= param)
const SEARCHABLE_PAGES = [
  '/admin/customers',
  '/admin/appointments',
  '/admin/inventory',
  '/admin/employees',
];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');

  const [searchQuery, setSearchQuery]   = useState('');
  const [profileOpen, setProfileOpen]   = useState(false);
  const [notifOpen, setNotifOpen]       = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [searchFocused, setSearchFocused] = useState(false);

  const pageTitle = breadcrumbMap[location.pathname] || 'Dashboard';
  const isSearchablePage = SEARCHABLE_PAGES.includes(location.pathname);
  const unreadCount = notifications.filter(n => !n.read).length;

  // ── Sync search input with URL ?q= param ──────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchQuery(params.get('q') || '');
  }, [location.search]);

  const handleSearch = useCallback((value) => {
    setSearchQuery(value);
    if (!isSearchablePage) return;
    const params = new URLSearchParams(location.search);
    if (value.trim()) {
      params.set('q', value.trim());
    } else {
      params.delete('q');
    }
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  }, [location, navigate, isSearchablePage]);

  // ── Fetch real notifications from backend ──────────────────────────────
  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const buildNotifications = async () => {
      const notifs = [];

      try {
        // 1. Inventory alerts
        const invRes = await fetch('http://localhost:5000/api/inventory', { headers });
        if (invRes.ok) {
          const inv = await invRes.json();
          const critical = inv.filter(i => i.quantity < 5);
          const low      = inv.filter(i => i.quantity >= 5 && i.quantity < 15);
          if (critical.length > 0) {
            notifs.push({
              id: 'inv-critical',
              title: 'Critical Stock Alert',
              desc: `${critical.map(i => i.name).slice(0, 2).join(', ')} below 5 units`,
              time: 'Now',
              type: 'danger',
              read: false,
            });
          } else if (low.length > 0) {
            notifs.push({
              id: 'inv-low',
              title: 'Low Stock Warning',
              desc: `${low.length} item${low.length > 1 ? 's' : ''} running low`,
              time: 'Now',
              type: 'warning',
              read: false,
            });
          }
        }
      } catch { /* silent */ }

      try {
        // 2. Latest bookings
        const bkRes = await fetch('http://localhost:5000/api/bookings', { headers });
        if (bkRes.ok) {
          const bookings = await bkRes.json();
          const recent = [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 2);
          recent.forEach(b => {
            notifs.push({
              id: `booking-${b._id}`,
              title: 'New Booking',
              desc: `${b.customerName} booked ${b.service?.split(' - ')[0] || 'a service'}`,
              time: timeAgo(b.createdAt),
              type: 'info',
              read: true,
            });
          });
        }
      } catch { /* silent */ }

      try {
        // 3. High churn risk count
        const churnRes = await fetch('http://localhost:5000/api/churn', { headers });
        if (churnRes.ok) {
          const churnData = await churnRes.json();
          const highRisk = churnData.filter(c => c.churn_risk_category === 'High');
          if (highRisk.length > 0) {
            notifs.push({
              id: 'churn-high',
              title: 'Churn Risk Detected',
              desc: `${highRisk.length} customer${highRisk.length > 1 ? 's' : ''} flagged as High Risk`,
              time: 'Today',
              type: 'warning',
              read: false,
            });
          }
        }
      } catch { /* silent */ }

      setNotifications(notifs);
    };

    buildNotifications();
    const interval = setInterval(buildNotifications, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(interval);
  }, [token]);

  const markAllRead = () => setNotifications(n => n.map(x => ({ ...x, read: true })));
  const markRead = (id) => setNotifications(n => n.map(x => x.id === id ? { ...x, read: true } : x));
  const closeAll = () => { setProfileOpen(false); setNotifOpen(false); };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

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
            value={searchQuery}
            placeholder={
              isSearchablePage
                ? `Search ${pageTitle.toLowerCase()}…`
                : 'Search customers, bookings, inventory…'
            }
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            onChange={e => handleSearch(e.target.value)}
            onKeyDown={e => {
              // Navigate to customers page if on non-searchable page
              if (e.key === 'Enter' && !isSearchablePage && searchQuery.trim()) {
                navigate(`/admin/customers?q=${encodeURIComponent(searchQuery.trim())}`);
              }
            }}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-surface-2/80 border transition-all duration-300 outline-none
              ${searchFocused
                ? 'border-aurora-purple/40 ring-2 ring-aurora-purple/10 bg-white shadow-glow-purple'
                : 'border-ink-200/50 hover:border-ink-300'}`}
          />
          {searchQuery && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 hover:text-ink-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5">

        {/* ── Notifications ── */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(p => !p); setProfileOpen(false); }}
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
                    {notifications.length === 0 ? (
                      <div className="px-4 py-10 text-center text-ink-400 text-xs">No notifications yet</div>
                    ) : notifications.map(n => {
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
                    <p className="text-[10px] text-ink-400 text-center font-medium">
                      {notifications.length === 0 ? 'All clear!' : 'Live data from your salon'}
                    </p>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* ── Profile ── */}
        <div className="relative">
          <button
            onClick={() => { setProfileOpen(p => !p); setNotifOpen(false); }}
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
