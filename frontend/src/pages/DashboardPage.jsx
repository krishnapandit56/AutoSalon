import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp, Users, Star, DollarSign, Calendar, ArrowUpRight,
  Activity, Zap, Filter
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import KpiCard from '../components/ui/KpiCard';
import GlassCard from '../components/ui/GlassCard';
import AiInsightsPanel from '../components/dashboard/AiInsightsPanel';
import Badge from '../components/ui/Badge';
import PageLoader from '../components/ui/PageLoader';
import { fetchAnalytics, fetchBookings } from '../lib/apiCache';

const fmtINR = v =>
  v >= 100000 ? `₹${(v / 100000).toFixed(1)}L`
    : v >= 1000 ? `₹${(v / 1000).toFixed(1)}K`
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
const KPI_PERIODS = ['All Time', 'Today', 'This Week', 'This Month'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');
  const [data, setData] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revFilter, setRevFilter] = useState('Day');
  const [kpiPeriod, setKpiPeriod] = useState('All Time');

  useEffect(() => {
    if (!token) return;

    Promise.all([
      fetchAnalytics(token).catch(() => null),
      fetchBookings(token).catch(() => []),
    ])
      .then(([analytics, bks]) => {
        setData(analytics);
        setBookings(bks);
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <PageLoader label="Building your dashboard…" />;

  const revenueData = data ? data[REV_FILTERS[revFilter]] : [];

  // Filter bookings by selected KPI period
  const filterByPeriod = (items) => {
    if (kpiPeriod === 'All Time') return items;
    const now = new Date();
    return items.filter(b => {
      const d = new Date(b.createdAt);
      if (kpiPeriod === 'Today') return d.toDateString() === now.toDateString();
      if (kpiPeriod === 'This Week') {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        return d >= weekStart;
      }
      if (kpiPeriod === 'This Month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return true;
    });
  };

  const periodBookings = filterByPeriod(bookings);
  const todayBookings = bookings.filter(b => new Date(b.createdAt).toDateString() === new Date().toDateString());

  // KPI values based on period
  const getKpiRevenue = () => {
    if (kpiPeriod === 'All Time') return data?.totalRevenue || 0;
    // Estimate from filtered bookings count * avg spend
    const avgSpend = data?.totalRevenue && data?.totalBookings ? data.totalRevenue / data.totalBookings : 1200;
    return Math.round(periodBookings.length * avgSpend);
  };

  const getKpiBookings = () => {
    if (kpiPeriod === 'All Time') return data?.totalBookings || 0;
    return periodBookings.length;
  };

  const churnHighCount = data?.churnRisk?.find(r => r.risk === 'High')?.count || 0;

  // Trend percentages (mock — calculated relative to period)
  const getTrend = (base) => {
    if (kpiPeriod === 'Today') return { text: 'vs yesterday', up: true };
    if (kpiPeriod === 'This Week') return { text: '+12% vs last week', up: true };
    if (kpiPeriod === 'This Month') return { text: '+8% vs last month', up: true };
    return { text: '+15% overall', up: true };
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Welcome + Period Filter */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-ink-900 tracking-tight">
            Welcome back, <span className="gradient-text">Admin</span>
          </h1>
          <p className="text-sm text-ink-400 mt-1">Here's what's happening at your salon today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-ink-400" />
          <div className="flex gap-1">
            {KPI_PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setKpiPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all border ${kpiPeriod === p
                  ? 'bg-aurora-purple text-white border-aurora-purple shadow-glow-purple'
                  : 'text-ink-400 border-ink-200 hover:border-ink-400 hover:text-ink-700 bg-white'
                  }`}
              >
                {p}
              </button>
            ))}
          </div>
          <Badge variant="purple" dot><Activity className="w-3 h-3" /> Live</Badge>
        </div>
      </motion.div>

      {/* KPI Row — Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={DollarSign}
          label="Revenue"
          numericValue={getKpiRevenue()}
          prefix="₹"
          sub={kpiPeriod === 'All Time' ? 'Lifetime earnings' : kpiPeriod}
          trend={getTrend().text}
          trendUp={getTrend().up}
          accent="purple"
          delay={0}
        />
        <KpiCard
          icon={Calendar}
          label="Bookings"
          numericValue={getKpiBookings()}
          sub={kpiPeriod === 'All Time' ? `${todayBookings.length} today` : `of ${data?.totalBookings || 0} total`}
          trend={kpiPeriod === 'Today' ? `${todayBookings.length} scheduled` : '+8.2%'}
          trendUp
          accent="cyan"
          delay={0.05}
        />
        <KpiCard
          icon={Users}
          label="At-Risk Customers"
          numericValue={churnHighCount}
          sub="High churn risk"
          accent="pink"
          delay={0.1}
        />
        <KpiCard
          icon={Star}
          label="Top Service"
          value={data?.servicePerformance?.[0]?.name || '—'}
          sub={`${data?.servicePerformance?.[0]?.bookings || 0} bookings`}
          accent="gold"
          delay={0.15}
        />
      </div>

      {/* Main Content — Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Revenue Chart — 8 cols */}
        <GlassCard className="lg:col-span-8" padding="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-ink-400">Revenue Trend</h3>
              <p className="text-[11px] text-ink-400 mt-0.5">Solid = actual · Dashed = AI forecast</p>
            </div>
            <div className="flex gap-1.5">
              {Object.keys(REV_FILTERS).map(f => (
                <button
                  key={f}
                  onClick={() => setRevFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all border ${revFilter === f
                    ? 'bg-aurora-purple text-white border-aurora-purple shadow-glow-purple'
                    : 'text-ink-400 border-ink-200 hover:border-ink-400 hover:text-ink-700 bg-white'
                    }`}
                >
                  {f}
                </button>
              ))}
            </div>
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
                      stroke={e.isPredicted ? '#8B5CF6' : 'none'}
                      strokeDasharray={e.isPredicted ? '4 4' : '0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Today's Appointments — 4 cols */}
        <GlassCard className="lg:col-span-4" padding="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-ink-400">Today's Bookings</h3>
            <button
              onClick={() => navigate('/admin/appointments')}
              className="text-[10px] font-bold uppercase tracking-widest text-aurora-purple hover:text-aurora-indigo flex items-center gap-1 transition-colors"
            >
              View All <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {todayBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-ink-300">
                <Calendar className="w-8 h-8 mb-3 opacity-40" />
                <p className="text-xs uppercase tracking-widest font-medium">No bookings today</p>
              </div>
            ) : (
              todayBookings.slice(0, 8).map((b, i) => (
                <motion.div
                  key={b._id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-surface-2/50 hover:bg-aurora-purple/[0.03] transition-all"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink-800 truncate">{b.customerName}</p>
                    <p className="text-[10px] text-ink-400 font-medium">{b.service}</p>
                  </div>
                  <Badge variant={b.slotId ? 'success' : 'neutral'}>
                    {b.slotId?.time || 'N/A'}
                  </Badge>
                </motion.div>
              ))
            )}
          </div>
        </GlassCard>

        {/* AI Insights — 5 cols */}
        <div className="lg:col-span-5">
          <GlassCard padding="p-6">
            <AiInsightsPanel data={data} />
          </GlassCard>
        </div>

        {/* Service Performance Donut — 3 cols */}
        <GlassCard className="lg:col-span-3" padding="p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-4">Service Mix</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.servicePerformance?.slice(0, 6) || []}
                  dataKey="bookings"
                  nameKey="name"
                  cx="50%" cy="50%"
                  outerRadius={72} innerRadius={40}
                  paddingAngle={3}
                >
                  {(data?.servicePerformance?.slice(0, 6) || []).map((_, i) => (
                    <Cell key={i} fill={['#8B5CF6', '#06B6D4', '#EC4899', '#F59E0B', '#10b981', '#6366f1'][i]} />
                  ))}
                </Pie>
                <Tooltip {...ttStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {(data?.servicePerformance?.slice(0, 4) || []).map((s, i) => (
              <span key={i} className="flex items-center gap-1.5 text-[10px] font-semibold text-ink-500">
                <span className="w-2 h-2 rounded-full" style={{ background: ['#8B5CF6', '#06B6D4', '#EC4899', '#F59E0B'][i] }} />
                {s.name}
              </span>
            ))}
          </div>
        </GlassCard>

        {/* Demand Forecast — 4 cols */}
        {data?.demandForecast && (
          <GlassCard className="lg:col-span-4" padding="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-aurora-gold" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-ink-400">Demand Forecast</h3>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-r from-aurora-purple/5 to-aurora-cyan/5 border border-aurora-purple/10 mb-4">
              <p className="text-[10px] font-bold text-aurora-purple uppercase tracking-widest mb-2">AI Prediction</p>
              <p className="text-sm font-bold text-ink-800">
                Expected <span className="gradient-text">{data.demandForecast.dominant_demand}</span> demand
              </p>
              <p className="text-xs text-ink-500 mt-1">
                {data.demandForecast.dominant_demand === 'High'
                  ? 'Prepare for surge — add staff and restock inventory.'
                  : 'Consider promotional campaigns to boost traffic.'}
              </p>
            </div>
            <div className="space-y-3">
              {['High', 'Medium', 'Low'].map((level, i) => {
                const pct = data.demandForecast.summary?.[`${level}%`] || 0;
                const colors = ['bg-aurora-rose', 'bg-aurora-gold', 'bg-emerald-500'];
                return (
                  <div key={level}>
                    <div className="flex justify-between text-[11px] font-bold text-ink-600 mb-1">
                      <span>{level} Demand</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-ink-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1, delay: 0.3 + i * 0.15, ease: 'easeOut' }}
                        className={`h-full rounded-full ${colors[i]}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
