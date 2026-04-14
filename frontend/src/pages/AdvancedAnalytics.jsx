import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  TrendingUp, Users, Star,
  Activity, Package, Zap, AlertTriangle
} from 'lucide-react';

// ── Palette ──────────────────────────────────────────────────────────────────
const RISK_COLORS  = { Low: '#10b981', 'Low-Medium': '#06b6d4', Medium: '#f59e0b', High: '#ef4444' };
const PIE_COLORS   = ['#6366f1','#f43f5e','#10b981','#f59e0b','#a855f7','#06b6d4','#ec4899','#f97316'];
const SRC_COLORS   = ['#6366f1','#f43f5e','#10b981','#f59e0b','#a855f7','#06b6d4','#ec4899'];

const fmtINR = v =>
  v >= 100000 ? `₹${(v/100000).toFixed(1)}L`
  : v >= 1000 ? `₹${(v/1000).toFixed(1)}K`
  : `₹${Math.round(v)}`;

const ttStyle = {
  contentStyle: { borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: 12, fontFamily: 'Inter' },
  itemStyle: { fontWeight: 600 },
};

// ── Primitives ────────────────────────────────────────────────────────────────
const Card = ({ title, sub, children, className = '' }) => (
  <div className={`glass-card p-6 ${className}`}>
    {title && (
      <div className="mb-5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-ink-400">{title}</h3>
        {sub && <p className="text-ink-400 text-xs mt-0.5 font-medium">{sub}</p>}
      </div>
    )}
    {children}
  </div>
);

const KpiCard = ({ icon: Icon, label, value, sub, accent = 'indigo' }) => {
  const map = {
    indigo: 'bg-accent-50 text-accent-600 border-accent-100',
    rose:   'bg-red-50   text-red-500   border-red-100',
    emerald:'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber:  'bg-amber-50  text-amber-600  border-amber-100',
  };
  return (
    <div className="card p-5 flex gap-4 items-start">
      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${map[accent]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-400 mb-1">{label}</p>
        <p className="text-2xl font-display font-semibold text-ink-900 truncate leading-tight">{value}</p>
        {sub && <p className="text-xs text-ink-400 mt-0.5 font-medium">{sub}</p>}
      </div>
    </div>
  );
};

const REV_FILTERS = { Day: 'revenueByDay', Week: 'revenueByWeek', Month: 'revenueByMonth' };
const MONTH_OPTS  = ['All','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function AdvancedAnalytics() {
  const navigate  = useNavigate();
  const token     = localStorage.getItem('adminToken');
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [revFilter, setRevFilter] = useState('Day');
  const [visMonth,  setVisMonth]  = useState('All');

  useEffect(() => {
    if (!token) { navigate('/admin/login'); return; }
    fetch('http://localhost:5000/api/mongo-analytics', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (r.status === 401) { localStorage.removeItem('adminToken'); navigate('/admin/login'); return null; }
        if (!r.ok) throw new Error(`Server responded with ${r.status}`);
        return r.json();
      })
      .then(d => { if (d) setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, navigate]);

  if (!token) return null;

  const revenueData    = data ? data[REV_FILTERS[revFilter]] : [];
  const visitsData     = data ? (visMonth === 'All' ? data.visitsByMonth : data.visitsByMonth.filter(v => v.month === visMonth)) : [];
  const revFilterTotal = revenueData.reduce((s, d) => s + (d.revenue || 0), 0);

  const FilterPills = ({ options, active, onChange }) => (
    <div className="flex gap-1.5">
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)}
          className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide transition-all border ${
            active === o
              ? 'bg-ink-900 text-white border-ink-900 shadow-sm'
              : 'text-ink-400 border-ink-200 hover:border-ink-400 hover:text-ink-700 bg-white'
          }`}>{o}</button>
      ))}
    </div>
  );

  return (
    <div className="pb-10">
      <div className="max-w-[1400px] mx-auto space-y-8">

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-ink-900 tracking-tight">Advanced Analytics</h1>
            <p className="text-sm text-ink-400 mt-1">CSV dataset analysis · 8,000 customer records</p>
          </div>
          <span className="badge bg-aurora-purple/10 text-aurora-purple border border-aurora-purple/20">
            <Activity className="w-3 h-3" /> Live Data
          </span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="spinner w-10 h-10" />
            <p className="text-sm font-medium text-ink-400 uppercase tracking-widest">Loading MongoDB data…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-3 p-5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </motion.div>
        )}

        {data && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }} className="space-y-8">

            {/* KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-accent-50 border border-accent-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-accent-600" />
                  </div>
                  <FilterPills options={Object.keys(REV_FILTERS)} active={revFilter} onChange={setRevFilter} />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-400 mb-1">Revenue ({revFilter})</p>
                <p className="text-2xl font-display font-semibold text-ink-900">{fmtINR(revFilterTotal)}</p>
                <p className="text-xs text-ink-400 mt-1 font-medium">From MongoDB records</p>
              </div>
              <KpiCard icon={Users}  label="Total Bookings" value={data.totalBookings.toLocaleString()} sub="Lifetime salon records" accent="rose" />
              <KpiCard icon={Star}   label="Top Service"    value={data.servicePerformance[0]?.name || '—'} sub={`${data.servicePerformance[0]?.bookings || 0} bookings`} accent="amber" />
            </div>

            {/* Revenue Trend */}
            <Card
              title={`Revenue Trend · Per ${revFilter}`}
              sub="Solid bars = historical · Dashed = XGBoost forecast"
            >
              <div className="flex gap-2 mb-5">
                <FilterPills options={Object.keys(REV_FILTERS)} active={revFilter} onChange={setRevFilter} />
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData} margin={{ top:5, right:20, bottom:5, left:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                    <XAxis dataKey="label" tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false}/>
                    <YAxis tickFormatter={fmtINR} tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false}/>
                    <Tooltip formatter={(v,_,p) => [fmtINR(v), p.payload.isPredicted ? 'Forecast' : 'Actual']} {...ttStyle}/>
                    <Bar dataKey="revenue" radius={[6,6,0,0]} maxBarSize={42}>
                      {revenueData.map((e,i) => (
                        <Cell key={i} fill={e.isPredicted ? '#e2e8f0' : '#6366f1'}
                          stroke={e.isPredicted ? '#6366f1' : 'none'} strokeDasharray={e.isPredicted ? '4 4' : '0'}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Demand Forecast Section */}
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="h-px flex-1 bg-ink-100" />
                <span className="badge bg-accent-50 text-accent-600 border border-accent-100 flex items-center gap-1.5">
                  <Zap className="w-3 h-3" /> Demand Forecasting
                </span>
                <div className="h-px flex-1 bg-ink-100" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <Card title="Demand Distribution" sub="AI-predicted customer demand tiers">
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={Object.entries(data.demandForecast?.distribution || {}).map(([risk,count]) => ({ risk, count }))}
                          dataKey="count" nameKey="risk" cx="50%" cy="50%"
                          outerRadius={72} innerRadius={38} paddingAngle={4}>
                          {Object.entries(data.demandForecast?.distribution || {}).map(([risk],i) => (
                            <Cell key={i} fill={risk==='High'?'#ef4444':risk==='Medium'?'#f59e0b':'#10b981'}/>
                          ))}
                        </Pie>
                        <Tooltip {...ttStyle}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-5 mt-2">
                    {['Low','Medium','High'].map((r,i) => (
                      <span key={r} className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-500">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: ['#10b981','#f59e0b','#ef4444'][i] }}/>
                        {r}
                      </span>
                    ))}
                  </div>
                </Card>

                <Card title="Forecasting Insights" sub="AI-generated business signals" className="lg:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="p-4 rounded-xl bg-accent-50 border border-accent-100">
                      <p className="text-[10px] font-bold text-accent-500 uppercase tracking-widest mb-2">Trend Signal</p>
                      <p className="text-sm font-semibold text-accent-900 leading-relaxed">
                        Expected <span className="underline underline-offset-2">{data.demandForecast?.dominant_demand} demand</span> for {data.servicePerformance[0]?.name} services.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">High Demand %</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-emerald-800">
                          <span>Predicted</span>
                          <span>{data.demandForecast?.summary['High%']}%</span>
                        </div>
                        <div className="w-full h-2 bg-emerald-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${data.demandForecast?.summary['High%']}%` }}/>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-ink-50 border border-ink-100">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm text-base">💡</div>
                    <p className="text-xs text-ink-500 font-medium leading-relaxed">
                      {data.demandForecast?.dominant_demand === 'High'
                        ? 'Prepare inventory for surge in facial and hair color services.'
                        : 'Launch loyalty campaigns to boost low demand segments.'}
                    </p>
                  </div>
                </Card>
              </div>
            </div>

            {/* Row: Visits + Peak Days */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card title="Customer Visits" sub="Appointment count from MongoDB bookings">
                <div className="flex items-center gap-3 mb-4">
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-400">Month</label>
                  <select value={visMonth} onChange={e => setVisMonth(e.target.value)}
                    className="text-xs font-semibold text-ink-600 border border-ink-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-accent-300">
                    {MONTH_OPTS.map(m => <option key={m}>{m}</option>)}
                  </select>
                  <span className="ml-auto font-mono text-xs font-semibold text-ink-400">
                    {visitsData.reduce((s,d) => s+d.visits, 0)} visits
                  </span>
                </div>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={visitsData} margin={{ top:5, right:10, bottom:5, left:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                      <XAxis dataKey="month" tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false}/>
                      <YAxis tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false}/>
                      <Tooltip {...ttStyle}/>
                      <Bar dataKey="visits" fill="#6366f1" radius={[6,6,0,0]} maxBarSize={38}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Peak Visit Days" sub="Visit distribution by day of week">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.visitsByDow} margin={{ top:5, right:10, bottom:5, left:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                      <XAxis dataKey="day" tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false}/>
                      <YAxis tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false}/>
                      <Tooltip {...ttStyle}/>
                      <Bar dataKey="visits" radius={[6,6,0,0]} maxBarSize={42}>
                        {data.visitsByDow.map((e,i) => {
                          const maxV = Math.max(...data.visitsByDow.map(d => d.visits));
                          return <Cell key={i} fill={e.visits === maxV ? '#10b981' : '#6366f1'}/>;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Service Performance */}
            <Card title="Service Performance (Best → Worst)" sub="Ranked by total bookings from MongoDB">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.servicePerformance} layout="vertical" margin={{ top:5, right:60, bottom:5, left:20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                    <XAxis type="number" tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false}/>
                    <YAxis dataKey="name" type="category" tick={{ fontSize:11, fill:'#334155', fontWeight:600 }} axisLine={false} tickLine={false} width={72}/>
                    <Tooltip formatter={(v,n) => [n==='bookings'?v:fmtINR(v), n]} {...ttStyle}/>
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:11 }}/>
                    <Bar dataKey="bookings" name="Bookings" fill="#6366f1" radius={[0,6,6,0]} maxBarSize={18}/>
                    <Bar dataKey="revenue"  name="Revenue"  fill="#10b981" radius={[0,6,6,0]} maxBarSize={18}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Churn + Inventory */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card title="Churn Risk Distribution" sub="Live from MongoDB churn records">
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.churnRisk} dataKey="count" nameKey="risk"
                        cx="50%" cy="50%" outerRadius={88} innerRadius={46} paddingAngle={4}
                        label={({ risk, percent }) => `${risk} ${(percent*100).toFixed(0)}%`} labelLine>
                        {data.churnRisk.map((e,i) => <Cell key={i} fill={RISK_COLORS[e.risk] || PIE_COLORS[i]}/>)}
                      </Pie>
                      <Tooltip formatter={v => [v,'Customers']} {...ttStyle}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 mt-3">
                  {data.churnRisk.map((e,i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: RISK_COLORS[e.risk] || PIE_COLORS[i] }}/>
                      <span className="text-xs font-semibold text-ink-500">{e.risk}: <span className="text-ink-900">{e.count}</span></span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Inventory Stock Levels" sub="Current product quantities">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.inventory} layout="vertical" margin={{ top:5, right:40, bottom:5, left:10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                      <XAxis type="number" tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false}/>
                      <YAxis dataKey="name" type="category" tick={{ fontSize:11, fill:'#334155', fontWeight:600 }} axisLine={false} tickLine={false} width={80}/>
                      <Tooltip {...ttStyle}/>
                      <Bar dataKey="quantity" name="Stock" radius={[0,6,6,0]} maxBarSize={20}>
                        {data.inventory.map((e,i) => (
                          <Cell key={i} fill={e.quantity<5?'#ef4444':e.quantity<15?'#f59e0b':'#10b981'}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-5 mt-3">
                  {[['#10b981','Healthy ≥15'],['#f59e0b','Low 5–14'],['#ef4444','Critical <5']].map(([c,l]) => (
                    <span key={l} className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-400">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }}/> {l}
                    </span>
                  ))}
                </div>
              </Card>
            </div>

            {/* LTV + Booking Source */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card title="Top Customer Lifetime Spend" sub="Highest-value clients by total spend">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.topCustomers} layout="vertical" margin={{ top:5, right:50, bottom:5, left:10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                      <XAxis type="number" tickFormatter={fmtINR} tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false}/>
                      <YAxis dataKey="name" type="category" tick={{ fontSize:11, fill:'#334155', fontWeight:600 }} axisLine={false} tickLine={false} width={60}/>
                      <Tooltip formatter={v => fmtINR(v)} {...ttStyle}/>
                      <Bar dataKey="totalSpend" name="Total Spend" fill="#a855f7" radius={[0,6,6,0]} maxBarSize={20}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Booking Source Breakdown" sub="How customers find AutoSalon">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.bookingSource} dataKey="count" nameKey="source"
                        cx="50%" cy="50%" outerRadius={84} innerRadius={38} paddingAngle={3}
                        label={({ source, percent }) => percent > 0.06 ? `${source.replace('_',' ')} ${(percent*100).toFixed(0)}%` : ''}>
                        {data.bookingSource.map((_,i) => <Cell key={i} fill={SRC_COLORS[i % SRC_COLORS.length]}/>)}
                      </Pie>
                      <Tooltip formatter={(v,n) => [v, n.replace('_',' ')]} {...ttStyle}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Monthly Revenue */}
            <Card title="Monthly Revenue Trend" sub="Historical data + XGBoost future projections">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.revenueByMonth} margin={{ top:5, right:20, bottom:5, left:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                    <XAxis dataKey="month" tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false}/>
                    <YAxis tickFormatter={fmtINR} tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false}/>
                    <Tooltip formatter={v => fmtINR(v)} {...ttStyle}/>
                    <Bar dataKey="revenue" radius={[6,6,0,0]} maxBarSize={42}>
                      {data.revenueByMonth.map((e,i) => (
                        <Cell key={i} fill={e.isPredicted?'#e2e8f0':'#f43f5e'}
                          stroke={e.isPredicted?'#f43f5e':'none'} strokeDasharray={e.isPredicted?'4 4':'0'}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Footer note */}
            <div className="flex items-center gap-4 p-5 rounded-xl bg-accent-50 border border-accent-100">
              <Package className="w-5 h-5 text-accent-500 shrink-0" />
              <p className="text-xs text-accent-700 font-medium leading-relaxed">
                <strong>Demand Intelligence Active</strong> — Historical trends from MongoDB. Future predictions powered by real-time XGBoost forecasting model.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
