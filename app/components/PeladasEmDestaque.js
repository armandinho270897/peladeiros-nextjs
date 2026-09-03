'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fmtDate, ocupandoVagaDe, statusVagas } from '@/lib/gameUtils';
import { imagemDoTipo, imagemFixaPorId } from '@/lib/tipoJogoImagem';
import { useImagensTelainicial } from '@/lib/useImagensTelainicial';

const MAX_CARDS = 6;

// Faixa de peladas próximas/em breve na Home — antes, quem tinha pouca
// atividade (usuário novo, sem pendência) só via o card de patente e um
// bloco vazio "Só falta você.", sem nada que mostrasse que o app tem gente
// jogando de verdade. Reaproveita /api/games/mapa (já usado pelo seletor de
// local pro mesmo fim: peladas futuras com coordenada, leve, sem o join de
// avaliações que /api/games carrega). Sempre visível quando existir pelo
// menos 1 pelada futura no sistema — não depende do usuário ter algo
// pendente ou confirmado.
export default function PeladasEmDestaque() {
  const [games, setGames] = useState(null); // null = carregando
  const imagensTelainicial = useImagensTelainicial();

  useEffect(() => {
    fetch('/api/games/mapa')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setGames(Array.isArray(data) ? data : []))
      .catch(() => setGames([]));
  }, []);

  if (games === null) {
    return (
      <div className="pl-destaque-row pl-reveal pl-reveal-3">
        {[1, 2, 3].map((i) => <div key={i} className="pl-skeleton" style={{ width: 148, height: 168, flexShrink: 0, borderRadius: 'var(--radius-md)' }} />)}
      </div>
    );
  }

  if (games.length === 0) return null;

  const destaques = [...games]
    .sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario))
    .slice(0, MAX_CARDS);

  return (
    <div className="pl-reveal pl-reveal-3">
      <div className="pl-destaque-title">Rolando por aí</div>
      <div className="pl-destaque-row">
        {destaques.map((g) => {
          const restantes = Math.max(0, g.vagas_totais - ocupandoVagaDe(g).length);
          const statusClasse = statusVagas(restantes, restantes === 0).className;
          const art = imagemDoTipo(g.tipo) || imagemFixaPorId(g.id, imagensTelainicial);
          const d = fmtDate(g.data);
          return (
            <Link key={g.id} href={`/pelada/${g.id}`} className={`pl-destaque-card ${statusClasse}`}>
              <div className="pl-destaque-card-art" style={art ? { backgroundImage: `url(${art})` } : undefined} />
              <div className="pl-destaque-card-body">
                <span className="pl-destaque-card-date">{d.dow} · {g.horario.slice(0, 5)}</span>
                <span className="pl-destaque-card-local">{g.local}</span>
                <span className="pl-destaque-card-vagas">{restantes > 0 ? `${restantes} vaga${restantes === 1 ? '' : 's'}` : 'Lotada'}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
