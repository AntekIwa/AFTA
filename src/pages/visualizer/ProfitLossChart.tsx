import Highcharts from 'highcharts';
import { memo, ReactNode, useMemo } from 'react';
import { StrategySession } from '../../models.ts';
import { useStore } from '../../store.ts';
import { Chart } from './Chart.tsx';

export interface ProfitLossChartProps {
  symbols: string[];
  strategySessions?: StrategySession[];
  visibleStrategySessionIds?: string[];
}

export const ProfitLossChart = memo(function ProfitLossChart({
  symbols,
  strategySessions = [],
  visibleStrategySessionIds = [],
}: ProfitLossChartProps): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;

  const series = useMemo((): Highcharts.SeriesOptionsType[] => {
    const visibleSessions = strategySessions.filter(session => visibleStrategySessionIds.includes(session.id));
    if (visibleSessions.length > 0) {
      return visibleSessions.map((session, index) => {
        const dataByTimestamp = new Map<number, number>();
        for (let i = 0; i < session.algorithm.activityLogs.length; i += 1) {
          const row = session.algorithm.activityLogs[i];
          if (!dataByTimestamp.has(row.timestamp)) {
            dataByTimestamp.set(row.timestamp, row.profitLoss);
          } else {
            dataByTimestamp.set(row.timestamp, dataByTimestamp.get(row.timestamp)! + row.profitLoss);
          }
        }

        return {
          type: 'line',
          name: session.name,
          data: [...dataByTimestamp.keys()].map(timestamp => [timestamp, dataByTimestamp.get(timestamp)]),
          lineWidth: index === 0 ? 2.5 : 1.8,
        } satisfies Highcharts.SeriesLineOptions;
      });
    }

    const dataByTimestamp = new Map<number, number>();
    for (let i = 0; i < algorithm.activityLogs.length; i += 1) {
      const row = algorithm.activityLogs[i];
      if (!dataByTimestamp.has(row.timestamp)) {
        dataByTimestamp.set(row.timestamp, row.profitLoss);
      } else {
        dataByTimestamp.set(row.timestamp, dataByTimestamp.get(row.timestamp)! + row.profitLoss);
      }
    }

    const nextSeries: Highcharts.SeriesOptionsType[] = [
      {
        type: 'line',
        name: 'Total',
        data: [...dataByTimestamp.keys()].map(timestamp => [timestamp, dataByTimestamp.get(timestamp)]),
      },
    ];

    symbols.forEach(symbol => {
      const data = [];

      for (let i = 0; i < algorithm.activityLogs.length; i += 1) {
        const row = algorithm.activityLogs[i];
        if (row.product === symbol) {
          data.push([row.timestamp, row.profitLoss]);
        }
      }

      nextSeries.push({
        type: 'line',
        name: symbol,
        data,
        dashStyle: 'Dash',
      });
    });

    return nextSeries;
  }, [algorithm.activityLogs, symbols, strategySessions, visibleStrategySessionIds]);

  return <Chart title="Profit / Loss" series={series} />;
});
