import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Calendar, UserCog, Package, BarChart3,
  Scissors, ChevronLeft, ChevronRight, Sparkles, LogOut
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/admin',              icon: LayoutDashboard, label: 'Dashboard',    end: true },
  { to: '/admin/customers',    icon: Users,           label: 'Customers'            },
  { to: '/admin/appointments', icon: Calendar,        label: 'Appointments'         },
  { to: '/admin/employees',    icon: UserCog,         label: 'Employees'            },
  { to: '/admin/inventory',    icon: Package,         label: 'Inventory'            },
  { to: '/admin/analytics',    icon: BarChart3,       label: 'Analytics'            },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="glass-sidebar h-screen sticky top-0 flex flex-col z-40 select-none"
    >
      {/* Brand */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-5'} h-16 border-b border-ink-100/40`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-aurora-purple to-aurora-indigo flex items-center justify-center shadow-glow-purple shrink-0">
          <Scissors className="w-4 h-4 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
            >
              <span className="font-display font-bold text-ink-900 text-base tracking-tight">AutoSalon</span>
              <p className="text-[9px] font-bold uppercase tracking-widest text-aurora-purple">Smart Dashboard</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `
              group flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-xl
              transition-all duration-200 relative
              ${isActive
                ? 'bg-gradient-to-r from-aurora-purple/10 to-aurora-cyan/5 text-aurora-purple'
                : 'text-ink-500 hover:bg-ink-100/60 hover:text-ink-800'}
            `}
          >
            {({ isActive }) => (
              <>
                {/* Active glow indicator */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b from-aurora-purple to-aurora-cyan"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <item.icon className={`w-[18px] h-[18px] shrink-0 transition-all duration-200 ${isActive ? 'text-aurora-purple' : 'group-hover:scale-110'}`} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      className={`text-[13px] font-semibold whitespace-nowrap ${isActive ? 'text-aurora-purple' : ''}`}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-4 space-y-2 border-t border-ink-100/40 pt-3">
        {/* AI Badge */}
        {!collapsed && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-aurora-purple/5 to-aurora-cyan/5">
            <Sparkles className="w-3.5 h-3.5 text-aurora-purple" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-aurora-purple">AI Powered</span>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-3'} w-full py-2.5 rounded-xl text-ink-400 hover:bg-rose-50 hover:text-rose-500 transition-all duration-200`}
        >
          <LogOut className="w-[18px] h-[18px]" />
          {!collapsed && <span className="text-[13px] font-semibold">Sign Out</span>}
        </button>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center justify-center w-full py-2 rounded-xl text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition-all"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </motion.aside>
  );
}
