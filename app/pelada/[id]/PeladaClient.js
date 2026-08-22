'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { aprovadosDe, shareUrl } from '@/lib/gameUtils';
import { useJustLotou } from '@/lib/useJustLotou';
import { useAuth } from '../../components/AuthProvider';
import { useToast } from '../../components/ToastProvider';
import GameCard from '../../components/GameCard';
import ConfirmModal from '../../components/ConfirmModal';
import ManageModal from '../../components/ManageModal';
import CancelPresencaModal from '../../components/CancelPresencaModal';
import EncerrarPartidaModal from '../../components/EncerrarPartidaModal';
import EscalacaoField from '../../components/EscalacaoField';
import EmptyFieldIcon from '../../components/EmptyFieldIcon';
import BackLink from '../../components/BackLink';
import Brand from '../../components/Brand';

// Só quem pode editar a pelada (capitão) vê o botão, e só depois que o
// horário já passou e ela ainda não foi encerrada.
function podeEncerrar(game, user) {
  if (!game || game.encerrada_em) return false;
  const podeEditar = !game.owner_id || game.owner_id === user?.id;
  if (!podeEditar) return false;
  return new Date(`${game.data}T${game.horario}`).getTime() <= Date.now();
}

export default function PeladaClient({ id }) {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [modal, setModal] = useState(null);
  const justLotaram = useJustLotou(game, loading);

  const loadGame = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/games/${id}`);
    if (res.status === 404) { setNotFound(true); setLoading(false); return; }
    const data = await res.json();
    setGame(data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadGame();
  }, [loadGame]);

  function shareGame(g) {
    const confirmados = aprovadosDe(g).length;
    const restantes = Math.max(0, g.vagas_totais - confirmados);
    const msg = `⚽ Pelada marcada!\n📍 ${g.local} (${g.bairro})\n📅 ${g.data} às ${g.horario}\n🔢 ${restantes} vaga(s) livre(s) de ${g.vagas_totais}\n👑 Capitão: ${g.capitao}\n\nConfirma presença: ${shareUrl(g.id)}`;
    const win = window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
    if (win) showToast('📲 Pelada compartilhada');
  }

  async function handleConfirmarVaga(confirmacaoId) {
    const res = await fetch(`/api/confirmacoes/${confirmacaoId}/confirmar-vaga`, { method: 'POST' });
    const result = await res.json();
    if (!res.ok) { showToast(result.error || 'Não consegui confirmar sua vaga.'); return; }
    loadGame();
    showToast('🔥 Você entrou no jogo!');
  }

  function handleConfirmClick(g) {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/pelada/${id}`)}`);
      return;
    }
    setModal({ type: 'confirm', game: g });
  }

  if (loading) {
    return (
      <div className="pl-list" style={{ paddingTop: 24 }}>
        <div className="pl-skeleton" style={{ height: 96 }} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="pl-empty">
        <EmptyFieldIcon />
        <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--paper)' }}>Pelada não encontrada</h3>
        <p>Ela pode ter sido cancelada pelo capitão.</p>
        <Link href="/" className="pl-ticket" style={{ display: 'inline-flex', marginTop: 12, textDecoration: 'none' }}>
          <span className="pl-ticket-label">Ver todas as peladas</span>
          <span className="pl-ticket-stub" aria-hidden="true">⚽</span>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="pl-header">
        <BackLink href="/">Todas as peladas</BackLink>
        <Brand style={{ marginTop: 10 }} />
      </div>

      <div className="pl-list" style={{ paddingTop: 14 }}>
        <GameCard
          game={game}
          currentUserId={user?.id}
          onEdit={(g) => setModal({ type: 'manage', game: g })}
          onConfirm={handleConfirmClick}
          onShare={shareGame}
          onCancelPresenca={(confirmacaoId, g) => setModal({ type: 'cancelar', confirmacaoId, game: g })}
          onConfirmarVaga={handleConfirmarVaga}
          justLotou={!!justLotaram[game?.id]}
        />
      </div>

      {podeEncerrar(game, user) && (
        <div className="pl-list" style={{ paddingTop: 0 }}>
          <button type="button" className="pl-btn-secondary" style={{ width: '100%' }} onClick={() => setModal({ type: 'encerrar', game })}>
            Encerrar partida
          </button>
        </div>
      )}

      {(game.tipo || game.nivel || game.valor || game.regras) && (
        <div className="pl-list" style={{ paddingTop: 0 }}>
          <div className="pl-card" style={{ display: 'block' }}>
            <div className="pl-pending-title pl-section-title">Detalhes</div>
            <div style={{ fontSize: 13, color: 'var(--paper-dim)', lineHeight: 1.7 }}>
              {game.tipo && <div>Tipo: {game.tipo}</div>}
              {game.nivel && <div>Nível: {game.nivel}</div>}
              {game.valor != null && <div>Valor: R$ {Number(game.valor).toFixed(2)} por pessoa</div>}
              {game.regras && <div>Regras: {game.regras}</div>}
            </div>
          </div>
        </div>
      )}

      <EscalacaoField game={game} />

      {modal?.type === 'confirm' && (
        <ConfirmModal game={modal.game} onCancel={() => setModal(null)} onConfirmed={() => { setModal(null); loadGame(); showToast('Solicitação enviada! Aguardando aprovação do capitão.'); }} />
      )}

      {modal?.type === 'manage' && (
        <ManageModal game={modal.game} onClose={() => setModal(null)} onSaved={() => { setModal(null); loadGame(); }} />
      )}

      {modal?.type === 'cancelar' && (
        <CancelPresencaModal
          confirmacaoId={modal.confirmacaoId}
          game={modal.game}
          onClose={() => setModal(null)}
          onCancelled={() => { setModal(null); loadGame(); showToast('Presença cancelada.'); }}
        />
      )}

      {modal?.type === 'encerrar' && (
        <EncerrarPartidaModal
          game={modal.game}
          onClose={() => setModal(null)}
          onEncerrada={() => { setModal(null); loadGame(); showToast('Partida encerrada! Avaliações liberadas.'); }}
        />
      )}
    </div>
  );
}
