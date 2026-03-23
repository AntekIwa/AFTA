import {
  ActivityLogRow,
  Algorithm,
  AlgorithmDataRow,
  AlgorithmSummary,
  CompressedAlgorithmDataRow,
  CompressedListing,
  CompressedObservations,
  CompressedOrder,
  CompressedOrderDepth,
  CompressedTrade,
  CompressedTradingState,
  ConversionObservation,
  Listing,
  Observation,
  Order,
  OrderDepth,
  Product,
  ProsperitySymbol,
  ResultLog,
  Trade,
  TradingState,
} from '../models.ts';

export interface ParseProgress {
  percent: number;
  stage: string;
}

export class LogParseError extends Error {}

function getColumnValues(columns: string[], indices: number[]): number[] {
  const values: number[] = [];
  for (let i = 0; i < indices.length; i += 1) {
    const value = columns[indices[i]];
    if (value !== '') {
      values.push(parseFloat(value));
    }
  }
  return values;
}

function getActivityLogs(logLines: string): ActivityLogRow[] {
  const lines = logLines.split('\n');
  const rows: ActivityLogRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line === '') {
      break;
    }

    const columns = line.split(';');
    rows.push({
      day: Number(columns[0]),
      timestamp: Number(columns[1]),
      product: columns[2],
      bidPrices: getColumnValues(columns, [3, 5, 7]),
      bidVolumes: getColumnValues(columns, [4, 6, 8]),
      askPrices: getColumnValues(columns, [9, 11, 13]),
      askVolumes: getColumnValues(columns, [10, 12, 14]),
      midPrice: Number(columns[15]),
      profitLoss: Number(columns[16]),
    });
  }

  return rows;
}

function decompressListings(compressed: CompressedListing[]): Record<ProsperitySymbol, Listing> {
  const listings: Record<ProsperitySymbol, Listing> = {};
  for (let i = 0; i < compressed.length; i += 1) {
    const [symbol, product, denomination] = compressed[i];
    listings[symbol] = { symbol, product, denomination };
  }
  return listings;
}

function decompressOrderDepths(
  compressed: Record<ProsperitySymbol, CompressedOrderDepth>,
): Record<ProsperitySymbol, OrderDepth> {
  const orderDepths: Record<ProsperitySymbol, OrderDepth> = {};
  for (const [symbol, [buyOrders, sellOrders]] of Object.entries(compressed)) {
    orderDepths[symbol] = { buyOrders, sellOrders };
  }
  return orderDepths;
}

function decompressTrades(compressed: CompressedTrade[]): Record<ProsperitySymbol, Trade[]> {
  const trades: Record<ProsperitySymbol, Trade[]> = {};
  for (let i = 0; i < compressed.length; i += 1) {
    const [symbol, price, quantity, buyer, seller, timestamp] = compressed[i];
    if (trades[symbol] === undefined) {
      trades[symbol] = [];
    }
    trades[symbol].push({ symbol, price, quantity, buyer, seller, timestamp });
  }
  return trades;
}

function decompressObservations(compressed: CompressedObservations): Observation {
  const conversionObservations: Record<Product, ConversionObservation> = {};
  for (const [product, row] of Object.entries(compressed[1])) {
    conversionObservations[product] = {
      bidPrice: row[0],
      askPrice: row[1],
      transportFees: row[2],
      exportTariff: row[3],
      importTariff: row[4],
      sugarPrice: row[5],
      sunlightIndex: row[6],
    };
  }

  return {
    plainValueObservations: compressed[0],
    conversionObservations,
  };
}

function decompressState(compressed: CompressedTradingState): TradingState {
  return {
    timestamp: compressed[0],
    traderData: compressed[1],
    listings: decompressListings(compressed[2]),
    orderDepths: decompressOrderDepths(compressed[3]),
    ownTrades: decompressTrades(compressed[4]),
    marketTrades: decompressTrades(compressed[5]),
    position: compressed[6],
    observations: decompressObservations(compressed[7]),
  };
}

function decompressOrders(compressed: CompressedOrder[]): Record<ProsperitySymbol, Order[]> {
  const orders: Record<ProsperitySymbol, Order[]> = {};
  for (let i = 0; i < compressed.length; i += 1) {
    const [symbol, price, quantity] = compressed[i];
    if (orders[symbol] === undefined) {
      orders[symbol] = [];
    }
    orders[symbol].push({ symbol, price, quantity });
  }
  return orders;
}

function decompressDataRow(compressed: CompressedAlgorithmDataRow, sandboxLogs: string): AlgorithmDataRow {
  return {
    state: decompressState(compressed[0]),
    orders: decompressOrders(compressed[1]),
    conversions: compressed[2],
    traderData: compressed[3],
    algorithmLogs: compressed[4],
    sandboxLogs,
  };
}

function getAlgorithmData(resultLog: ResultLog, onProgress?: (progress: ParseProgress) => void): AlgorithmDataRow[] {
  const rows: AlgorithmDataRow[] = [];
  const nextSandboxLogs = '';
  const total = resultLog.logs.length || 1;

  for (let i = 0; i < resultLog.logs.length; i += 1) {
    const lambdaLog = resultLog.logs[i].lambdaLog.trim();
    if (lambdaLog === '') {
      continue;
    }

    try {
      rows.push(decompressDataRow(JSON.parse(lambdaLog), nextSandboxLogs));
    } catch {
      throw new LogParseError(`Logs are in invalid format. Could not parse line: ${lambdaLog}`);
    }

    if (onProgress && (i % 500 === 0 || i === resultLog.logs.length - 1)) {
      onProgress({
        percent: 45 + Math.floor(((i + 1) / total) * 45),
        stage: 'Transforming rows',
      });
    }
  }

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const dayOffset = Math.floor(row.state.timestamp / 1000000) * 1000000;
    if (dayOffset === 0) {
      continue;
    }

    const adjustTimestamp = (ts: number): number => {
      const adjusted = ts + dayOffset;
      return adjusted > row.state.timestamp ? adjusted - 1000000 : adjusted;
    };

    for (const symbol of Object.keys(row.state.ownTrades)) {
      const symbolTrades = row.state.ownTrades[symbol];
      for (let j = 0; j < symbolTrades.length; j += 1) {
        symbolTrades[j].timestamp = adjustTimestamp(symbolTrades[j].timestamp);
      }
    }
    for (const symbol of Object.keys(row.state.marketTrades)) {
      const symbolTrades = row.state.marketTrades[symbol];
      for (let j = 0; j < symbolTrades.length; j += 1) {
        symbolTrades[j].timestamp = adjustTimestamp(symbolTrades[j].timestamp);
      }
    }
  }

  return rows;
}

export function parseAlgorithmLogsCore(
  resultLog: ResultLog,
  summary?: AlgorithmSummary,
  onProgress?: (progress: ParseProgress) => void,
): Algorithm {
  onProgress?.({ percent: 20, stage: 'Parsing activities' });
  const activityLogs = getActivityLogs(resultLog.activitiesLog);

  onProgress?.({ percent: 45, stage: 'Parsing data rows' });
  const data = getAlgorithmData(resultLog, onProgress);

  if (activityLogs.length === 0 && data.length === 0) {
    throw new LogParseError(
      'Logs are empty, either something went wrong with your submission or your logs are in a different format.',
    );
  }

  if (activityLogs.length === 0 || data.length === 0) {
    throw new LogParseError('Logs are in invalid format.');
  }

  onProgress?.({ percent: 100, stage: 'Done' });
  return { summary, activityLogs, data };
}
