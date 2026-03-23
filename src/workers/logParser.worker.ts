/// <reference lib="webworker" />
import { AlgorithmSummary, ResultLog } from '../models.ts';
import { parseAlgorithmLogsCore } from '../utils/logParserCore.ts';

type WorkerRequest =
  | { type: 'parse-text'; text: string; summary?: AlgorithmSummary }
  | { type: 'parse-object'; resultLog: ResultLog; summary?: AlgorithmSummary };

type WorkerResponse =
  | { type: 'progress'; percent: number; stage: string }
  | { type: 'done'; algorithm: ReturnType<typeof parseAlgorithmLogsCore> }
  | { type: 'error'; message: string };

const ctx: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const payload = event.data;

  try {
    ctx.postMessage({ type: 'progress', percent: 10, stage: 'Reading payload' } satisfies WorkerResponse);

    const resultLog =
      payload.type === 'parse-text' ? (JSON.parse(payload.text) as ResultLog) : (payload.resultLog as ResultLog);

    ctx.postMessage({ type: 'progress', percent: 20, stage: 'Decoded JSON' } satisfies WorkerResponse);

    const algorithm = parseAlgorithmLogsCore(resultLog, payload.summary, progress => {
      ctx.postMessage({ type: 'progress', ...progress } satisfies WorkerResponse);
    });

    ctx.postMessage({ type: 'done', algorithm } satisfies WorkerResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown parsing error';
    ctx.postMessage({ type: 'error', message } satisfies WorkerResponse);
  }
};
