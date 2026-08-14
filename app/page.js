'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useGames } from '@/lib/useGames';
import { todayISO, aprovadosDe, shareUrl } from '@/lib/gameUtils';
import { useJustLotou } from '@/lib/useJustLotou';
import { useAuth } from './components/AuthProvider';
import { useToast } from './components/ToastProvider';
import GameCard from './components/GameCard';
import NewGameModal from './components/NewGameModal';
import ConfirmModal from './components/ConfirmModal';
import ManageModal from './components/ManageModal';
import CancelPresencaModal from './components/CancelPresencaModal';
import NotificationBell from './components/NotificationBell';
import EmptyFieldIcon from './components/EmptyFieldIcon';
import HeaderWatermark from './components/HeaderWatermark';
import Avatar from './components/Avatar';

// Início responde uma pergunta só — "o que tenho agora": até 3 peladas
// rolando hoje (ou a próxima, se hoje não tiver nenhuma) + um link pra
// explorar tudo. Navegação completa (toggle, filtros, mapa) mora em
// /peladas — ver ali.
export default function Home() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const { games, loading, loadGames } = useGames();
  const justLotaram = useJustLotou(games, loading);
  const [modal, setModal] = useState(null); // 'new' | {type:'confirm', game} | {type:'manage', game} | {type:'cancelar', ...}

  // Bottom nav manda pra cá com ?criar=1 pra abrir o modal de criação, que
  // só existe nesta tela (sem inventar rota nova).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('criar') === '1') {
      setModal('new');
      window.history.replaceState(null, '', '/');
    }
  }, []);

  function shareGame(g) {
    const confirmados = aprovadosDe(g).length;
    const restantes = Math.max(0, g.vagas_totais - confirmados);
    const msg = `⚽ Pelada marcada!\n📍 ${g.local} (${g.bairro})\n📅 ${g.data} às ${g.horario}\n🔢 ${restantes} vaga(s) livre(s) de ${g.vagas_totais}\n👑 Capitão: ${g.capitao}\n\nConfirma presença: ${shareUrl(g.id)}`;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  }

  function handleCreated() {
    setModal(null);
    loadGames();
    showToast('Pelada criada!');
  }

  function handleConfirmed() {
    setModal(null);
    loadGames();
    showToast('Solicitação enviada! Aguardando aprovação do capitão.');
  }

  async function handleConfirmarVaga(confirmacaoId) {
    const res = await fetch(`/api/confirmacoes/${confirmacaoId}/confirmar-vaga`, { method: 'POST' });
    const result = await res.json();
    if (!res.ok) { showToast(result.error || 'Não consegui confirmar sua vaga.'); return; }
    loadGames();
    showToast('Vaga confirmada!');
  }

  const today = todayISO();
  const upcoming = useMemo(
    () => games.filter((g) => g.data >= today).sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario)),
    [games, today]
  );
  const hoje = useMemo(() => upcoming.filter((g) => g.data === today), [upcoming, today]);

  // Rolando hoje (até 3) — ou, se hoje não tiver nada, só a próxima pelada.
  const destaques = hoje.length > 0 ? hoje.slice(0, 3) : upcoming.slice(0, 1);
  const tituloSecao = hoje.length > 0 ? 'Rolando hoje' : 'Próxima pelada';

  function renderCard(g) {
    return (
      <GameCard
        key={g.id}
        game={g}
        currentUserId={user?.id}
        onEdit={(game) => setModal({ type: 'manage', game })}
        onConfirm={(game) => setModal({ type: 'confirm', game })}
        onShare={shareGame}
        onCancelPresenca={(confirmacaoId, game) => setModal({ type: 'cancelar', confirmacaoId, game })}
        onConfirmarVaga={handleConfirmarVaga}
        justLotou={!!justLotaram[g.id]}
      />
    );
  }

  return (
    <div>
      <div className="pl-header">
        <HeaderWatermark />
        <div className="pl-header-row">
          <div className="pl-brand"><div className="pl-brand-text">PELADEI<span>ROS</span></div></div>
          {profile && (
            <div className="pl-header-user">
              <span className="pl-header-bell"><NotificationBell /></span>
              <Link href="/perfil" className="pl-header-user-link" aria-label="Ver perfil">
                <Avatar nome={profile.nome} size={28} fotoUrl={profile.foto_url} />
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="pl-page-intro">
        <p className="pl-tagline">Vem pro fut, vem.</p>
      </div>

      {loading ? (
        <div className="pl-list">
          {[1, 2].map((i) => (
            <div key={i} className="pl-skeleton" style={{ height: 96 }} />
          ))}
        </div>
      ) : destaques.length === 0 ? (
        <div className="pl-empty">
          <EmptyFieldIcon />
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--paper)' }}>Nenhuma pelada marcada</h3>
          <p>Seja o primeiro a chamar o povo pro campo essa semana.</p>
        </div>
      ) : (
        <>
          <div className="pl-section-title" style={{ maxWidth: 640, margin: '18px auto 0', padding: '0 16px', fontFamily: 'var(--font-display)', color: 'var(--neon)', textTransform: 'uppercase' }}>{tituloSecao}</div>
          <div className="pl-list">{destaques.map(renderCard)}</div>
        </>
      )}

      <div className="pl-see-all-wrap">
        <Link href="/peladas" className="pl-see-all-link">Ver todas as peladas →</Link>
      </div>

      {modal === 'new' && (
        <NewGameModal onCancel={() => setModal(null)} onCreated={handleCreated} />
      )}

      {modal?.type === 'confirm' && (
        <ConfirmModal game={modal.game} onCancel={() => setModal(null)} onConfirmed={handleConfirmed} />
      )}

      {modal?.type === 'manage' && (
        <ManageModal game={modal.game} onClose={() => setModal(null)} onSaved={() => { setModal(null); loadGames(); }} />
      )}

      {modal?.type === 'cancelar' && (
        <CancelPresencaModal
          confirmacaoId={modal.confirmacaoId}
          game={modal.game}
          onClose={() => setModal(null)}
          onCancelled={() => { setModal(null); loadGames(); showToast('Presença cancelada.'); }}
        />
      )}
    </div>
  );
}
