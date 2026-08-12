'use client';
import { useEffect, useRef, useState } from 'react';
import { ocupandoVagaDe } from './gameUtils';

// Rastreia, por game id, se a pelada acabou de lotar (comparando a contagem
// de vagas ocupadas — aprovado + aguardando_confirmacao, mesmo critério do
// carimbo "Lotado" no GameCard — com a da vez anterior). Vive no componente
// pai (não no GameCard) porque as telas mostram um skeleton a cada refetch —
// isso desmonta o GameCard e perderia qualquer ref interna de "acabei de mudar".
export function useJustLotou(games, loading) {
  const prevCountRef = useRef({});
  const [justLotaram, setJustLotaram] = useState({});

  useEffect(() => {
    if (loading) return;
    const lista = Array.isArray(games) ? games : [games];
    const novos = {};
    for (const g of lista) {
      if (!g) continue;
      const count = ocupandoVagaDe(g).length;
      const prev = prevCountRef.current[g.id];
      if (prev !== undefined) {
        const restantesAntes = Math.max(0, g.vagas_totais - prev);
        const restantesAgora = Math.max(0, g.vagas_totais - count);
        if (restantesAntes > 0 && restantesAgora === 0) novos[g.id] = true;
      }
      prevCountRef.current[g.id] = count;
    }

    const ids = Object.keys(novos);
    if (ids.length === 0) return;

    setJustLotaram((prev) => ({ ...prev, ...novos }));
    const t = setTimeout(() => {
      setJustLotaram((prev) => {
        const next = { ...prev };
        ids.forEach((id) => delete next[id]);
        return next;
      });
    }, 1500);
    return () => clearTimeout(t);
  }, [games, loading]);

  return justLotaram;
}
