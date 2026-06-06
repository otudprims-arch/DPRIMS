// src/hooks/useTelemetry.js
import { getLatestTelemetry, getTelemetryState } from '../services/api';
import { usePolling } from './usePolling';

export function useTelemetry(intervalMs = 700) {
  const { data, loading, error } = usePolling(
    () => getLatestTelemetry(),
    intervalMs,
    [intervalMs]
  );

  return {
    telemetry: data,
    loading,
    error,
  };
}

export function useTelemetryState(intervalMs = 1200) {
  const { data, loading, error } = usePolling(
    () => getTelemetryState(),
    intervalMs,
    [intervalMs]
  );

  return {
    telemetryState: data,
    loading,
    error,
  };
}