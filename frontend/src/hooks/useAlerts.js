// src/hooks/useAlerts.js
import { getAlerts, getAlertStats, getAlertTimeline } from '../services/api';
import { usePolling } from './usePolling';

/**
 * Backward compatible:
 * useAlerts(30, 2500, { status: 'new' })
 * useAlerts({ limit: 80, status: 'new' }, 2500)
 */
export function useAlerts(limitOrParams = 30, intervalMs = 2500, filters = {}) {
  const params =
    typeof limitOrParams === 'object' && limitOrParams !== null
      ? limitOrParams
      : { limit: limitOrParams, ...filters };

  const { data, loading, error } = usePolling(
    () => getAlerts(params),
    intervalMs,
    [intervalMs, JSON.stringify(params)]
  );

  return {
    alerts: data?.data || [],
    pagination: data?.pagination || null,
    loading,
    error,
  };
}

export function useAlertStats(intervalMs = 4000) {
  const { data, loading, error } = usePolling(
    () => getAlertStats(),
    intervalMs,
    [intervalMs]
  );

  return {
    stats: data?.data || data || null,
    loading,
    error,
  };
}

export function useAlertTimeline(intervalMs = 8000) {
  const { data, loading, error } = usePolling(
    () => getAlertTimeline(),
    intervalMs,
    [intervalMs]
  );

  return {
    timeline: data?.data || data || [],
    loading,
    error,
  };
}
