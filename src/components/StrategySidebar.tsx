import { Checkbox, Stack, Text } from '@mantine/core';
import { ReactNode } from 'react';
import { useStore } from '../store.ts';

export function StrategySidebar(): ReactNode {
  const strategySessions = useStore(state => state.strategySessions);
  const visibleIds = useStore(state => state.visibleStrategySessionIds);
  const toggleVisibility = useStore(state => state.toggleStrategySessionVisibility);

  return (
    <aside className="rounded-md bg-marmot-surface p-4">
      <Text fw={700} mb="xs">
        Strategy Runs
      </Text>
      {strategySessions.length === 0 ? (
        <Text size="sm" c="dimmed">
          No runs uploaded yet.
        </Text>
      ) : (
        <Stack gap="xs">
          {strategySessions.map(session => (
            <Checkbox
              key={session.id}
              checked={visibleIds.includes(session.id)}
              onChange={() => toggleVisibility(session.id)}
              label={
                <span>
                  {session.name} <span className="text-slate-400">({new Date(session.timestamp).toLocaleString()})</span>
                </span>
              }
            />
          ))}
        </Stack>
      )}
    </aside>
  );
}
