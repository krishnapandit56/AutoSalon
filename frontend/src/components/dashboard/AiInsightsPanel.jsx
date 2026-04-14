import InsightCard from '../ui/InsightCard';

export default function AiInsightsPanel({ data }) {
  if (!data) return null;

  const insights = [];

  // Scheduling insight
  if (data.visitsByDow) {
    const peakDay = data.visitsByDow.reduce((a, b) => a.visits > b.visits ? a : b, { visits: 0 });
    insights.push({
      icon: '📅',
      title: 'Peak Day Alert',
      description: `${peakDay.day} sees the highest foot traffic with ${peakDay.visits} visits. Consider adding extra staff on ${peakDay.day}s.`,
      variant: 'purple',
      action: 'View Schedule',
    });
  }

  // Revenue opportunity
  if (data.servicePerformance?.length > 0) {
    const topService = data.servicePerformance[0];
    insights.push({
      icon: '💰',
      title: 'Revenue Opportunity',
      description: `${topService.name} is your best performer with ${topService.bookings} bookings. Promote premium tiers to increase average ticket size.`,
      variant: 'gold',
      action: 'View Analytics',
    });
  }

  // Churn alert
  if (data.churnRisk) {
    const highRisk = data.churnRisk.find(r => r.risk === 'High');
    if (highRisk && highRisk.count > 0) {
      insights.push({
        icon: '⚠️',
        title: 'Churn Risk Detected',
        description: `${highRisk.count} customers are at high churn risk. Send personalized re-engagement offers within the next 48 hours.`,
        variant: 'pink',
        action: 'View Customers',
      });
    }
  }

  // Inventory alert
  if (data.inventory) {
    const lowStock = data.inventory.filter(i => i.quantity < 5);
    if (lowStock.length > 0) {
      insights.push({
        icon: '📦',
        title: 'Inventory Critical',
        description: `${lowStock.length} item${lowStock.length > 1 ? 's' : ''} below minimum stock level: ${lowStock.map(i => i.name).join(', ')}. Restock immediately.`,
        variant: 'cyan',
        action: 'Manage Stock',
      });
    }
  }

  // Demand forecast
  if (data.demandForecast?.dominant_demand) {
    insights.push({
      icon: '🔮',
      title: 'Demand Forecast',
      description: `AI predicts ${data.demandForecast.dominant_demand} demand for upcoming period. ${
        data.demandForecast.dominant_demand === 'High'
          ? 'Prepare inventory and schedule extra staff shifts.'
          : 'Launch promotional campaigns to boost bookings.'
      }`,
      variant: 'purple',
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🧠</span>
        <h3 className="text-xs font-bold uppercase tracking-widest text-ink-400">AI Insights</h3>
        <span className="ml-auto badge bg-aurora-purple/10 text-aurora-purple border border-aurora-purple/20 text-[9px]">
          Live
        </span>
      </div>
      {insights.map((insight, i) => (
        <InsightCard
          key={i}
          icon={insight.icon}
          title={insight.title}
          description={insight.description}
          variant={insight.variant}
          action={insight.action}
          delay={i * 0.1}
        />
      ))}
    </div>
  );
}
