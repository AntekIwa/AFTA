import { MantineColorScheme } from '@mantine/core';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Algorithm, StrategySession } from './models.ts';

export interface State {
  colorScheme: MantineColorScheme;

  idToken: string;
  round: string;

  algorithm: Algorithm | null;
  loadedLogFilename: string | null;
  strategySessions: StrategySession[];
  visibleStrategySessionIds: string[];
  activeStrategySessionId: string | null;

  setColorScheme: (colorScheme: MantineColorScheme) => void;
  setIdToken: (idToken: string) => void;
  setRound: (round: string) => void;
  setAlgorithm: (algorithm: Algorithm | null) => void;
  setLoadedLogFilename: (loadedLogFilename: string | null) => void;
  addStrategySession: (session: StrategySession) => void;
  toggleStrategySessionVisibility: (sessionId: string) => void;
  setActiveStrategySession: (sessionId: string | null) => void;
}

export const useStore = create<State>()(
  persist(
    set => ({
      colorScheme: 'auto',

      idToken: '',
      round: 'ROUND0',

      algorithm: null,
      loadedLogFilename: null,
      strategySessions: [],
      visibleStrategySessionIds: [],
      activeStrategySessionId: null,

      setColorScheme: colorScheme => set({ colorScheme }),
      setIdToken: idToken => set({ idToken }),
      setRound: round => set({ round }),
      setAlgorithm: algorithm =>
        set(state => ({
          algorithm,
          loadedLogFilename: algorithm === null ? null : state.loadedLogFilename,
        })),
      setLoadedLogFilename: loadedLogFilename => set({ loadedLogFilename }),
      addStrategySession: session =>
        set(state => ({
          strategySessions: [...state.strategySessions, session],
          visibleStrategySessionIds: state.visibleStrategySessionIds.includes(session.id)
            ? state.visibleStrategySessionIds
            : [...state.visibleStrategySessionIds, session.id],
          activeStrategySessionId: session.id,
        })),
      toggleStrategySessionVisibility: sessionId =>
        set(state => {
          const isVisible = state.visibleStrategySessionIds.includes(sessionId);
          return {
            visibleStrategySessionIds: isVisible
              ? state.visibleStrategySessionIds.filter(id => id !== sessionId)
              : [...state.visibleStrategySessionIds, sessionId],
          };
        }),
      setActiveStrategySession: activeStrategySessionId => set({ activeStrategySessionId }),
    }),
    {
      name: 'imc-prosperity-4-visualizer',
      partialize: state => ({
        colorScheme: state.colorScheme,
        idToken: state.idToken,
        round: state.round,
      }),
    },
  ),
);
