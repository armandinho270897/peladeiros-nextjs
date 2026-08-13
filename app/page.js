'use client';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useGames } from '@/lib/useGames';
import { useArenas } from '@/lib/useArenas';
import { todayISO, aprovadosDe, shareUrl, haversineKm, fmtDate } from '@/lib/gameUtils';
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

function amanhaISO(hojeISO) {
  const [y, m, d] = hojeISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d + 1);
  return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
}

function NextGameHero({ game }) {
  if (!game) return null;
  const d = fmtDate(game.data);
  return (
    <div className="pl-next-game-wrap">
      <div className="pl-next-game-title">🟢 Sua próxima pelada</div>
      <div className="pl-next-game-card">
        <h3>{game.local}</h3>
        <p className="pl-next-game-meta">{d.dow} {d.dom} · {game.horario} · {game.bairro}</p>
        <p className="pl-next-game-status">✓ Presença confirmada</p>
        <Link href={`/pelada/${game.id}`} className="pl-ticket pl-ticket-compact" style={{ textDecoration: 'none' }}>
          <span className="pl-ticket-label">Ver detalhes</span>
          <span className="pl-ticket-stub" aria-hidden="true">⚽</span>
        </Link>
      </div>
    </div>
  );
}

export default function Home() {
  const { user, profile } = useAuth();
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
  const [dataChip, setDataChip] = useState(''); // '' | 'hoje' | 'amanha'
  const [tipoChip, setTipoChip] = useState(''); // '' | 'Futebol de campo' | 'Futsal'
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  useEffect(() => {
    const salvo = getRadiusPref();
    if (salvo) setRaioKm(salvo);
  }, []);

  // Bottom nav manda pra cá com ?criar=1 ou ?mapa=1 pra disparar ações que
  // hoje só existem nesta tela (sem inventar rota nova).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('criar') === '1') setModal('new');
    if (params.get('mapa') === '1') setViewMode('mapa');
    if (params.has('criar') || params.has('mapa')) {
      window.history.replaceState(null, '', '/');
    }
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

  function distanciaDe(g) {
    if (!minhaLocalizacao || g.latitude == null || g.longitude == null) return null;
    return haversineKm(minhaLocalizacao.lat, minhaLocalizacao.lng, Number(g.latitude), Number(g.longitude));
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

  async function handleConfirmarVaga(confirmacaoId) {
    const res = await fetch(`/api/confirmacoes/${confirmacaoId}/confirmar-vaga`, { method: 'POST' });
    const result = await res.json();
    if (!res.ok) { showToast(result.error || 'Não consegui confirmar sua vaga.'); return; }
    loadGames();
    showToast('Vaga confirmada!');
  }

  const today = todayISO();
  const amanha = amanhaISO(today);
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
    if (tab === 'minhas') {
      // Aba "Minhas peladas" mostra tudo que o usuário confirmou, sem os
      // chips de filtro (que só fazem sentido navegando "Peladas").
      return list.filter((g) => aprovadosDe(g).some((c) => c.user_id === user?.id));
    }
    if (bairroFiltro) list = list.filter((g) => g.bairro === bairroFiltro);
    if (dataChip === 'hoje') list = list.filter((g) => g.data === today);
    if (dataChip === 'amanha') list = list.filter((g) => g.data === amanha);
    if (tipoChip) list = list.filter((g) => g.tipo === tipoChip);
    if (raioAtivo && minhaLocalizacao) {
      list = list.filter(
        (g) =>
          g.latitude != null &&
          g.longitude != null &&
          haversineKm(minhaLocalizacao.lat, minhaLocalizacao.lng, Number(g.latitude), Number(g.longitude)) <= raioKm
      );
    }
    return list;
  }, [upcoming, bairroFiltro, tab, user, dataChip, amanha, today, tipoChip, raioAtivo, minhaLocalizacao, raioKm]);

  const hoje = filtradas.filter((g) => g.data === today);
  const proximas = filtradas.filter((g) => g.data !== today);

  const proximaMinhaPelada = tab === 'minhas' ? filtradas[0] : null;
  const listaMinhasRestante = tab === 'minhas' ? filtradas.slice(1) : filtradas;
  const hojeMinhas = listaMinhasRestante.filter((g) => g.data === today);
  const proximasMinhas = listaMinhasRestante.filter((g) => g.data !== today);

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
        distanciaKm={distanciaDe(g)}
      />
    );
  }

  const secaoHoje = tab === 'minhas' ? hojeMinhas : hoje;
  const secaoProximas = tab === 'minhas' ? proximasMinhas : proximas;

  return (
    <div>
      <div className="pl-header">
        <HeaderWatermark />
        <div className="pl-header-row">
          <div className="pl-brand"><div className="pl-brand-text">PELADEI<span>ROS</span></div></div>
          {profile && (
            <div className="pl-header-user">
              <NotificationBell />
              <Link href="/perfil" className="pl-header-user-link">
                <span style={{ textDecoration: 'underline', textUnderlineOffset: 2 }}>{profile.nome}</span>
              </Link>
            </div>
          )}
        </div>
        <p className="pl-tagline">achou o campo, chamou o povo, bateu bola</p>
        <div className="pl-header-actions">
          <TicketButton onClick={() => setModal('new')}>Criar pelada</TicketButton>
          <button className="pl-link-muted" onClick={() => setModal('new-arena')}>Cadastrar arena</button>
        </div>
      </div>

      <div className="pl-tabs">
        <button className={`pl-tab ${tab === 'todas' ? 'active' : ''}`} onClick={() => setTab('todas')}>Peladas</button>
        <button className={`pl-tab ${tab === 'minhas' ? 'active' : ''}`} onClick={() => setTab('minhas')}>Minhas peladas</button>
      </div>

      {tab === 'minhas' ? (
        !loading && <NextGameHero game={proximaMinhaPelada} />
      ) : (
        <>
          <div className="pl-hero-title-row">
            <h2 className="pl-hero-title">⚽ Peladas perto de você</h2>
            <span className="pl-hero-count">
              {filtradas.length} pelada{filtradas.length === 1 ? '' : 's'} encontrada{filtradas.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="pl-chips-row">
            <button className={`pl-chip ${dataChip === 'hoje' ? 'active' : ''}`} onClick={() => setDataChip(dataChip === 'hoje' ? '' : 'hoje')}>Hoje</button>
            <button className={`pl-chip ${dataChip === 'amanha' ? 'active' : ''}`} onClick={() => setDataChip(dataChip === 'amanha' ? '' : 'amanha')}>Amanhã</button>
            <button className={`pl-chip ${raioAtivo ? 'active' : ''}`} onClick={toggleRaio}>📍 Perto</button>
            <button className={`pl-chip ${tipoChip === 'Futebol de campo' ? 'active' : ''}`} onClick={() => setTipoChip(tipoChip === 'Futebol de campo' ? '' : 'Futebol de campo')}>Futebol</button>
            <button className={`pl-chip ${tipoChip === 'Futsal' ? 'active' : ''}`} onClick={() => setTipoChip(tipoChip === 'Futsal' ? '' : 'Futsal')}>Futsal</button>
            <button className={`pl-chip pl-chip-filtros ${filtrosAbertos ? 'active' : ''}`} onClick={() => setFiltrosAbertos((v) => !v)}>⚙ Filtros</button>
          </div>
          {erroLocalizacao && <div style={{ maxWidth: 640, margin: '4px auto 0', padding: '0 16px', fontSize: 11, color: 'var(--tag-red)' }}>{erroLocalizacao}</div>}

          {filtrosAbertos && (
            <div className="pl-filters-panel-outer">
              <div className="pl-filters-panel">
                <select className="pl-select" value={bairroFiltro} onChange={(e) => setBairroFiltro(e.target.value)}>
                  <option value="">Todos os bairros</option>
                  {bairros.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
                {raioAtivo && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--paper-dim)' }}>
                    Raio: {raioKm}km
                    <input type="range" min="1" max="50" value={raioKm} onChange={handleRaioChange} style={{ width: 90 }} aria-label="Raio em quilômetros" />
                  </label>
                )}
                <button className="pl-toggle-map" style={{ marginLeft: 0 }} onClick={() => setViewMode(viewMode === 'lista' ? 'mapa' : 'lista')}>
                  {viewMode === 'lista' ? '🗺️ Ver no mapa' : '📋 Ver lista'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

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
      ) : (tab === 'minhas' && listaMinhasRestante.length === 0) ? null : (
        <>
          {secaoHoje.length > 0 && <>
            <div className="pl-section-title" style={{ maxWidth: 640, margin: '18px auto 0', padding: '0 16px', fontFamily: 'var(--font-display)', color: 'var(--neon)', textTransform: 'uppercase' }}>Rolando hoje</div>
            <div className="pl-list">{secaoHoje.map(renderCard)}</div>
          </>}
          {secaoProximas.length > 0 && <>
            <div className="pl-section-title" style={{ maxWidth: 640, margin: '22px auto 0', padding: '0 16px', fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)' }}>{tab === 'minhas' ? 'Outras peladas confirmadas' : 'Próximas peladas'}</div>
            <div className="pl-list">{secaoProximas.map(renderCard)}</div>
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
