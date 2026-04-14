import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, Users, Star, Activity, Package, Zap,
  AlertTriangle, ArrowUpRight, Filter
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import GlassCard from '../components/ui/GlassCard';
import Badge from '../components/ui/Badge';
import KpiCard from '../components/ui/KpiCard';
import PageLoader from '../components/ui/PageLoader';

const RISK_COLORS = { Low: '#10b981', 'Low-Medium': '#06b6d4', Medium: '#f59e0b', High: '#ef4444' };
const PIE_COLORS = ['#8B5CF6','#EC4899','#06B6D4','#F59E0B','#10b981','#6366f1','#14B8A6'];
const SRC_COLORS = ['#8B5CF6','#EC4899','#06B6D4','#F59E0B','#10b981','#6366f1'];

const fmtINR = v =>
  v >= 100000 ? `₹${(v/100000).toFixed(1)}L`
  : v >= 1000 ? `₹${(v/1000).toFixed(1)}K`
  : `₹${Math.round(v)}`;

const ttStyle = {
  contentStyle: {
    borderRadius: 12, border: '1px solid #e2e8f0',
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: 12,
    fontFamily: 'Inter', background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(12px)',
  },
  itemStyle: { fontWeight: 600 },
};

const REV_FILTERS = { Day: 'revenueByDay', Week: 'revenueByWeek', Month: 'revenueByMonth' };
const MONTH_OPTS = ['All','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revFilter, setRevFilter] = useState('Day');
  const [visMonth, setVisMonth] = useState('All');

  useEffect(() => {
    if (!token) { navigate('/admin/login'); return; }
    fetch('http://localhost:5000/api/mongo-analytics', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => {
        if (r.status === 401) { localStorage.removeItem('adminToken'); navigate('/admin/login'); return null; }
        if (!r.ok) throw new Error(`Server responded with ${r.status}`);
        return r.json();
      })
      .then(d => { if (d) setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, navigate]);

  if (loading) return <PageLoader label="Loading Analytics…" />;

  if (error) {
    return (
      <div className="flex items-center gap-3 p-5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
        <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
      </div>
    );
  }

  if (!data) return null;

  const revenueData = data[REV_FILTERS[revFilter]] || [];
  const visitsData = visMonth === 'All' ? data.visitsByMonth : data.visitsByMonth.filter(v => v.month === visMonth);
  const revFilterTotal = revenueData.reduce((s, d) => s + (d.revenue || 0), 0);

  const FilterPills = ({ options, active, onChange }) => (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all border ${
            active === o
              ? 'bg-aurora-purple text-white border-aurora-purple shadow-glow-purple'
              : 'text-ink-400 border-ink-200 hover:border-ink-400 hover:text-ink-700 bg-white'
          }`}>{o}</button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-ink-900 tracking-tight">Deep Analytics</h1>
          <p className="text-sm text-ink-400 mt-1">Comprehensive business intelligence with AI-powered forecasting.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="purple" dot>
            <Activity className="w-3 h-3" /> Live · MongoDB
          </Badge>
          <button
            onClick={() => navigate('/admin/advanced-analytics')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider text-aurora-purple bg-aurora-purple/5 border border-aurora-purple/15 hover:bg-aurora-purple/10 transition-all"
          >
            CSV Analytics <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </motion.div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard padding="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-aurora-purple/10 border border-aurora-purple/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-aurora-purple" />
            </div>
            <FilterPills options={Object.keys(REV_FILTERS)} active={revFilter} onChange={setRevFilter} />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-400 mb-1">Revenue ({revFilter})</p>
          <p className="text-2xl font-display font-bold text-ink-900">{fmtINR(revFilterTotal)}</p>
          <p className="text-xs text-ink-400 mt-1 font-medium">From MongoDB records</p>
        </GlassCard>
        <KpiCard icon={Users} label="Total Bookings" numericValue={data.totalBookings} sub="Lifetime salon records" accent="cyan" />
        <KpiCard icon={Star} label="Top Service" value={data.servicePerformance[0]?.name || '—'} sub={`${data.servicePerformance[0]?.bookings || 0} bookings`} accent="gold" />
      </div>

      {/* Revenue Chart */}
      <GlassCard padding="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-ink-400">Revenue Trend · Per {revFilter}</h3>
            <p className="text-[11px] text-ink-400 mt-0.5">Solid bars = historical · Dashed = AI forecast</p>
          </div>
          <FilterPills options={Object.keys(REV_FILTERS)} active={revFilter} onChange={setRevFilter} />
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtINR} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v, _, p) => [fmtINR(v), p.payload.isPredicted ? 'AI Forecast' : 'Actual']} {...ttStyle} />
              <Bar dataKey="revenue" radius={[8, 8, 0, 0]} maxBarSize={42}>
                {revenueData.map((e, i) => (
                  <Cell key={i} fill={e.isPredicted ? '#E8ECF4' : '#8B5CF6'}
                    stroke={e.isPredicted ? '#8B5CF6' : 'none'} strokeDasharray={e.isPredicted ? '4 4' : '0'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Demand Forecast Section */}
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-ink-100" />
        <Badge variant="purple"><Zap className="w-3 h-3" /> Demand Forecasting</Badge>
        <div className="h-px flex-1 bg-ink-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <GlassCard padding="p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-4">Demand Distribution</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={Object.entries(data.demandForecast?.distribution || {}).map(([risk, count]) => ({ risk, count }))}
                  dataKey="count" nameKey="risk" cx="50%" cy="50%" outerRadius={72} innerRadius={38} paddingAngle={4}>
                  {Object.entries(data.demandForecast?.distribution || {}).map(([risk], i) => (
                    <Cell key={i} fill={risk === 'High' ? '#ef4444' : risk === 'Medium' ? '#f59e0b' : '#10b981'} />
                  ))}
                </Pie>
                <Tooltip {...ttStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard padding="p-6" className="lg:col-span-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-4">Forecasting Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-4 rounded-xl bg-aurora-purple/5 border border-aurora-purple/10">
              <p className="text-[10px] font-bold text-aurora-purple uppercase tracking-widest mb-2">Trend Signal</p>
              <p className="text-sm font-semibold text-ink-800 leading-relaxed">
                Expected <span className="gradient-text font-bold">{data.demandForecast?.dominant_demand} demand</span> for {data.servicePerformance[0]?.name} services.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">High Demand %</p>
              <div className="flex justify-between text-xs font-bold text-emerald-800 mb-2">
                <span>Predicted</span>
                <span>{data.demandForecast?.summary['High%']}%</span>
              </div>
              <div className="w-full h-2 bg-emerald-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${data.demandForecast?.summary['High%']}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-2 border border-ink-100/40">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm text-base">💡</div>
            <p className="text-xs text-ink-500 font-medium leading-relaxed">
              {data.demandForecast?.dominant_demand === 'High'
                ? 'Prepare inventory for surge in facial and hair color services.'
                : 'Launch loyalty campaigns to boost low demand segments.'}
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Visits + Peak Days */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GlassCard padding="p-6">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-ink-400">Customer Visits</h3>
            <select value={visMonth} onChange={e => setVisMonth(e.target.value)}
              className="text-xs font-semibold text-ink-600 border border-ink-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-aurora-purple/30">
              {MONTH_OPTS.map(m => <option key={m}>{m}</option>)}
            </select>
            <span className="ml-auto font-mono text-xs font-semibold text-ink-400">
              {visitsData.reduce((s, d) => s + d.visits, 0)} visits
            </span>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visitsData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...ttStyle} />
                <Bar dataKey="visits" fill="#8B5CF6" radius={[6, 6, 0, 0]} maxBarSize={38} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard padding="p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-4">Peak Visit Days</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.visitsByDow} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...ttStyle} />
                <Bar dataKey="visits" radius={[6, 6, 0, 0]} maxBarSize={42}>
                  {data.visitsByDow.map((e, i) => {
                    const maxV = Math.max(...data.visitsByDow.map(d => d.visits));
                    return <Cell key={i} fill={e.visits === maxV ? '#10b981' : '#8B5CF6'} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Service Perf + Churn + Inventory + LTV + Source */}
      <GlassCard padding="p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-4">Service Performance (Best → Worst)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.servicePerformance} layout="vertical" margin={{ top: 5, right: 60, bottom: 5, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} axisLine={false} tickLine={false} width={72} />
              <Tooltip formatter={(v, n) => [n === 'bookings' ? v : fmtINR(v), n]} {...ttStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="bookings" name="Bookings" fill="#8B5CF6" radius={[0, 6, 6, 0]} maxBarSize={18} />
              <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[0, 6, 6, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GlassCard padding="p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-4">Churn Risk Distribution</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.churnRisk} dataKey="count" nameKey="risk"
                  cx="50%" cy="50%" outerRadius={88} innerRadius={46} paddingAngle={4}
                  label={({ risk, percent }) => `${risk} ${(percent * 100).toFixed(0)}%`} labelLine>
                  {data.churnRisk.map((e, i) => <Cell key={i} fill={RISK_COLORS[e.risk] || PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={v => [v, 'Customers']} {...ttStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            {data.churnRisk.map((e, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: RISK_COLORS[e.risk] || PIE_COLORS[i] }} />
                <span className="text-xs font-semibold text-ink-500">{e.risk}: <span className="text-ink-900">{e.count}</span></span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard padding="p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-4">Booking Source Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.bookingSource} dataKey="count" nameKey="source"
                  cx="50%" cy="50%" outerRadius={84} innerRadius={38} paddingAngle={3}
                  label={({ source, percent }) => percent > 0.06 ? `${source.replace('_', ' ')} ${(percent * 100).toFixed(0)}%` : ''}>
                  {data.bookingSource.map((_, i) => <Cell key={i} fill={SRC_COLORS[i % SRC_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n.replace('_', ' ')]} {...ttStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GlassCard padding="p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-4">Top Customer Lifetime Spend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topCustomers} layout="vertical" margin={{ top: 5, right: 50, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tickFormatter={fmtINR} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip formatter={v => fmtINR(v)} {...ttStyle} />
                <Bar dataKey="totalSpend" name="Total Spend" fill="#8B5CF6" radius={[0, 6, 6, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard padding="p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-4">Monthly Revenue Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueByMonth} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtINR} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={v => fmtINR(v)} {...ttStyle} />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={42}>
                  {data.revenueByMonth.map((e, i) => (
                    <Cell key={i} fill={e.isPredicted ? '#E8ECF4' : '#EC4899'}
                      stroke={e.isPredicted ? '#EC4899' : 'none'} strokeDasharray={e.isPredicted ? '4 4' : '0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-4 p-5 rounded-xl bg-aurora-purple/5 border border-aurora-purple/10">
        <Package className="w-5 h-5 text-aurora-purple shrink-0" />
        <p className="text-xs text-ink-600 font-medium leading-relaxed">
          <strong>Demand Intelligence Active</strong> — Historical trends from MongoDB. Future predictions powered by real-time XGBoost forecasting model.
        </p>
      </div>
    </div>
  );
}
