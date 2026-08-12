'use client';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useGames } from '@/lib/useGames';
import { useArenas } from '@/lib/useArenas';
import { todayISO, aprovadosDe, shareUrl, haversineKm } from '@/lib/gameUtils';
import { getRadiusPref, saveRadiusPref } from '@/lib/radiusPref';
import { useJustLotou } from '@/lib/useJustLotou';
import { useAuth } from './components/AuthProvider';
import { useToast } from './components/ToastProvider';
import GameCard from './components/GameCard';
import NewGameModal from './components/NewGameModal';
import NewArenaModal from './components/NewArenaModal';
import ConfirmModal from './components/ConfirmModal';
import ManageModal from './components/ManageModal';
import CancelPresencaModal from './components/CancelPresencaModal';
import NotificationBell from './components/NotificationBell';
import TicketButton from './components/TicketButton';
import EmptyFieldIcon from './components/EmptyFieldIcon';
import HeaderWatermark from './components/HeaderWatermark';

const MapViewPins = dynamic(() => import('./components/MapViewPins'), { ssr: false });

export default function Home() {
  const { user, profile, signOut } = useAuth();
  const { showToast } = useToast();
  const { games, loading, loadGames } = useGames();
  const { arenas, loadArenas } = useArenas();
  const justLotaram = useJustLotou(games, loading);
  const [modal, setModal] = useState(null); // 'new' | 'new-arena' | {type:'confirm', game} | {type:'manage', game}
  const [viewMode, setViewMode] = useState('lista'); // 'lista' | 'mapa'
  const [bairroFiltro, setBairroFiltro] = useState('');
  const [tab, setTab] = useState('todas'); // 'todas' | 'minhas'
  const [raioAtivo, setRaioAtivo] = useState(false);
  const [raioKm, setRaioKm] = useState(10);
  const [minhaLocalizacao, setMinhaLocalizacao] = useState(null);
  const [erroLocalizacao, setErroLocalizacao] = useState('');

  useEffect(() => {
    const salvo = getRadiusPref();
    if (salvo) setRaioKm(salvo);
  }, []);

  function toggleRaio() {
    if (raioAtivo) { setRaioAtivo(false); setErroLocalizacao(''); return; }
    if (!navigator.geolocation) { setErroLocalizacao('Seu navegador não suporta localização.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMinhaLocalizacao({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setRaioAtivo(true);
        setErroLocalizacao('');
      },
      () => setErroLocalizacao('Não consegui acessar sua localização.'),
      { timeout: 10000 }
    );
  }

  function handleRaioChange(e) {
    const km = Number(e.target.value);
    setRaioKm(km);
    saveRadiusPref(km);
  }

  function shareGame(g) {
    const d = g.data;
    const confirmados = aprovadosDe(g).length;
    const restantes = Math.max(0, g.vagas_totais - confirmados);
    const msg = `⚽ Pelada marcada!\n📍 ${g.local} (${g.bairro})\n📅 ${d} às ${g.horario}\n🔢 ${restantes} vaga(s) livre(s) de ${g.vagas_totais}\n👑 Capitão: ${g.capitao}\n\nConfirma presença: ${shareUrl(g.id)}`;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  }

  function handleCreated() {
    setModal(null);
    loadGames();
    showToast('Pelada criada!');
  }

  function handleArenaCreated() {
    setModal(null);
    loadArenas();
    showToast('Arena cadastrada!');
  }

  function handleConfirmed() {
    setModal(null);
    loadGames();
    showToast('Solicitação enviada! Aguardando aprovação do capitão.');
  }

  const today = todayISO();
  const upcoming = useMemo(
    () => games.filter((g) => g.data >= today).sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario)),
    [games, today]
  );

  const bairros = useMemo(
    () => Array.from(new Set(upcoming.map((g) => g.bairro))).sort((a, b) => a.localeCompare(b)),
    [upcoming]
  );

  const filtradas = useMemo(() => {
    let list = upcoming;
    if (bairroFiltro) list = list.filter((g) => g.bairro === bairroFiltro);
    if (tab === 'minhas') {
      list = list.filter((g) => aprovadosDe(g).some((c) => c.user_id === user?.id));
    }
    if (raioAtivo && minhaLocalizacao) {
      list = list.filter(
        (g) =>
          g.latitude != null &&
          g.longitude != null &&
          haversineKm(minhaLocalizacao.lat, minhaLocalizacao.lng, Number(g.latitude), Number(g.longitude)) <= raioKm
      );
    }
    return list;
  }, [upcoming, bairroFiltro, tab, user, raioAtivo, minhaLocalizacao, raioKm]);

  const hoje = filtradas.filter((g) => g.data === today);
  const proximas = filtradas.filter((g) => g.data !== today);

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
        justLotou={!!justLotaram[g.id]}
      />
    );
  }

  return (
    <div>
      <div className="pl-header">
        <HeaderWatermark />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div className="pl-brand"><div className="pl-brand-text">PELADEI<span>ROS</span></div></div>
          {profile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--paper-dim)' }}>
              <NotificationBell />
              <Link href="/perfil" style={{ color: 'var(--paper-dim)', textDecoration: 'none' }}>
                <span style={{ textDecoration: 'underline', textUnderlineOffset: 2 }}>{profile.nome}</span>
              </Link>
              <button className="pl-share-btn" onClick={signOut}>Sair</button>
            </div>
          )}
        </div>
        <p className="pl-tagline">achou o campo, chamou o povo, bateu bola</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
          <TicketButton onClick={() => setModal('new')}>Criar pelada</TicketButton>
          <TicketButton onClick={() => setModal('new-arena')}>Cadastrar arena</TicketButton>
        </div>
      </div>

      <div className="pl-tabs">
        <button className={`pl-tab ${tab === 'todas' ? 'active' : ''}`} onClick={() => setTab('todas')}>Peladas</button>
        <button className={`pl-tab ${tab === 'minhas' ? 'active' : ''}`} onClick={() => setTab('minhas')}>Minhas peladas</button>
      </div>

      <div className="pl-toolbar">
        <select className="pl-select" value={bairroFiltro} onChange={(e) => setBairroFiltro(e.target.value)}>
          <option value="">Todos os bairros</option>
          {bairros.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="pl-toggle-map" onClick={toggleRaio}>
            {raioAtivo ? `📍 Até ${raioKm}km` : '📍 Perto de mim'}
          </button>
          {raioAtivo && (
            <input
              type="range" min="1" max="50" value={raioKm}
              onChange={handleRaioChange}
              style={{ width: 90 }}
              aria-label="Raio em quilômetros"
            />
          )}
        </div>
        <button className="pl-toggle-map" onClick={() => setViewMode(viewMode === 'lista' ? 'mapa' : 'lista')}>
          {viewMode === 'lista' ? '🗺️ Ver no mapa' : '📋 Ver lista'}
        </button>
        {erroLocalizacao && <span style={{ fontSize: 11, color: 'var(--tag-red)' }}>{erroLocalizacao}</span>}
      </div>

      {loading ? (
        <div className="pl-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="pl-skeleton" style={{ height: 96 }} />
          ))}
        </div>
      ) : viewMode === 'mapa' ? (
        <MapViewPins games={filtradas} arenas={arenas} onConfirm={(game) => setModal({ type: 'confirm', game })} />
      ) : filtradas.length === 0 ? (
        <div className="pl-empty">
          <EmptyFieldIcon />
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--paper)' }}>
            {tab === 'minhas' ? 'Você não confirmou nenhuma pelada futura' : 'Nenhuma pelada marcada'}
          </h3>
          <p>{tab === 'minhas' ? 'Confirme presença numa pelada pra ela aparecer aqui.' : 'Seja o primeiro a chamar o povo pro campo essa semana.'}</p>
        </div>
      ) : (
        <>
          {hoje.length > 0 && <>
            <div className="pl-section-title" style={{ maxWidth: 640, margin: '18px auto 0', padding: '0 16px', fontFamily: 'var(--font-display)', color: 'var(--neon)', textTransform: 'uppercase' }}>Rolando hoje</div>
            <div className="pl-list">{hoje.map(renderCard)}</div>
          </>}
          {proximas.length > 0 && <>
            <div className="pl-section-title" style={{ maxWidth: 640, margin: '22px auto 0', padding: '0 16px', fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)' }}>Próximas peladas</div>
            <div className="pl-list">{proximas.map(renderCard)}</div>
          </>}
        </>
      )}

      {modal === 'new' && (
        <NewGameModal onCancel={() => setModal(null)} onCreated={handleCreated} />
      )}

      {modal === 'new-arena' && (
        <NewArenaModal onCancel={() => setModal(null)} onCreated={handleArenaCreated} />
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
