import { Center, Container, Grid, Title } from '@mantine/core';
import { ReactNode, useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { StrategySidebar } from '../../components/StrategySidebar.tsx';
import { useStore } from '../../store.ts';
import { formatNumber } from '../../utils/format.ts';
import { AlgorithmSummaryCard } from './AlgorithmSummaryCard.tsx';
import { CandlestickChart } from './CandlestickChart.tsx';
import { ConversionPriceChart } from './ConversionPriceChart.tsx';
import { EnvironmentChart } from './EnvironmentChart.tsx';
import { OrdersChart } from './OrdersChart.tsx';
import { PlainValueObservationChart } from './PlainValueObservationChart.tsx';
import { PositionChart } from './PositionChart.tsx';
import { ProfitLossChart } from './ProfitLossChart.tsx';
import { TimestampsCard } from './TimestampsCard.tsx';
import { TransportChart } from './TransportChart.tsx';
import { VisualizerCard } from './VisualizerCard.tsx';

export function VisualizerPage(): ReactNode {
  const algorithm = useStore(state => state.algorithm);
  const strategySessions = useStore(state => state.strategySessions);
  const visibleStrategySessionIds = useStore(state => state.visibleStrategySessionIds);

  const { search } = useLocation();

  if (algorithm === null) {
    return <Navigate to={`/${search}`} />;
  }

  const conversionProducts = useMemo(() => {
    const products = new Set<string>();
    for (let i = 0; i < algorithm.data.length; i += 1) {
      for (const product of Object.keys(algorithm.data[i].state.observations.conversionObservations)) {
        products.add(product);
      }
    }
    return products;
  }, [algorithm.data]);

  const profitLoss = useMemo(() => {
    let totalProfitLoss = 0;
    const lastTimestamp = algorithm.activityLogs[algorithm.activityLogs.length - 1].timestamp;
    for (let i = algorithm.activityLogs.length - 1; i >= 0 && algorithm.activityLogs[i].timestamp === lastTimestamp; i--) {
      totalProfitLoss += algorithm.activityLogs[i].profitLoss;
    }
    return totalProfitLoss;
  }, [algorithm.activityLogs]);

  const { sortedSymbols, sortedPlainValueObservationSymbols } = useMemo(() => {
    const symbols = new Set<string>();
    const plainValueObservationSymbols = new Set<string>();
    for (let i = 0; i < algorithm.data.length; i += 1000) {
      const row = algorithm.data[i];
      for (const key of Object.keys(row.state.listings)) {
        symbols.add(key);
      }
      for (const key of Object.keys(row.state.observations.plainValueObservations)) {
        plainValueObservationSymbols.add(key);
      }
    }

    return {
      sortedSymbols: [...symbols].sort((a, b) => a.localeCompare(b)),
      sortedPlainValueObservationSymbols: [...plainValueObservationSymbols].sort((a, b) => a.localeCompare(b)),
    };
  }, [algorithm.data]);

  const symbolColumns = useMemo((): ReactNode[] => {
    const columns: ReactNode[] = [];
    sortedSymbols.forEach(symbol => {
      columns.push(
        <Grid.Col key={`${symbol} - candlestick`} span={{ xs: 12, sm: 6 }}>
          <CandlestickChart symbol={symbol} />
        </Grid.Col>,
      );

      columns.push(
        <Grid.Col key={`${symbol} - orders`} span={{ xs: 12, sm: 6 }}>
          <OrdersChart symbol={symbol} />
        </Grid.Col>,
      );

      if (!conversionProducts.has(symbol)) {
        return;
      }

      columns.push(
        <Grid.Col key={`${symbol} - conversion price`} span={{ xs: 12, sm: 6 }}>
          <ConversionPriceChart symbol={symbol} />
        </Grid.Col>,
      );
      columns.push(
        <Grid.Col key={`${symbol} - transport`} span={{ xs: 12, sm: 6 }}>
          <TransportChart symbol={symbol} />
        </Grid.Col>,
      );
      columns.push(
        <Grid.Col key={`${symbol} - environment`} span={{ xs: 12, sm: 6 }}>
          <EnvironmentChart symbol={symbol} />
        </Grid.Col>,
      );
      columns.push(<Grid.Col key={`${symbol} - environment spacer`} span={{ xs: 12, sm: 6 }} />);
    });

    sortedPlainValueObservationSymbols.forEach(symbol => {
      columns.push(
        <Grid.Col key={`${symbol} - plain value observation`} span={{ xs: 12, sm: 6 }}>
          <PlainValueObservationChart symbol={symbol} />
        </Grid.Col>,
      );
    });
    return columns;
  }, [conversionProducts, sortedPlainValueObservationSymbols, sortedSymbols]);

  return (
    <Container fluid>
      <Grid>
        <Grid.Col span={12}>
          <VisualizerCard>
            <Center>
              <Title order={2}>Final Profit / Loss: {formatNumber(profitLoss)}</Title>
            </Center>
          </VisualizerCard>
        </Grid.Col>
        <Grid.Col span={{ xs: 12, sm: 8 }}>
          <ProfitLossChart
            symbols={sortedSymbols}
            strategySessions={strategySessions}
            visibleStrategySessionIds={visibleStrategySessionIds}
          />
        </Grid.Col>
        <Grid.Col span={{ xs: 12, sm: 4 }}>
          <StrategySidebar />
        </Grid.Col>
        <Grid.Col span={{ xs: 12, sm: 6 }}>
          <PositionChart symbols={sortedSymbols} />
        </Grid.Col>
        {symbolColumns}
        <Grid.Col span={12}>
          <TimestampsCard />
        </Grid.Col>
        {algorithm.summary && (
          <Grid.Col span={12}>
            <AlgorithmSummaryCard />
          </Grid.Col>
        )}
      </Grid>
    </Container>
  );
}
