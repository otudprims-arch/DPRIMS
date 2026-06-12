// src/hooks/useSystemTimeline.js
import { useEffect, useState } from 'react';
import { getSystemTimeline } from '../services/api';

export function useSystemTimeline(limit = 50, intervalMs = 5000) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchTimeline() {
      try {
        const data = await getSystemTimeline(limit);

        const safeEvents = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : [];

        if (!cancelled) {
          setEvents(safeEvents);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setEvents([]);
          setError(err?.message || 'Failed to load system timeline');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTimeline();
    const id = setInterval(fetchTimeline, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [limit, intervalMs]);

  return { events, loading, error };
}

export default useSystemTimeline;
