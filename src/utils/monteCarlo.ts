export interface BootstrapDistributions {
  terminalPnl: number[];
  maxDrawdown: number[];
  sharpeRatio: number[];
}

export function runBootstrap(pnlReturns: number[], simulations: number = 2000): BootstrapDistributions {
  const simCount = Number.isFinite(simulations) && simulations > 0 ? Math.floor(simulations) : 0;
  const n = Array.isArray(pnlReturns) ? pnlReturns.length : 0;

  const terminalPnl = new Array<number>(simCount);
  const maxDrawdown = new Array<number>(simCount);
  const sharpeRatio = new Array<number>(simCount);

  if (simCount === 0 || n === 0) {
    return { terminalPnl, maxDrawdown, sharpeRatio };
  }

  // Rule-of-thumb block size for preserving serial correlation while keeping variance.
  const blockSize = Math.max(5, Math.min(n, Math.floor(Math.sqrt(n))));
  const maxStart = Math.max(0, n - blockSize);
  const annualization = Math.sqrt(252);

  for (let sim = 0; sim < simCount; sim += 1) {
    let generated = 0;
    let equity = 1;
    let peak = 1;
    let worstDrawdown = 0;

    // Welford stats for synthetic return stream.
    let count = 0;
    let mean = 0;
    let m2 = 0;

    while (generated < n) {
      const start = maxStart === 0 ? 0 : ((Math.random() * (maxStart + 1)) | 0);
      const end = start + blockSize;

      for (let i = start; i < end && generated < n; i += 1) {
        const r = pnlReturns[i];
        if (!Number.isFinite(r)) {
          generated += 1;
          continue;
        }

        // Build synthetic curve from returns: E_t = E_(t-1) * (1 + r)
        equity *= 1 + r;
        if (!Number.isFinite(equity) || equity <= 0) {
          equity = 0;
        }

        if (equity > peak) {
          peak = equity;
        } else if (peak > 0) {
          const dd = (peak - equity) / peak;
          if (dd > worstDrawdown) {
            worstDrawdown = dd;
          }
        }

        count += 1;
        const delta = r - mean;
        mean += delta / count;
        const delta2 = r - mean;
        m2 += delta * delta2;

        generated += 1;
      }
    }

    terminalPnl[sim] = equity - 1;
    maxDrawdown[sim] = worstDrawdown;

    if (count < 2) {
      sharpeRatio[sim] = 0;
      continue;
    }

    const variance = m2 / (count - 1);
    if (variance <= 0 || !Number.isFinite(variance)) {
      sharpeRatio[sim] = 0;
      continue;
    }

    const stdDev = Math.sqrt(variance);
    sharpeRatio[sim] = stdDev === 0 ? 0 : (mean / stdDev) * annualization;
  }

  return {
    terminalPnl,
    maxDrawdown,
    sharpeRatio,
  };
}
