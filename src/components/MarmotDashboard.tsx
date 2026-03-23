import { Activity, BarChart3, DollarSign, TrendingDown } from 'lucide-react';
import { ReactNode, useMemo } from 'react';
import { calculateMaxDrawdown, calculateSharpeRatio } from '../utils/quantEngine.ts';

export interface MarmotDashboardProps {
  pnlHistory: number[];
  trades: any[];
}

function formatValue(value: number, digits = 2): string {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function Sparkline({ values }: { values: number[] }): ReactNode {
  if (!Array.isArray(values) || values.length === 0) {
    return (
      <svg viewBox="0 0 120 26" className="mt-2 h-6 w-full opacity-40" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" y1="13" x2="120" y2="13" stroke="rgba(226,232,240,0.2)" strokeWidth="1" />
      </svg>
    );
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i];
    if (!Number.isFinite(v)) {
      continue;
    }
    if (v < min) min = v;
    if (v > max) max = v;
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 0;
  }

  const span = Math.max(max - min, 1);
  const width = 120;
  const height = 26;
  const denominator = Math.max(values.length - 1, 1);

  let points = '';
  for (let i = 0; i < values.length; i += 1) {
    const raw = Number.isFinite(values[i]) ? values[i] : min;
    const x = (i / denominator) * width;
    const y = height - ((raw - min) / span) * height;
    points += `${x},${y} `;
  }

  const trendUp = values[values.length - 1] >= values[0];

  return (
    <svg viewBox="0 0 120 26" className="mt-2 h-6 w-full" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        fill="none"
        stroke={trendUp ? '#34D399' : '#FB7185'}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.trim()}
      />
    </svg>
  );
}

function StatCard({
  title,
  icon,
  value,
  valueClassName,
  pnlHistory,
}: {
  title: string;
  icon: ReactNode;
  value: string;
  valueClassName?: string;
  pnlHistory: number[];
}): ReactNode {
  return (
    <article className="relative rounded-md bg-marmot-surface p-4">
      <div className="absolute left-0 top-0 h-full w-1 rounded-l-md bg-marmot-orange" />
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-wide text-slate-400">{title}</div>
        <div className="text-marmot-orange">{icon}</div>
      </div>
      <div className={`mt-2 text-2xl font-semibold ${valueClassName ?? 'text-marmot-text'}`}>{value}</div>
      <Sparkline values={pnlHistory} />
    </article>
  );
}

export function MarmotDashboard({ pnlHistory, trades }: MarmotDashboardProps): ReactNode {
  const { totalPnl, sharpeRatio, maxDrawdown, tradeCount } = useMemo(() => {
    let pnl = 0;
    for (let i = 0; i < pnlHistory.length; i += 1) {
      const value = pnlHistory[i];
      if (Number.isFinite(value)) {
        pnl = value;
      }
    }

    return {
      totalPnl: pnl,
      sharpeRatio: calculateSharpeRatio(pnlHistory),
      maxDrawdown: calculateMaxDrawdown(pnlHistory),
      tradeCount: Array.isArray(trades) ? trades.length : 0,
    };
  }, [pnlHistory, trades]);

  const pnlColor = totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400';
  const sharpeColor = sharpeRatio >= 0 ? 'text-emerald-400' : 'text-rose-400';

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Total PnL"
        icon={<DollarSign size={18} />}
        value={formatValue(totalPnl, 2)}
        valueClassName={pnlColor}
        pnlHistory={pnlHistory}
      />
      <StatCard
        title="Sharpe Ratio"
        icon={<BarChart3 size={18} />}
        value={formatValue(sharpeRatio, 2)}
        valueClassName={sharpeColor}
        pnlHistory={pnlHistory}
      />
      <StatCard
        title="Max Drawdown"
        icon={<TrendingDown size={18} />}
        value={formatValue(maxDrawdown, 2)}
        pnlHistory={pnlHistory}
      />
      <StatCard
        title="Trade Count"
        icon={<Activity size={18} />}
        value={formatValue(tradeCount, 0)}
        pnlHistory={pnlHistory}
      />
    </section>
  );
}
