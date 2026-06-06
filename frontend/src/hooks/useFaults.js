// src/hooks/useFaults.js
import { useEffect, useState, useCallback } from 'react';
import { getFaults, getFaultStats } from '../services/api';

export function useFaults(params = {}, intervalMs = 3000) {
  const [faults, setFaults] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [filter, setFilter] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const stableParams = JSON.stringify(params || {});

  const load = useCallback(async () => {
    try {
      const parsed = JSON.parse(stableParams);
      const res = await getFaults(parsed);

      if (res?.success) {
        setFaults(Array.isArray(res.data) ? res.data : []);
        setPagination(res.pagination || null);
        setFilter(res.filter || {});
        setError('');
      }
    } catch (err) {
      setError(err?.message || 'Failed to load faults');
    } finally {
      setLoading(false);
    }
  }, [stableParams]);

  useEffect(() => {
    let cancelled = false;

    async function safeLoad() {
      if (!cancelled) await load();
    }

    safeLoad();

    const id = setInterval(safeLoad, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [load, intervalMs]);

  return {
    faults,
    pagination,
    filter,
    loading,
    error,
    reload: load,
  };
}

export function useFaultStats(intervalMs = 5000) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await getFaultStats();

      if (res?.success) {
        setStats(res.data || null);
        setError('');
      }
    } catch (err) {
      setError(err?.message || 'Failed to load fault stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function safeLoad() {
      if (!cancelled) await load();
    }

    safeLoad();

    const id = setInterval(safeLoad, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [load, intervalMs]);

  return {
    stats,
    loading,
    error,
    reload: load,
  };
}