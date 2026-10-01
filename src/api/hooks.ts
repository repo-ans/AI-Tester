import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Channel, ScenarioInput, StartTestInput, TeamSettingsInput } from './client';

export const queryKeys = {
  sessions: (channel: '' | Channel) => ['sessions', channel] as const,
  session: (id: number) => ['session', id] as const,
  scenarios: ['scenarios'] as const,
  settings: ['settings'] as const,
};

const SESSION_LIMIT = 200;

export function useSessions(channel: '' | Channel) {
  return useQuery({
    queryKey: queryKeys.sessions(channel),
    queryFn: () => api('list_sessions', { channel, limit: SESSION_LIMIT }),
    placeholderData: keepPreviousData,
    // Poll only while at least one test is still running.
    refetchInterval: (query) =>
      query.state.data?.some((row) => row.status === 'running') ? 5000 : false,
  });
}

export function useSession(id: number) {
  return useQuery({
    queryKey: queryKeys.session(id),
    queryFn: () => api('get_session', { id }),
    enabled: Number.isFinite(id),
    refetchInterval: (query) => (query.state.data?.session.status === 'running' ? 4000 : false),
  });
}

export function useAbortSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api('abort_session', { id }),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: queryKeys.session(id) });
      void qc.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useStartTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StartTestInput) => api('start_test', input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useScenarios() {
  return useQuery({
    queryKey: queryKeys.scenarios,
    queryFn: () => api('list_scenarios'),
  });
}

export function useSaveScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scenario: ScenarioInput) => api('save_scenario', { scenario }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.scenarios }),
  });
}

export function useDeleteScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api('delete_scenario', { id }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.scenarios }),
  });
}

export function useTeamSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => api('get_settings'),
    staleTime: 60_000,
  });
}

export function useSaveTeamSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: TeamSettingsInput) => api('save_settings', { settings }),
    onSuccess: (saved) => qc.setQueryData(queryKeys.settings, saved),
  });
}
