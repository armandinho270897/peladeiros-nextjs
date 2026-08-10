'use client';
import { useEffect, useState, useCallback } from 'react';

export function useArenas() {
  const [arenas, setArenas] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadArenas = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/arenas');
    const data = await res.json();
    setArenas(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadArenas();
  }, [loadArenas]);

  return { arenas, loading, loadArenas };
}
