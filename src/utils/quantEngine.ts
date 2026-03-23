export function calculateSharpeRatio(pnlHistory: number[], periodsPerYear = 252): number {
  if (!Array.isArray(pnlHistory) || pnlHistory.length < 2 || periodsPerYear <= 0) {
    return 0;
  }

  let count = 0;
  let mean = 0;
  let m2 = 0;

  for (let i = 1; i < pnlHistory.length; i += 1) {
    const prev = pnlHistory[i - 1];
    const curr = pnlHistory[i];

    if (!Number.isFinite(prev) || !Number.isFinite(curr) || prev === 0) {
      continue;
    }

    const dailyReturn = (curr - prev) / Math.abs(prev);
    count += 1;

    // Welford's online algorithm for numerically stable variance.
    const delta = dailyReturn - mean;
    mean += delta / count;
    const delta2 = dailyReturn - mean;
    m2 += delta * delta2;
  }

  if (count < 2) {
    return 0;
  }

  const variance = m2 / (count - 1);
  if (variance <= 0 || !Number.isFinite(variance)) {
    return 0;
  }

  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) {
    return 0;
  }

  const annualization = Math.sqrt(periodsPerYear);
  return (mean / stdDev) * annualization;
}

export function calculateMaxDrawdown(pnlHistory: number[]): number {
  if (!Array.isArray(pnlHistory) || pnlHistory.length === 0) {
    return 0;
  }

  let peak = Number.NEGATIVE_INFINITY;
  let maxDrawdown = 0;

  for (let i = 0; i < pnlHistory.length; i += 1) {
    const value = pnlHistory[i];
    if (!Number.isFinite(value)) {
      continue;
    }

    if (value > peak) {
      peak = value;
      continue;
    }

    const drawdown = peak - value;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return Number.isFinite(maxDrawdown) ? maxDrawdown : 0;
}

export function calculateWinRate(trades: any[]): number {
  if (!Array.isArray(trades) || trades.length === 0) {
    return 0;
  }

  let profitable = 0;
  let total = 0;

  for (let i = 0; i < trades.length; i += 1) {
    const trade = trades[i];

    let pnl: number | undefined;
    if (typeof trade === 'number') {
      pnl = trade;
    } else if (trade && typeof trade === 'object') {
      const candidate = trade.pnl ?? trade.profit ?? trade.realizedPnl ?? trade.realized_profit ?? trade.value;
      if (typeof candidate === 'number') {
        pnl = candidate;
      }
    }

    if (!Number.isFinite(pnl)) {
      continue;
    }

    total += 1;
    if (pnl > 0) {
      profitable += 1;
    }
  }

  if (total === 0) {
    return 0;
  }

  return (profitable / total) * 100;
}

export function calculateProfitPerAsset(data: any): Record<string, number> {
  const profits: Record<string, number> = {};
  if (data == null) {
    return profits;
  }

  const records: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data.trades)
      ? data.trades
      : Array.isArray(data.records)
        ? data.records
        : Array.isArray(data.data)
          ? data.data
          : [];

  for (let i = 0; i < records.length; i += 1) {
    const row = records[i];
    if (!row || typeof row !== 'object') {
      continue;
    }

    const symbolRaw = row.symbol ?? row.asset ?? row.ticker ?? row.product;
    const pnlRaw = row.pnl ?? row.profit ?? row.realizedPnl ?? row.realized_profit ?? row.value;

    if (typeof symbolRaw !== 'string' || symbolRaw.length === 0 || !Number.isFinite(pnlRaw)) {
      continue;
    }

    if (profits[symbolRaw] === undefined) {
      profits[symbolRaw] = 0;
    }
    profits[symbolRaw] += pnlRaw;
  }

  return profits;
}
