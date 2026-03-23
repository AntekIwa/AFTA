import Highcharts from 'highcharts';
import { memo, ReactNode, useMemo } from 'react';
import { Algorithm, ProsperitySymbol } from '../../models.ts';
import { useStore } from '../../store.ts';
import { Chart } from './Chart.tsx';

function getLimit(algorithm: Algorithm, symbol: ProsperitySymbol): number {
  const knownLimits: Record<string, number> = {
    TOMATOES: 80,
    EMERALDS: 80
  };

  if (knownLimits[symbol] !== undefined) {
    return knownLimits[symbol];
  }

  // This code will be hit when a new product is added to the competition and the visualizer isn't updated yet
  // In that case the visualizer doesn't know the real limit yet, so we make a guess based on the algorithm's positions

  const positions = algorithm.data.map(row => row.state.position[symbol] || 0);
  const minPosition = Math.min(...positions);
  const maxPosition = Math.max(...positions);

  return Math.max(Math.abs(minPosition), maxPosition);
}

export interface PositionChartProps {
  symbols: string[];
}

export const PositionChart = memo(function PositionChart({ symbols }: PositionChartProps): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;

  const series = useMemo((): Highcharts.SeriesOptionsType[] => {
    const limits: Record<string, number> = {};
    for (let i = 0; i < symbols.length; i += 1) {
      const symbol = symbols[i];
      limits[symbol] = getLimit(algorithm, symbol);
    }

    const data: Record<string, [number, number][]> = {};
    for (let i = 0; i < symbols.length; i += 1) {
      data[symbols[i]] = [];
    }

    for (let i = 0; i < algorithm.data.length; i += 1) {
      const row = algorithm.data[i];
      for (let j = 0; j < symbols.length; j += 1) {
        const symbol = symbols[j];
        const position = row.state.position[symbol] || 0;
        data[symbol].push([row.state.timestamp, (position / limits[symbol]) * 100]);
      }
    }

    return symbols.map((symbol, i) => ({
      type: 'line',
      name: symbol,
      data: data[symbol],

      // We offset the position color by 1 to make it line up with the colors in the profit / loss chart,
      // while keeping the "Total" line in the profit / loss chart the same color at all times
      colorIndex: (i + 1) % 10,
    }));
  }, [algorithm, symbols]);

  return <Chart title="Positions (% of limit)" series={series} min={-100} max={100} />;
});
