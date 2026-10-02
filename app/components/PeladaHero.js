'use client';
import GameArtBanner from './GameArtBanner';
import { fmtDate, ocupandoVagaDe, statusVagas } from '@/lib/gameUtils';

// Hero da tela de pelada vira o próprio cartaz do jogo — data carimbada,
// selo de vaga, nome do local gigante e horário/bairro/tipo por baixo,
// tudo sobre a arte do tipo de jogo (GameArtBanner, reaproveitada sem
// mudança nenhuma). Puramente decorativo: a parte interativa (status com
// a mesma cor/classe daqui, confirmar, chat...) continua só no GameCard
// logo abaixo, sem showArt — nada daqui duplica lógica, só reaproveita
// statusVagas() pra mostrar o mesmo selo com a mesma regra de cor.
export default function PeladaHero({ game }) {
  const d = fmtDate(game.data);
  const restantes = Math.max(0, game.vagas_totais - ocupandoVagaDe(game).length);
  const status = statusVagas(restantes, restantes === 0);
  const detalhes = [game.bairro, game.tipo].filter(Boolean).join(' · ');

  return (
    <div className="pl-pelada-hero">
      <GameArtBanner tipo={game.tipo} gameId={game.id} variant="hero" priority />

      <span className="pl-pelada-hero-date" aria-hidden="true">
        {d.dow}
        <small>{d.dom}</small>
      </span>
      <span className={`pl-status-badge pl-pelada-hero-status ${status.className}`}>{status.label}</span>

      <div className="pl-pelada-hero-text">
        <h1 className="pl-pelada-hero-local">{game.local}</h1>
        <p className="pl-pelada-hero-sub">
          <b>{game.horario}</b>{detalhes && ` · ${detalhes}`}
        </p>
      </div>
    </div>
  );
}
