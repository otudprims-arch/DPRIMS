// src/hooks/useSessions.js
import {
  getSessions,
  getCurrentSession,
  getSessionSummary,
} from '../services/api';
import { usePolling } from './usePolling';

export function useSessions(limit = 20, intervalMs = 5000) {
  const { data, loading, error } = usePolling(
    () => getSessions(limit),
    intervalMs,
    [limit, intervalMs]
  );

  return {
    sessions: Array.isArray(data?.data) ? data.data : [],
    loading,
    error,
  };
}

export function useCurrentSession(intervalMs = 3000) {
  const { data, loading, error } = usePolling(
    () => getCurrentSession(),
    intervalMs,
    [intervalMs]
  );

  return {
    session: data?.data || null,
    loading,
    error,
  };
}

export function useSessionSummary(sessionId, intervalMs = 4000) {
  const { data, loading, error } = usePolling(
    () =>
      sessionId
        ? getSessionSummary(sessionId)
        : Promise.resolve({ success: true, data: null }),
    intervalMs,
    [sessionId, intervalMs]
  );

  return {
    summary: data?.data || null,
    loading,
    error,
  };
}
