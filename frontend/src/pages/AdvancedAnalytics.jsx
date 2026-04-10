import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// ── colours matching Admin.jsx palette ─────────────────────────────────────────
const RISK_COLORS  = { Low: '#10B981', 'Low-Medium': '#06B6D4', Medium: '#F59E0B', High: '#F43F5E' };
const PIE_COLORS   = ['#6366F1', '#F43F5E', '#10B981', '#F59E0B', '#a855f7', '#06B6D4', '#ec4899', '#f97316'];
const SRC_COLORS   = ['#6366F1', '#F43F5E', '#10B981', '#F59E0B', '#a855f7', '#06B6D4', '#ec4899'];

const fmtINR = v =>
  v >= 1_00_000 ? `₹${(v / 1_00_000).toFixed(1)}L`
  : v >= 1_000  ? `₹${(v / 1_000).toFixed(1)}K`
  : `₹${Math.round(v)}`;

const tooltipStyle = {
  contentStyle: { borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12 },
  itemStyle: { fontWeight: 600 }
};

// ── Reusable card ───────────────────────────────────────────────────────────────
const Card = ({ title, sub, children, className = '' }) => (
  <div className={`bg-white rounded-3xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.06)] border border-gray-50 p-8 ${className}`}>
    {title && (
      <div className="mb-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{title}</h3>
        {sub && <p className="text-gray-400 text-xs mt-1">{sub}</p>}
      </div>
    )}
    {children}
  </div>
);

// ── KPI Card ────────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, sub, accent = 'indigo' }) => {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    rose:   'bg-rose-50   text-rose-600',
    emerald:'bg-emerald-50 text-emerald-600',
    amber:  'bg-amber-50  text-amber-600',
  };
  return (
    <div className="bg-white rounded-3xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.06)] border border-gray-50 p-6 flex gap-5 items-start">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-lg ${colors[accent]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">{label}</p>
        <p className="text-2xl font-black text-gray-900 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

// ── Revenue filter options ──────────────────────────────────────────────────────
const REV_FILTERS = { Day: 'revenueByDay', Week: 'revenueByWeek', Month: 'revenueByMonth' };
const MONTH_OPTS  = ['All','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function AdvancedAnalytics() {
  const navigate = useNavigate();
  const token    = localStorage.getItem('adminToken');

  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [revFilter, setRevFilter] = useState('Day');
  const [visMonth,  setVisMonth]  = useState('All');

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

  // ── Derived data ─────────────────────────────────────────────────────────────
  const revenueData = data ? data[REV_FILTERS[revFilter]] : [];
  const visitsData  = data ? (
    visMonth === 'All' ? data.visitsByMonth
    : data.visitsByMonth.filter(v => v.month === visMonth)
  ) : [];

  // KPI totals
  const revFilterTotal = revenueData.reduce((s, d) => s + (d.revenue || 0), 0);

  if (!token) return null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-10">

      {/* ── Header (identical style to Admin.jsx) ── */}
      <div className="flex items-center justify-between p-8 bg-white rounded-3xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] border border-gray-50">
        <div>
          <h2 className="text-3xl font-light tracking-tight text-gray-900 uppercase">
            Advanced <span className="font-black">Analytics</span>
          </h2>
          <p className="text-gray-400 text-xs uppercase tracking-[0.2em] mt-2">
            Live MongoDB Data · Admin Only
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin')}
            className="px-6 py-2 rounded-full border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all"
          >
            ← Admin Dashboard
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <div className="w-12 h-12 border-4 border-gray-100 border-t-indigo-400 rounded-full animate-spin mb-4" />
          <p className="text-xs uppercase tracking-widest">Loading MongoDB data…</p>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 text-rose-500 text-sm">
          ⚠️ {error}
        </div>
      )}

            {data && <>

        {/* ══════════════════════════════════════════════
            KPI ROW (CLEANED)
        ══════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Total Revenue with filter */}
          <div className="bg-white rounded-3xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.06)] border border-gray-50 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg">💰</div>
              <div className="flex gap-1">
                {Object.keys(REV_FILTERS).map(f => (
                  <button key={f} onClick={() => setRevFilter(f)}
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all
                      ${revFilter === f ? 'bg-indigo-500 text-white' : 'text-gray-400 hover:bg-gray-50'}`}
                  >{f}</button>
                ))}
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Revenue ({revFilter})</p>
            <p className="text-2xl font-black text-gray-900">{fmtINR(revFilterTotal)}</p>
            <p className="text-xs text-gray-400 mt-0.5 font-bold">Past {revFilter} performance from MongoDB</p>
          </div>

          <KpiCard icon="📋" label="Total Bookings" value={data.totalBookings.toLocaleString()} sub="Lifetime Salon Records" accent="rose" />
          <KpiCard icon="⭐" label="Top Service" value={data.servicePerformance[0]?.name || '—'} sub={`${data.servicePerformance[0]?.bookings || 0} bookings`} accent="amber" />
        </div>

        {/* ══════════════════════════════════════════════
            REVENUE TREND (WITH FORECAST OVERLAY)
        ══════════════════════════════════════════════ */}
        <Card
          title={`Revenue Trend & Forecast – Per ${revFilter}`}
          sub="Solid bars show historical data; dashed bars represent XGBoost predictions."
        >
          <div className="flex gap-2 mb-6">
            {Object.keys(REV_FILTERS).map(f => (
              <button key={f} onClick={() => setRevFilter(f)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border
                  ${revFilter === f
                    ? 'bg-indigo-500 text-white border-indigo-500 shadow-[0_4px_12px_rgba(99,102,241,0.3)]'
                    : 'text-gray-400 border-gray-100 hover:border-indigo-100 hover:text-indigo-400'}`}
              >{f}</button>
            ))}
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top:5, right:20, bottom:5, left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false}/>
                <XAxis dataKey="label" tick={{ fontSize:10, fill:'#9ca3af' }} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={fmtINR} tick={{ fontSize:10, fill:'#9ca3af' }} axisLine={false} tickLine={false}/>
                <Tooltip 
                  formatter={(v, _, props) => [fmtINR(v), props.payload.isPredicted ? 'Forecasted Revenue' : 'Actual Revenue']} 
                  {...tooltipStyle}
                />
                <Bar dataKey="revenue" radius={[6,6,0,0]} maxBarSize={45}>
                   {revenueData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.isPredicted ? '#cbd5e1' : '#6366F1'} 
                        stroke={entry.isPredicted ? '#6366F1' : 'none'}
                        strokeDasharray={entry.isPredicted ? "4 4" : "0"}
                      />
                   ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* ══════════════════════════════════════════════
            🔮 NEW: DEMAND FORECASTING & INSIGHTS
        ══════════════════════════════════════════════ */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
             <div className="h-px flex-1 bg-gray-100"></div>
             <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 bg-indigo-50/50 px-4 py-1 rounded-full">
                Demand Forecasting & Insights
             </h4>
             <div className="h-px flex-1 bg-gray-100"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Demand Distribution Chart */}
            <Card title="Customer Demand Tiering" sub="Predicted distribution of your customer base" className="lg:col-span-1">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={Object.entries(data.demandForecast?.distribution || {}).map(([risk, count]) => ({ risk, count }))}
                      dataKey="count" nameKey="risk"
                      cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={4}
                    >
                      {Object.entries(data.demandForecast?.distribution || {}).map(([risk], i) => (
                        <Cell key={i} fill={risk === 'High' ? '#F43F5E' : risk === 'Medium' ? '#F59E0B' : '#10B981'}/>
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 text-[10px] font-bold text-gray-500">
                 <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#10B981]"/>Low</span>
                 <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#F59E0B]"/>Med</span>
                 <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#F43F5E]"/>High</span>
              </div>
            </Card>

            {/* Demand Insights & Indicators */}
            <Card title="Forecasting Insights" sub="AI-generated business recommendations" className="lg:col-span-2">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100">
                     <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Trend Indicator</p>
                     <p className="text-sm font-bold text-indigo-900 leading-relaxed">
                        Expected <span className="text-indigo-600 underline underline-offset-4 decoration-2">{data.demandForecast?.dominant_demand} demand</span> for {data.servicePerformance[0]?.name} and {data.servicePerformance[1]?.name || 'Beauty'} services in the coming period.
                     </p>
                  </div>
                  <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100">
                     <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">KPI Projection</p>
                     <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-emerald-800">
                           <span>High Demand %</span>
                           <span>{data.demandForecast?.summary['High%']}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                           <div className="h-full bg-emerald-500" style={{ width: `${data.demandForecast?.summary['High%']}%` }}></div>
                        </div>
                        <p className="text-[9px] text-emerald-600 font-medium">Optimization potential detected in evening slots.</p>
                     </div>
                  </div>
               </div>
               <div className="mt-5 p-4 rounded-xl border border-gray-100 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-lg">💡</div>
                  <p className="text-xs text-gray-500 italic">
                     "{data.demandForecast?.dominant_demand === 'High' ? 'Prepare inventory for a sudden surge in facial and hair color services.' : 'Focus on active loyalty campaigns to boost low demand segments.'}"
                  </p>
               </div>
            </Card>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            ROW: Customer Visits + Service Performance
        ══════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Customer Visits with month filter */}
          <Card title="Customer Visits" sub="Appointment count from MongoDB bookings">
            <div className="flex items-center gap-3 mb-5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Filter Month:</label>
              <select value={visMonth} onChange={e => setVisMonth(e.target.value)}
                className="text-xs font-bold text-gray-600 border border-gray-100 rounded-xl px-3 py-1.5 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-200"
              >
                {MONTH_OPTS.map(m => <option key={m}>{m}</option>)}
              </select>
              <span className="ml-auto text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {visitsData.reduce((s,d)=>s+d.visits,0)} visits
              </span>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={visitsData} margin={{ top:5, right:10, bottom:5, left:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false}/>
                  <XAxis dataKey="month" tick={{ fontSize:10, fill:'#9ca3af' }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize:10, fill:'#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false}/>
                  <Tooltip {...tooltipStyle}/>
                  <Bar dataKey="visits" name="Visits" fill="#6366F1" radius={[6,6,0,0]} maxBarSize={40}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Day of Week Visits */}
          <Card title="Peak Visit Days" sub="Visits by day of week (all time)">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.visitsByDow} margin={{ top:5, right:10, bottom:5, left:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false}/>
                  <XAxis dataKey="day" tick={{ fontSize:11, fill:'#9ca3af' }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize:10, fill:'#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false}/>
                  <Tooltip {...tooltipStyle}/>
                  <Bar dataKey="visits" name="Visits" radius={[6,6,0,0]} maxBarSize={44}>
                    {data.visitsByDow.map((e, i) => {
                      const maxV = Math.max(...data.visitsByDow.map(d => d.visits));
                      return <Cell key={i} fill={e.visits === maxV ? '#10B981' : '#6366F1'}/>;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════
            SERVICE PERFORMANCE (Best → Worst)
        ══════════════════════════════════════════════ */}
        <Card title="Service Performance (Best → Worst)" sub="Ranked by total bookings from MongoDB">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.servicePerformance} layout="vertical" margin={{ top:5, right:60, bottom:5, left:20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" horizontal={false}/>
                <XAxis type="number" tick={{ fontSize:10, fill:'#9ca3af' }} axisLine={false} tickLine={false}/>
                <YAxis dataKey="name" type="category" tick={{ fontSize:11, fill:'#374151', fontWeight:600 }} axisLine={false} tickLine={false} width={72}/>
                <Tooltip formatter={(v, n) => [n==='bookings' ? v : fmtINR(v), n]} {...tooltipStyle}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:11 }}/>
                <Bar dataKey="bookings" name="Bookings" fill="#6366F1" radius={[0,6,6,0]} maxBarSize={22}/>
                <Bar dataKey="revenue"  name="Revenue"  fill="#10B981" radius={[0,6,6,0]} maxBarSize={22}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* ══════════════════════════════════════════════
            ROW: Churn Risk Pie + Inventory
        ══════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Churn Risk Pie */}
          <Card title="Churn Risk Distribution" sub="Low / Low-Medium / Medium / High from MongoDB churn records">
            <div className="flex items-center justify-center">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.churnRisk} dataKey="count" nameKey="risk"
                      cx="50%" cy="50%" outerRadius={90} innerRadius={48} paddingAngle={4}
                      label={({ risk, percent }) => `${risk} ${(percent*100).toFixed(1)}%`}
                      labelLine={true}
                    >
                      {data.churnRisk.map((entry, i) => (
                        <Cell key={i} fill={RISK_COLORS[entry.risk] || PIE_COLORS[i]}/>
                      ))}
                    </Pie>
                    <Tooltip formatter={v => [v, 'Customers']} {...tooltipStyle}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              {data.churnRisk.map((e,i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: RISK_COLORS[e.risk] || PIE_COLORS[i] }}/>
                  <span className="text-xs font-bold text-gray-600">{e.risk}: <span className="text-gray-900">{e.count}</span></span>
                </div>
              ))}
            </div>
          </Card>

          {/* Inventory Stock Levels */}
          <Card title="Inventory Stock Levels" sub="Current product quantities from MongoDB">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.inventory} layout="vertical" margin={{ top:5, right:40, bottom:5, left:10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" horizontal={false}/>
                  <XAxis type="number" tick={{ fontSize:10, fill:'#9ca3af' }} axisLine={false} tickLine={false}/>
                  <YAxis dataKey="name" type="category" tick={{ fontSize:11, fill:'#374151', fontWeight:600 }} axisLine={false} tickLine={false} width={80}/>
                  <Tooltip {...tooltipStyle}/>
                  <Bar dataKey="quantity" name="Stock" radius={[0,6,6,0]} maxBarSize={22}>
                    {data.inventory.map((e, i) => (
                      <Cell key={i} fill={e.quantity < 5 ? '#F43F5E' : e.quantity < 15 ? '#F59E0B' : '#10B981'}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"/>Healthy ≥15</span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"/>Low 5–14</span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block"/>Critical &lt;5</span>
            </div>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════
            ROW: Top Customers LTV + Booking Source
        ══════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Top Customers LTV */}
          <Card title="Top Customer Lifetime Spend" sub="Highest-value clients from churn records">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topCustomers} layout="vertical" margin={{ top:5, right:50, bottom:5, left:10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" horizontal={false}/>
                  <XAxis type="number" tickFormatter={fmtINR} tick={{ fontSize:10, fill:'#9ca3af' }} axisLine={false} tickLine={false}/>
                  <YAxis dataKey="name" type="category" tick={{ fontSize:11, fill:'#374151', fontWeight:600 }} axisLine={false} tickLine={false} width={60}/>
                  <Tooltip formatter={v => fmtINR(v)} {...tooltipStyle}/>
                  <Bar dataKey="totalSpend" name="Total Spend" fill="#a855f7" radius={[0,6,6,0]} maxBarSize={22}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Booking Source */}
          <Card title="Booking Source Breakdown" sub="How customers reach us (from churn database)">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.bookingSource} dataKey="count" nameKey="source"
                    cx="50%" cy="50%" outerRadius={85} innerRadius={40} paddingAngle={3}
                    label={({ source, percent }) => percent > 0.06 ? `${source.replace('_',' ')} ${(percent*100).toFixed(0)}%` : ''}
                  >
                    {data.bookingSource.map((_, i) => <Cell key={i} fill={SRC_COLORS[i % SRC_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v,n) => [v, n.replace('_',' ')]} {...tooltipStyle}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════
            Monthly Revenue Bar (Fixed Overlay)
        ══════════════════════════════════════════════ */}
        <Card title="Monthly Revenue Trend" sub="Redistributed historical data + Future Projections (XGBoost)">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueByMonth} margin={{ top:5, right:20, bottom:5, left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false}/>
                <XAxis dataKey="month" tick={{ fontSize:10, fill:'#9ca3af' }} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={fmtINR} tick={{ fontSize:10, fill:'#9ca3af' }} axisLine={false} tickLine={false}/>
                <Tooltip formatter={v => fmtINR(v)} {...tooltipStyle}/>
                <Bar dataKey="revenue" radius={[6,6,0,0]} maxBarSize={45}>
                   {data.revenueByMonth.map((entry, index) => (
                      <Cell 
                        key={`cell-m-${index}`} 
                        fill={entry.isPredicted ? '#cbd5e1' : '#F43F5E'} 
                        stroke={entry.isPredicted ? '#F43F5E' : 'none'}
                        strokeDasharray={entry.isPredicted ? "4 4" : "0"}
                      />
                   ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* ── Footnote ── */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-3xl px-8 py-5 flex items-center gap-4">
          <span className="text-2xl">📡</span>
          <p className="text-xs text-indigo-700">
            <strong>Demand Intelligence Active</strong> — Historical trends are derived from distributed MongoDB records. Future bars and demand insights are powered by your real-time XGBoost forecasting model.
          </p>
        </div>
      </>}
    </div>
  );
}
