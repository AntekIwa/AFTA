import { Accordion, Button, Group, MantineColor, Text } from '@mantine/core';
import axios from 'axios';
import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorAlert } from '../../components/ErrorAlert';
import { ScrollableCodeHighlight } from '../../components/ScrollableCodeHighlight.tsx';
import { useActualColorScheme } from '../../hooks/use-actual-color-scheme.ts';
import { useAsync } from '../../hooks/use-async.ts';
import { useLogParser } from '../../hooks/useLogParser.ts';
import { AlgorithmSummary, StrategySession } from '../../models.ts';
import { useStore } from '../../store.ts';
import {
  downloadAlgorithmLogs,
  downloadAlgorithmResults,
  getAlgorithmLogsUrl,
} from '../../utils/algorithm.tsx';
import { formatNumber, formatTimestamp } from '../../utils/format.ts';
import { calculateMaxDrawdown, calculateSharpeRatio } from '../../utils/quantEngine.ts';

export interface AlgorithmDetailProps {
  position: number;
  algorithm: AlgorithmSummary;
  proxy: string;
}

export function AlgorithmDetail({ position, algorithm, proxy }: AlgorithmDetailProps): ReactNode {
  const setAlgorithm = useStore(state => state.setAlgorithm);
  const setLoadedLogFilename = useStore(state => state.setLoadedLogFilename);
  const addStrategySession = useStore(state => state.addStrategySession);
  const logParser = useLogParser();

  const navigate = useNavigate();
  const colorScheme = useActualColorScheme();

  let statusColor: MantineColor = 'primary';
  switch (algorithm.status) {
    case 'FINISHED':
      statusColor = colorScheme === 'light' ? 'darkgreen' : 'green';
      break;
    case 'ERROR':
      statusColor = 'red';
      break;
  }

  const downloadLogs = useAsync<void>(async () => {
    await downloadAlgorithmLogs(algorithm.id);
  });

  const downloadResults = useAsync<void>(async () => {
    await downloadAlgorithmResults(algorithm.id);
  });

  const openInVisualizer = useAsync<void>(async () => {
    const logsUrl = await getAlgorithmLogsUrl(algorithm.id);
    const logsResponse = await axios.get<string>(proxy + logsUrl, { responseType: 'text' });
    const alg = await logParser.parseFromText(logsResponse.data, algorithm);
    setAlgorithm(alg);
    setLoadedLogFilename(algorithm.fileName ?? null);
    const pnlHistory = alg.activityLogs.map(row => row.profitLoss);
    const tradeCount = alg.data.reduce((acc, row) => {
      let rowTrades = 0;
      for (const symbol of Object.keys(row.state.ownTrades)) {
        rowTrades += row.state.ownTrades[symbol].length;
      }
      return acc + rowTrades;
    }, 0);
    const session: StrategySession = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: algorithm.fileName ?? `Strategy ${position}`,
      timestamp: new Date().toISOString(),
      rawLogs: logsResponse.data,
      computedMetrics: {
        totalPnl: pnlHistory.length > 0 ? pnlHistory[pnlHistory.length - 1] : 0,
        sharpeRatio: calculateSharpeRatio(pnlHistory),
        maxDrawdown: calculateMaxDrawdown(pnlHistory),
        tradeCount,
      },
      algorithm: alg,
    };
    addStrategySession(session);
    navigate('/visualizer');
  });

  let title = `${algorithm.fileName} • ${formatTimestamp(algorithm.timestamp)}`;

  let profitLoss = 0;
  if (algorithm.status === 'FINISHED') {
    const graphLogLines = algorithm.graphLog.trim().split('\n');
    profitLoss = parseFloat(graphLogLines[graphLogLines.length - 1].split(';')[1]);

    title += ` • FINISHED • PnL ≈ ${formatNumber(profitLoss)}`;
  } else {
    title += ` • ${algorithm.status}`;
  }

  if (algorithm.selectedForRound) {
    title += ' • Active';
  }

  return (
    <Accordion.Item key={algorithm.id} value={algorithm.id}>
      <Accordion.Control>
        <Text c={statusColor}>
          <b>{position}.</b> {title}
        </Text>
      </Accordion.Control>
      <Accordion.Panel>
        {openInVisualizer.error && <ErrorAlert error={openInVisualizer.error} mb="xs" />}
        <Group grow mb="xs">
          <Button variant="outline" onClick={downloadLogs.call} loading={downloadLogs.loading}>
            Download logs
          </Button>
          <Button variant="outline" onClick={downloadResults.call} loading={downloadResults.loading}>
            Download results
          </Button>
          {algorithm.status === 'FINISHED' && (
            <Button onClick={openInVisualizer.call} variant="outline" loading={openInVisualizer.loading}>
              Open in visualizer
            </Button>
          )}
        </Group>
        <Text>
          <b>Id:</b> {algorithm.id}
        </Text>
        <Text>
          <b>File name:</b> {algorithm.fileName}
        </Text>
        <Text>
          <b>Submitted at:</b> {formatTimestamp(algorithm.timestamp)}
        </Text>
        <Text>
          <b>Submitted by:</b> {algorithm.user.firstName} {algorithm.user.lastName}
        </Text>
        <Text>
          <b>Status:</b> {algorithm.status}
        </Text>
        <Text>
          <b>Round:</b> {algorithm.round}
        </Text>
        <Text>
          <b>Selected for round:</b> {algorithm.selectedForRound ? 'Yes' : 'No'}
        </Text>
        {algorithm.status === 'FINISHED' && (
          <Text>
            <b>Approximate profit / loss: </b> {formatNumber(profitLoss)}
          </Text>
        )}
        <Text>
          <b>Content:</b>
        </Text>
        <ScrollableCodeHighlight code={algorithm.content} language="python" />
      </Accordion.Panel>
    </Accordion.Item>
  );
}
