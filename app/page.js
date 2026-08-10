'use client';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useGames } from '@/lib/useGames';
import { useArenas } from '@/lib/useArenas';
import { todayISO, confirmadosDe, normalizeWhatsapp, shareUrl } from '@/lib/gameUtils';
import { saveCaptainCode } from '@/lib/captainCodes';
import GameCard from './components/GameCard';
import NewGameModal from './components/NewGameModal';
import NewArenaModal from './components/NewArenaModal';
import ConfirmModal from './components/ConfirmModal';
import ManageModal from './components/ManageModal';

const MapViewPins = dynamic(() => import('./components/MapViewPins'), { ssr: false });

export default function Home() {
  const { games, loading, loadGames } = useGames();
  const { arenas, loadArenas } = useArenas();
  const [modal, setModal] = useState(null); // 'new' | 'new-arena' | {type:'confirm', game} | {type:'manage', game}
  const [perfil, setPerfil] = useState(null);
  const [viewMode, setViewMode] = useState('lista'); // 'lista' | 'mapa'
  const [bairroFiltro, setBairroFiltro] = useState('');
  const [tab, setTab] = useState('todas'); // 'todas' | 'minhas'

  useEffect(() => {
    const saved = localStorage.getItem('peladeiros:perfil');
    if (saved) setPerfil(JSON.parse(saved));
  }, []);

  function shareGame(g) {
    const d = g.data;
    const confirmados = confirmadosDe(g).length;
    const restantes = Math.max(0, g.vagas_totais - confirmados);
    const msg = `⚽ Pelada marcada!\n📍 ${g.local} (${g.bairro})\n📅 ${d} às ${g.horario}\n🔢 ${restantes} vaga(s) livre(s) de ${g.vagas_totais}\n👑 Capitão: ${g.capitao}\n\nConfirma presença: ${shareUrl(g.id)}`;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  }

  function handleCreated(newGame, codigo) {
    saveCaptainCode(newGame.id, codigo);
    setModal(null);
    loadGames();
  }

  function handleArenaCreated() {
    setModal(null);
    loadArenas();
  }

  function handleConfirmed({ nome, whatsapp }) {
    localStorage.setItem('peladeiros:perfil', JSON.stringify({ nome, whatsapp }));
    setPerfil({ nome, whatsapp });
    setModal(null);
    loadGames();
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

  const minhasWhatsapp = perfil ? normalizeWhatsapp(perfil.whatsapp) : null;

  const filtradas = useMemo(() => {
    let list = upcoming;
    if (bairroFiltro) list = list.filter((g) => g.bairro === bairroFiltro);
    if (tab === 'minhas') {
      list = list.filter((g) => minhasWhatsapp && confirmadosDe(g).some((c) => normalizeWhatsapp(c.whatsapp) === minhasWhatsapp));
    }
    return list;
  }, [upcoming, bairroFiltro, tab, minhasWhatsapp]);

  const hoje = filtradas.filter((g) => g.data === today);
  const proximas = filtradas.filter((g) => g.data !== today);

  function renderCard(g) {
    return (
      <GameCard
        key={g.id}
        game={g}
        onEdit={(game) => setModal({ type: 'manage', game })}
        onConfirm={(game) => setModal({ type: 'confirm', game })}
        onShare={shareGame}
      />
    );
  }

  return (
    <div>
      <div className="pl-header">
        <div className="pl-brand"><div className="pl-brand-text">PELADEI<span>ROS</span></div></div>
        <p className="pl-tagline">achou o campo, chamou o povo, bateu bola</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="pl-newbtn" onClick={() => setModal('new')}>+ Criar pelada</button>
          <button className="pl-newbtn pl-newbtn-secondary" onClick={() => setModal('new-arena')}>+ Cadastrar arena</button>
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
        <button className="pl-toggle-map" onClick={() => setViewMode(viewMode === 'lista' ? 'mapa' : 'lista')}>
          {viewMode === 'lista' ? '🗺️ Ver no mapa' : '📋 Ver lista'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--paper-dim)' }}>Carregando peladas...</div>
      ) : tab === 'minhas' && !perfil ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--paper-dim)' }}>
          <p>Confirme presença em alguma pelada primeiro pra ela aparecer aqui.</p>
        </div>
      ) : viewMode === 'mapa' ? (
        <MapViewPins games={filtradas} arenas={arenas} onConfirm={(game) => setModal({ type: 'confirm', game })} />
      ) : filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--paper-dim)' }}>
          <div style={{ fontSize: 40 }}>⚽</div>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--paper)' }}>
            {tab === 'minhas' ? 'Você não confirmou nenhuma pelada futura' : 'Nenhuma pelada marcada'}
          </h3>
          <p>{tab === 'minhas' ? 'Confirme presença numa pelada pra ela aparecer aqui.' : 'Seja o primeiro a chamar o povo pro campo essa semana.'}</p>
        </div>
      ) : (
        <>
          {hoje.length > 0 && <>
            <div style={{ maxWidth: 640, margin: '18px auto 0', padding: '0 16px', fontFamily: 'var(--font-display)', color: 'var(--neon)', textTransform: 'uppercase' }}>Rolando hoje</div>
            <div className="pl-list">{hoje.map(renderCard)}</div>
          </>}
          {proximas.length > 0 && <>
            <div style={{ maxWidth: 640, margin: '22px auto 0', padding: '0 16px', fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)' }}>Próximas peladas</div>
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
        <ConfirmModal game={modal.game} perfil={perfil} onCancel={() => setModal(null)} onConfirmed={handleConfirmed} />
      )}

      {modal?.type === 'manage' && (
        <ManageModal game={modal.game} onClose={() => setModal(null)} onSaved={() => { setModal(null); loadGames(); }} />
      )}
    </div>
  );
}
