import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles, Zap, Users, Package, TrendingUp } from 'lucide-react';

const quickActions = [
  { icon: TrendingUp, label: "Today's Revenue", key: 'revenue' },
  { icon: Package,    label: 'Low Stock Items',  key: 'stock' },
  { icon: Users,      label: 'At Risk Customers', key: 'churn' },
  { icon: Zap,        label: 'Top Services',     key: 'services' },
];

const responses = {
  revenue: "📊 Today's projected revenue is based on current bookings. Check the Dashboard KPIs for the latest numbers — including AI-powered demand forecasting predictions.",
  stock: "📦 Check the Inventory page for real-time stock levels. Items below 5 units are flagged as 'Critical' — these need immediate reorder attention.",
  churn: "⚠️ Navigate to the Customers page to see the churn risk segmentation. High-risk customers haven't visited in 60+ days and should be targeted with retention offers.",
  services: "✨ The Analytics page shows service performance ranked by booking count and revenue. Keratin and Facial services typically generate the highest margins.",
};

export default function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi! I'm your AI salon assistant. Ask me about revenue, customers, inventory, or quick analytics." }
  ]);
  const [input, setInput] = useState('');

  const handleQuickAction = (key) => {
    setMessages(m => [
      ...m,
      { role: 'user', text: quickActions.find(a => a.key === key)?.label },
      { role: 'assistant', text: responses[key] }
    ]);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');

    // Simple keyword matching for demo
    let reply = "I can help with revenue analytics, stock levels, customer retention, and service performance. Try the quick action buttons below!";

    const lower = userMsg.toLowerCase();
    if (lower.includes('revenue') || lower.includes('sales') || lower.includes('money')) {
      reply = responses.revenue;
    } else if (lower.includes('stock') || lower.includes('inventory') || lower.includes('product')) {
      reply = responses.stock;
    } else if (lower.includes('churn') || lower.includes('risk') || lower.includes('customer')) {
      reply = responses.churn;
    } else if (lower.includes('service') || lower.includes('popular') || lower.includes('top')) {
      reply = responses.services;
    } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      reply = "Hey there! 👋 How can I help you manage your salon today?";
    }

    setMessages(m => [...m, { role: 'user', text: userMsg }, { role: 'assistant', text: reply }]);
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-aurora-purple to-aurora-indigo text-white shadow-glow-purple flex items-center justify-center z-50 group"
          >
            <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 right-6 w-[380px] h-[520px] bg-white/90 backdrop-blur-2xl rounded-2xl shadow-float border border-white/60 flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100/40 bg-gradient-to-r from-aurora-purple/5 to-aurora-cyan/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-aurora-purple to-aurora-indigo flex items-center justify-center shadow-sm">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-ink-900">AI Assistant</p>
                  <p className="text-[10px] font-semibold text-aurora-purple uppercase tracking-widest">Online — AutoSalon</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-aurora-purple to-aurora-indigo text-white rounded-br-md'
                      : 'bg-surface-2 text-ink-700 rounded-bl-md border border-ink-100/40'
                  }`}>
                    {msg.text}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="px-4 pb-2 flex gap-1.5 flex-wrap">
              {quickActions.map(action => (
                <button
                  key={action.key}
                  onClick={() => handleQuickAction(action.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-aurora-purple bg-aurora-purple/5 border border-aurora-purple/15 hover:bg-aurora-purple/10 transition-all"
                >
                  <action.icon className="w-3 h-3" />
                  {action.label}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="px-4 pb-4 pt-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Ask anything…"
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-surface-2 border border-ink-200/50 focus:border-aurora-purple/40 focus:ring-2 focus:ring-aurora-purple/10 outline-none transition-all"
                />
                <button
                  onClick={handleSend}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-aurora-purple to-aurora-indigo text-white flex items-center justify-center hover:shadow-glow-purple transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
