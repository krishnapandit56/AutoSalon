import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Shield, AlertTriangle, TrendingUp, UserCheck,
  X, Phone, MapPin, Star, Clock
} from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import Badge from '../components/ui/Badge';
import DataTable from '../components/ui/DataTable';
import PageLoader from '../components/ui/PageLoader';
import { DUMMY_CUSTOMERS } from '../lib/dummyCustomers';

export default function CustomersPage() {
  const token = localStorage.getItem('adminToken');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [churnResults, setChurnResults] = useState({});
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!token) { setCustomers(DUMMY_CUSTOMERS); setLoading(false); return; }

    // Try fetching real data, fall back to dummy immediately if fails
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 4000); // 4s timeout

    fetch('http://localhost:5000/api/churn-data', {
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && Array.isArray(data) && data.length > 0) {
          setCustomers(data.map(c => ({
            id: c._id,
            name: c.name || 'Anonymous',
            phone: c.phone || '—',
            age: c.age || '—',
            gender: c.gender || '—',
            city: c.city || '—',
            totalVisits: c.total_visits || 0,
            totalSpend: c.total_spend || 0,
            avgSpend: c.avg_spend_per_visit || 0,
            avgRating: c.avg_rating || 0,
            daysSinceLastVisit: c.days_since_last_visit || 0,
            churnRisk: c.churn_risk_category || 'Medium',
            membershipType: c.membership_type || 'None',
            preferredService: c.preferred_service || '—',
            bookingSource: c.booking_source || '—',
          })));
        } else {
          setCustomers(DUMMY_CUSTOMERS);
        }
      })
      .catch(() => setCustomers(DUMMY_CUSTOMERS))
      .finally(() => { clearTimeout(timeout); setLoading(false); });

    return () => { ctrl.abort(); clearTimeout(timeout); };
  }, [token]);

  const handlePredictChurn = async (name) => {
    setChurnResults(prev => ({ ...prev, [name]: 'loading' }));
    try {
      const res = await fetch('http://localhost:5000/api/churn/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      setChurnResults(prev => ({ ...prev, [name]: data }));
    } catch {
      setChurnResults(prev => ({ ...prev, [name]: { error: 'Failed' } }));
    }
  };

  const filteredCustomers = filter === 'all'
    ? customers
    : customers.filter(c => c.churnRisk === filter || (filter === 'Low' && c.churnRisk === 'Low-Medium'));

  const seg = {
    all:    customers.length,
    High:   customers.filter(c => c.churnRisk === 'High').length,
    Medium: customers.filter(c => c.churnRisk === 'Medium').length,
    Low:    customers.filter(c => c.churnRisk === 'Low' || c.churnRisk === 'Low-Medium').length,
  };

  const riskBadge = risk => {
    const map = { High: 'danger', Medium: 'warning', Low: 'success', 'Low-Medium': 'info' };
    return <Badge variant={map[risk] || 'neutral'} dot>{risk}</Badge>;
  };

  const columns = [
    {
      header: 'Customer', accessor: 'name', sortable: true,
      render: row => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-aurora-purple/20 to-aurora-cyan/20 flex items-center justify-center text-xs font-bold text-aurora-purple shrink-0">
            {row.name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-bold text-ink-800">{row.name}</p>
            <p className="text-[10px] text-ink-400 font-medium">{row.city}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Phone', accessor: 'phone', sortable: false,
      render: row => <span className="font-mono text-xs text-ink-600">{row.phone}</span>,
    },
    {
      header: 'Visits', accessor: 'totalVisits', sortable: true,
      render: row => <span className="font-mono text-sm font-bold text-ink-700">{row.totalVisits}</span>,
    },
    {
      header: 'Total Spend', accessor: 'totalSpend', sortable: true,
      render: row => <span className="font-mono text-sm font-semibold text-ink-700">₹{Math.round(row.totalSpend).toLocaleString()}</span>,
    },
    {
      header: 'Rating', accessor: 'avgRating', sortable: true,
      render: row => (
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-aurora-gold fill-aurora-gold" />
          <span className="text-sm font-bold text-ink-700">{Number(row.avgRating).toFixed(1)}</span>
        </div>
      ),
    },
    {
      header: 'Last Visit', accessor: 'daysSinceLastVisit', sortable: true,
      render: row => (
        <span className={`text-xs font-bold ${row.daysSinceLastVisit > 60 ? 'text-rose-500' : row.daysSinceLastVisit > 30 ? 'text-amber-500' : 'text-emerald-500'}`}>
          {row.daysSinceLastVisit}d ago
        </span>
      ),
    },
    {
      header: 'Risk', accessor: 'churnRisk', sortable: true,
      render: row => riskBadge(row.churnRisk),
    },
    {
      header: 'Action', align: 'right',
      render: row => {
        const result = churnResults[row.name];
        if (result === 'loading') return <span className="text-[10px] text-aurora-purple animate-pulse font-bold uppercase tracking-widest">Analysing…</span>;
        if (result && !result.error) {
          return (
            <span className={`text-[10px] font-bold uppercase tracking-widest ${result.risk_level === 'High Risk' ? 'text-rose-500' : result.risk_level === 'Medium' ? 'text-amber-500' : 'text-emerald-500'}`}>
              {result.risk_level} · {Math.round(result.churn_risk)}%
            </span>
          );
        }
        return (
          <button onClick={e => { e.stopPropagation(); handlePredictChurn(row.name); }}
            className="text-[10px] font-bold uppercase tracking-widest text-aurora-purple hover:text-aurora-indigo transition-colors">
            Predict
          </button>
        );
      },
    },
  ];

  if (loading) return <PageLoader label="Loading Customers…" />;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-ink-900 tracking-tight">Customer Management</h1>
        <p className="text-sm text-ink-400 mt-1">Track loyalty, predict churn, and manage customer relationships.</p>
      </motion.div>

      {/* Segment Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'All Customers', count: seg.all,    icon: Users,         accent: 'purple', key: 'all'    },
          { label: 'High Risk',     count: seg.High,   icon: AlertTriangle, accent: 'rose',   key: 'High'   },
          { label: 'Medium Risk',   count: seg.Medium, icon: Shield,        accent: 'gold',   key: 'Medium' },
          { label: 'Low Risk',      count: seg.Low,    icon: UserCheck,     accent: 'emerald',key: 'Low'    },
        ].map(s => (
          <motion.button key={s.key} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
            onClick={() => setFilter(s.key === filter ? 'all' : s.key)}
            className={`glass-card p-4 text-left transition-all duration-200 ${filter === s.key ? 'ring-2 ring-aurora-purple/30' : ''}`}>
            <s.icon className={`w-5 h-5 mb-2 ${filter === s.key ? 'text-aurora-purple' : 'text-ink-400'}`} />
            <p className="text-2xl font-display font-bold text-ink-900">{s.count}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mt-1">{s.label}</p>
          </motion.button>
        ))}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredCustomers}
        searchable
        searchPlaceholder="Search by name, city, service…"
        onRowClick={row => setSelectedCustomer(row)}
        pageSize={12}
        emptyMessage="No customers found"
      />

      {/* Customer Detail Drawer */}
      <AnimatePresence>
        {selectedCustomer && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink-900/20 backdrop-blur-sm z-50"
              onClick={() => setSelectedCustomer(null)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 h-full w-[420px] bg-white/95 backdrop-blur-2xl shadow-float z-50 overflow-y-auto"
            >
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-display font-bold text-ink-900">Customer Profile</h2>
                  <button onClick={() => setSelectedCustomer(null)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-aurora-purple to-aurora-cyan flex items-center justify-center text-white text-xl font-bold shadow-glow-purple">
                    {selectedCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-ink-900">{selectedCustomer.name}</p>
                    <p className="text-xs text-ink-400 font-medium">
                      {selectedCustomer.city} · {selectedCustomer.gender} · Age {selectedCustomer.age}
                    </p>
                    <div className="mt-1">{riskBadge(selectedCustomer.churnRisk)}</div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: TrendingUp, label: 'Total Spend',  value: `₹${Math.round(selectedCustomer.totalSpend).toLocaleString()}` },
                    { icon: Clock,      label: 'Total Visits', value: selectedCustomer.totalVisits },
                    { icon: Star,       label: 'Avg Rating',   value: Number(selectedCustomer.avgRating).toFixed(1) },
                    { icon: Clock,      label: 'Last Visit',   value: `${selectedCustomer.daysSinceLastVisit}d ago` },
                  ].map((stat, i) => (
                    <div key={i} className="p-3 rounded-xl bg-surface-2/50 border border-ink-100/40">
                      <stat.icon className="w-4 h-4 text-ink-400 mb-2" />
                      <p className="text-lg font-bold text-ink-900">{stat.value}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Details list */}
                <div className="space-y-0 divide-y divide-ink-100/60">
                  {[
                    { label: 'Phone',            value: selectedCustomer.phone,                     icon: Phone,  mono: true  },
                    { label: 'City',             value: selectedCustomer.city,                      icon: MapPin, mono: false },
                    { label: 'Membership',       value: selectedCustomer.membershipType,            icon: null,   mono: false },
                    { label: 'Preferred Service',value: selectedCustomer.preferredService,          icon: null,   mono: false },
                    { label: 'Booking Source',   value: selectedCustomer.bookingSource?.replace('_',' '), icon: null, mono: false },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-3">
                      <span className="text-xs text-ink-400 font-medium flex items-center gap-1.5">
                        {item.icon && <item.icon className="w-3.5 h-3.5" />}
                        {item.label}
                      </span>
                      <span className={`text-sm font-bold text-ink-700 ${item.mono ? 'font-mono' : ''}`}>{item.value || '—'}</span>
                    </div>
                  ))}
                </div>

                {/* Churn predict */}
                <button onClick={() => handlePredictChurn(selectedCustomer.name)}
                  className="btn-gradient w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                  🔮 Run AI Churn Prediction
                </button>
                {churnResults[selectedCustomer.name] && churnResults[selectedCustomer.name] !== 'loading' && !churnResults[selectedCustomer.name]?.error && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-aurora-purple/5 to-aurora-cyan/5 border border-aurora-purple/10">
                    <p className="text-xs font-bold text-aurora-purple uppercase tracking-widest mb-1">AI Prediction</p>
                    <p className="text-lg font-bold text-ink-900">
                      {churnResults[selectedCustomer.name].risk_level} — {Math.round(churnResults[selectedCustomer.name].churn_risk)}% risk
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
