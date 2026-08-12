'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { aprovadosDe, shareUrl } from '@/lib/gameUtils';
import { useAuth } from '../../components/AuthProvider';
import { useToast } from '../../components/ToastProvider';
import GameCard from '../../components/GameCard';
import ConfirmModal from '../../components/ConfirmModal';
import ManageModal from '../../components/ManageModal';
import CancelPresencaModal from '../../components/CancelPresencaModal';
import EscalacaoField from '../../components/EscalacaoField';
import EmptyFieldIcon from '../../components/EmptyFieldIcon';

export default function PeladaClient({ id }) {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [modal, setModal] = useState(null);

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
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
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
        <Link href="/" style={{ color: 'var(--neon)', fontSize: 13, textDecoration: 'none' }}>&larr; Todas as peladas</Link>
        <div className="pl-brand" style={{ marginTop: 10 }}><div className="pl-brand-text">PELADEI<span>ROS</span></div></div>
      </div>

      <div className="pl-list" style={{ paddingTop: 14 }}>
        <GameCard
          game={game}
          currentUserId={user?.id}
          onEdit={(g) => setModal({ type: 'manage', game: g })}
          onConfirm={handleConfirmClick}
          onShare={shareGame}
          onCancelPresenca={(confirmacaoId) => setModal({ type: 'cancelar', confirmacaoId })}
        />
      </div>

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
          onClose={() => setModal(null)}
          onCancelled={() => { setModal(null); loadGame(); showToast('Presença cancelada.'); }}
        />
      )}
    </div>
  );
}
