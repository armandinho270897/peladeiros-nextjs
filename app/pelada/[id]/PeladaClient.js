'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { confirmadosDe, shareUrl } from '@/lib/gameUtils';
import { useAuth } from '../../components/AuthProvider';
import GameCard from '../../components/GameCard';
import ConfirmModal from '../../components/ConfirmModal';
import ManageModal from '../../components/ManageModal';

export default function PeladaClient({ id }) {
  const router = useRouter();
  const { user } = useAuth();
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
    const confirmados = confirmadosDe(g).length;
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
    return <div style={{ textAlign: 'center', padding: 60, color: 'var(--paper-dim)' }}>Carregando pelada...</div>;
  }

  if (notFound) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--paper-dim)' }}>
        <div style={{ fontSize: 40 }}>⚽</div>
        <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--paper)' }}>Pelada não encontrada</h3>
        <p>Ela pode ter sido cancelada pelo capitão.</p>
        <Link href="/" className="pl-btn-primary" style={{ display: 'inline-block', marginTop: 12, textDecoration: 'none' }}>Ver todas as peladas</Link>
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
        />
      </div>

      {modal?.type === 'confirm' && (
        <ConfirmModal game={modal.game} onCancel={() => setModal(null)} onConfirmed={() => { setModal(null); loadGame(); }} />
      )}

      {modal?.type === 'manage' && (
        <ManageModal game={modal.game} onClose={() => setModal(null)} onSaved={() => { setModal(null); loadGame(); }} />
      )}
    </div>
  );
}
