'use client';
import { fmtDate, ocupandoVagaDe, statusVagas } from '@/lib/gameUtils';
import TicketButton from './TicketButton';
import CaptainIcon from './CaptainIcon';
import TipoJogoIcon from './TipoJogoIcon';

// Card único de destaque pra pelada mais próxima — fundo com a foto real
// da arena vinculada, quando existir, ou um padrão gráfico temático
// (nunca preto liso) quando não tiver. Réplica só do essencial do
// GameCard normal (não duplica edição/banco/compartilhar).
export default function NextGameHero({ game, onConfirm, currentUserId }) {
  const g = game;
  const d = fmtDate(g.data);
  const ocupadas = ocupandoVagaDe(g).length;
  const restantes = Math.max(0, g.vagas_totais - ocupadas);
  const lotado = restantes === 0;
  const status = statusVagas(restantes, lotado);
  const minhaConfirmacao = (g.confirmacoes || []).find((c) => c.user_id === currentUserId);
  const jaDentro = minhaConfirmacao?.status === 'aprovado';
  const aguardando = minhaConfirmacao?.status === 'pendente';
  const vagaPendente = minhaConfirmacao?.status === 'aguardando_confirmacao';
  const fotoArena = g.arenas?.foto_url || null;

  return (
    <div className="pl-next-game-wrap">
      <div className="pl-next-game-title">⚡ Próxima pelada</div>
      <div
        className={`pl-next-game-card ${fotoArena ? 'pl-next-game-photo' : 'pl-next-game-pattern'}`}
        style={fotoArena ? { backgroundImage: `linear-gradient(180deg, rgba(10,10,10,0.25), rgba(10,10,10,0.94)), url(${fotoArena})` } : undefined}
      >
        <div className="pl-next-game-meta">{d.dow} {d.dom} · {g.horario}</div>
        <h3>{g.local}</h3>
        <div className="pl-next-game-meta">
          {g.bairro}
          {g.tipo && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 8 }}><TipoJogoIcon tipo={g.tipo} size={12} /> {g.tipo}</span>}
        </div>
        <div className="pl-next-game-status">{status.label}</div>
        <p style={{ fontSize: 12, color: 'var(--paper-dim)', display: 'flex', alignItems: 'center', margin: '2px 0 0' }}>
          <CaptainIcon /> {g.capitao}
        </p>
        {jaDentro ? (
          <span className="pl-inside-badge" style={{ marginTop: 8 }}>✓ Você está dentro</span>
        ) : aguardando ? (
          <p className="pl-aguardando">Aguardando aprovação do capitão</p>
        ) : vagaPendente ? (
          <p className="pl-aguardando">Aprovado — falta você confirmar</p>
        ) : (
          <TicketButton compact onClick={() => onConfirm(g)}>{lotado ? 'Entrar no banco' : 'Confirmar'}</TicketButton>
        )}
      </div>
    </div>
  );
}
