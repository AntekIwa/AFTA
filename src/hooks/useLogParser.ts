import { useCallback, useEffect, useRef, useState } from 'react';
import { Algorithm, AlgorithmSummary, ResultLog } from '../models.ts';

type WorkerResponse =
  | { type: 'progress'; percent: number; stage: string }
  | { type: 'done'; algorithm: Algorithm }
  | { type: 'error'; message: string };

function createParserWorker(): Worker {
  return new Worker(new URL('../workers/logParser.worker.ts', import.meta.url), { type: 'module' });
}

export interface UseLogParserResult {
  loading: boolean;
  loadingProgress: number;
  loadingStage: string;
  parseFromText: (text: string, summary?: AlgorithmSummary) => Promise<Algorithm>;
  parseFromObject: (resultLog: ResultLog, summary?: AlgorithmSummary) => Promise<Algorithm>;
}

export function useLogParser(): UseLogParserResult {
  const workerRef = useRef<Worker | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const run = useCallback((message: unknown): Promise<Algorithm> => {
    setLoading(true);
    setLoadingProgress(0);
    setLoadingStage('Starting parser');

    const worker = createParserWorker();
    workerRef.current?.terminate();
    workerRef.current = worker;

    return new Promise((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const payload = event.data;
        if (payload.type === 'progress') {
          setLoadingProgress(Math.max(0, Math.min(100, payload.percent)));
          setLoadingStage(payload.stage);
          return;
        }

        if (payload.type === 'done') {
          setLoading(false);
          setLoadingProgress(100);
          setLoadingStage('Done');
          worker.terminate();
          resolve(payload.algorithm);
          return;
        }

        setLoading(false);
        setLoadingStage('Failed');
        worker.terminate();
        reject(new Error(payload.message));
      };

      worker.onerror = event => {
        setLoading(false);
        setLoadingStage('Failed');
        worker.terminate();
        reject(new Error(event.message || 'Worker parsing failed'));
      };

      worker.postMessage(message);
    });
  }, []);

  const parseFromText = useCallback(
    (text: string, summary?: AlgorithmSummary) => run({ type: 'parse-text', text, summary }),
    [run],
  );
  const parseFromObject = useCallback(
    (resultLog: ResultLog, summary?: AlgorithmSummary) => run({ type: 'parse-object', resultLog, summary }),
    [run],
  );

  return {
    loading,
    loadingProgress,
    loadingStage,
    parseFromText,
    parseFromObject,
  };
}
