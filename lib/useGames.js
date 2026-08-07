'use client';
import { useEffect, useState, useCallback } from 'react';

export function useGames() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadGames = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/games');
    const data = await res.json();
    setGames(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  return { games, loading, loadGames };
}
