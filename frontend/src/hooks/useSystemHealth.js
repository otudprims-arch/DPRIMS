// src/hooks/useSystemHealth.js
import { getSystemHealth } from '../services/api';
import { usePolling } from './usePolling';

export function useSystemHealth(intervalMs = 3000) {
  const { data, loading, error } = usePolling(
    () => getSystemHealth(),
    intervalMs,
    [intervalMs]
  );

  return {
    health: data,
    loading,
    error,
  };
}