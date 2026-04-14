import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Plus, AlertTriangle, CheckCircle, Trash2,
  Minus, X, TrendingDown, ShoppingCart
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import GlassCard from '../components/ui/GlassCard';
import Badge from '../components/ui/Badge';
import KpiCard from '../components/ui/KpiCard';
import GradientButton from '../components/ui/GradientButton';
import InsightCard from '../components/ui/InsightCard';
import PageLoader from '../components/ui/PageLoader';

const ttStyle = {
  contentStyle: {
    borderRadius: 12, border: '1px solid #e2e8f0',
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: 12,
    fontFamily: 'Inter', background: 'rgba(255,255,255,0.95)',
  },
};

export default function InventoryPage() {
  const token = localStorage.getItem('adminToken');
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ name: '', quantity: '' });
  const [formError, setFormError] = useState('');

  const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  });

  const fetchInventory = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/inventory', { headers: headers() });
      if (res.ok) setInventory(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    if (token) fetchInventory();
  }, [token]);

  const addItem = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) { setFormError('Item name is required.'); return; }
    if (!form.quantity || Number(form.quantity) < 0) { setFormError('Enter a valid quantity.'); return; }

    await fetch('http://localhost:5000/api/inventory', {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ name: form.name.trim(), quantity: Number(form.quantity) })
    });
    setForm({ name: '', quantity: '' });
    setShowAddModal(false);
    fetchInventory();
  };

  const updateQty = async (id, qty) => {
    if (qty < 0) return;
    await fetch(`http://localhost:5000/api/inventory/${id}`, {
      method: 'PUT', headers: headers(),
      body: JSON.stringify({ quantity: qty })
    });
    fetchInventory();
  };

  const deleteItem = async (id) => {
    await fetch(`http://localhost:5000/api/inventory/${id}`, {
      method: 'DELETE', headers: headers()
    });
    fetchInventory();
  };

  const criticalItems = inventory.filter(i => i.quantity < 5);
  const lowItems = inventory.filter(i => i.quantity >= 5 && i.quantity < 15);
  const healthyItems = inventory.filter(i => i.quantity >= 15);
  const totalItems = inventory.reduce((s, i) => s + i.quantity, 0);

  const getStatusColor = (qty) =>
    qty < 5 ? 'danger' : qty < 15 ? 'warning' : 'success';
  const getStatusLabel = (qty) =>
    qty < 5 ? 'Critical' : qty < 15 ? 'Low' : 'Healthy';

  if (loading) return <PageLoader label="Loading Inventory…" />;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-ink-900 tracking-tight">Inventory Management</h1>
          <p className="text-sm text-ink-400 mt-1">Track stock levels and manage salon supplies.</p>
        </div>
        <GradientButton icon={Plus} onClick={() => setShowAddModal(true)}>
          Add Item
        </GradientButton>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Package} label="Total Items" numericValue={inventory.length} sub={`${totalItems} units total`} accent="purple" delay={0} />
        <KpiCard icon={CheckCircle} label="Healthy Stock" numericValue={healthyItems.length} sub="≥ 15 units" accent="emerald" delay={0.05} />
        <KpiCard icon={TrendingDown} label="Low Stock" numericValue={lowItems.length} sub="5–14 units" accent="gold" delay={0.1} />
        <KpiCard icon={AlertTriangle} label="Critical" numericValue={criticalItems.length} sub="< 5 units" accent="pink" delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Stock Chart — 7 cols */}
        <GlassCard className="lg:col-span-7" padding="p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-4">Stock Levels Overview</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inventory} layout="vertical" margin={{ top: 5, right: 40, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip {...ttStyle} />
                <Bar dataKey="quantity" name="Stock" radius={[0, 8, 8, 0]} maxBarSize={22}>
                  {inventory.map((item, i) => (
                    <Cell key={i} fill={item.quantity < 5 ? '#ef4444' : item.quantity < 15 ? '#f59e0b' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-5 mt-3">
            {[['#10b981', 'Healthy ≥15'], ['#f59e0b', 'Low 5–14'], ['#ef4444', 'Critical <5']].map(([c, l]) => (
              <span key={l} className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} /> {l}
              </span>
            ))}
          </div>
        </GlassCard>

        {/* Alerts — 5 cols */}
        <div className="lg:col-span-5 space-y-4">
          {criticalItems.length > 0 && (
            <GlassCard padding="p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-rose-500">Critical Alerts</h3>
              </div>
              <div className="space-y-2">
                {criticalItems.map(item => (
                  <InsightCard
                    key={item._id}
                    icon="🚨"
                    title={`${item.name} — Only ${item.quantity} left`}
                    description="Restock immediately to avoid service disruptions."
                    variant="pink"
                    action="Restock"
                    onAction={() => updateQty(item._id, item.quantity + 20)}
                  />
                ))}
              </div>
            </GlassCard>
          )}

          {/* AI Suggestion */}
          <GlassCard padding="p-5">
            <InsightCard
              icon="🤖"
              title="Smart Restock Suggestion"
              description={`Based on booking trends, consider ordering more ${inventory[0]?.name || 'supplies'}. Peak days are approaching and demand is expected to rise.`}
              variant="purple"
            />
          </GlassCard>
        </div>
      </div>

      {/* Inventory Grid */}
      <GlassCard padding="p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-5">All Items</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {inventory.map((item, i) => (
            <motion.div
              key={item._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="p-4 rounded-xl bg-surface-2/40 border border-ink-100/40 hover:bg-white hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-ink-800">{item.name}</p>
                  <Badge variant={getStatusColor(item.quantity)} className="mt-1">{getStatusLabel(item.quantity)}</Badge>
                </div>
                <button
                  onClick={() => deleteItem(item._id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-3xl font-display font-bold text-ink-900 mb-3">{item.quantity}</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateQty(item._id, item.quantity - 1)}
                  disabled={item.quantity <= 0}
                  className="w-9 h-9 rounded-lg flex items-center justify-center bg-white border border-ink-200 text-ink-500 hover:bg-ink-100 hover:text-ink-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => updateQty(item._id, item.quantity + 1)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center bg-white border border-ink-200 text-ink-500 hover:bg-ink-100 hover:text-ink-800 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => updateQty(item._id, item.quantity + 10)}
                  className="ml-auto px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide text-aurora-purple bg-aurora-purple/5 border border-aurora-purple/15 hover:bg-aurora-purple/10 transition-all"
                >
                  +10
                </button>
              </div>
            </motion.div>
          ))}
          {inventory.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-ink-300">
              <Package className="w-8 h-8 mb-3 opacity-40" />
              <p className="text-xs uppercase tracking-widest font-medium">No items in inventory</p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink-900/20 backdrop-blur-sm z-50"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
            >
              <div className="bg-white/95 backdrop-blur-2xl rounded-2xl shadow-float border border-ink-100 w-[400px] p-6 space-y-4 pointer-events-auto">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-display font-bold text-ink-900">Add Inventory Item</h2>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {formError && (
                  <div className="text-xs text-rose-500 font-medium bg-rose-50 border border-rose-100 p-3 rounded-xl">{formError}</div>
                )}
                <form onSubmit={addItem} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest text-ink-400 mb-1 block">Item Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Hair Color Tubes"
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest text-ink-400 mb-1 block">Quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={form.quantity}
                      onChange={e => setForm({ ...form, quantity: e.target.value })}
                      placeholder="0"
                      className="field"
                    />
                  </div>
                  <GradientButton type="submit" className="w-full" icon={ShoppingCart}>
                    Add to Inventory
                  </GradientButton>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
