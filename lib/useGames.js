'use client';
import { useEffect, useState, useCallback, useRef } from 'react';

function paramsParaQueryString(params) {
  const usp = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params || {})) {
    if (valor === undefined || valor === null || valor === '') continue;
    usp.set(chave, String(valor));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

// `params` (opcional) vira query string pro GET /api/games — sem nenhum
// param, o servidor devolve a lista completa (mesmo comportamento de
// sempre, usado pela aba "Minhas peladas"). Com params, o servidor filtra/
// ordena/limita (tela de Descoberta). `total` é a contagem ANTES do corte
// de `limit` — usado pra mostrar "X peladas encontradas" mesmo quando a
// lista voltou truncada.
export function useGames(params) {
  const [games, setGames] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const loadGames = useCallback(async () => {
    setLoading(true);
    setErro(false);
    try {
      const res = await fetch(`/api/games${paramsParaQueryString(paramsRef.current)}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error('falha ao buscar peladas');
      const lista = Array.isArray(data) ? data : Array.isArray(data?.games) ? data.games : [];
      setGames(lista);
      setTotal(typeof data?.total === 'number' ? data.total : lista.length);
    } catch {
      // queda de rede ou erro do servidor — mantém a lista anterior na tela
      // em vez de esvaziar, só sinaliza pro chamador mostrar um aviso.
      setErro(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch quando os valores dos filtros mudam — serializado em string pra
  // não disparar de novo só porque o objeto `params` é uma referência nova
  // a cada render (o chamador normalmente recria o objeto inline).
  const paramsKey = JSON.stringify(params || {});
  useEffect(() => {
    loadGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, loadGames]);

  return { games, total, loading, erro, loadGames };
}
