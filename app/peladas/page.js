'use client';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useGames } from '@/lib/useGames';
import { useArenas } from '@/lib/useArenas';
import { todayISO, aprovadosDe, shareUrl, haversineKm } from '@/lib/gameUtils';
import { getRadiusPref, saveRadiusPref } from '@/lib/radiusPref';
import { useJustLotou } from '@/lib/useJustLotou';
import { ADMIN_USER_ID } from '@/lib/adminConfig';
import { useAuth } from '../components/AuthProvider';
import { useToast } from '../components/ToastProvider';
import GameCard from '../components/GameCard';
import NewArenaModal from '../components/NewArenaModal';
import ConfirmModal from '../components/ConfirmModal';
import ManageModal from '../components/ManageModal';
import CancelPresencaModal from '../components/CancelPresencaModal';
import EmptyFieldIcon from '../components/EmptyFieldIcon';
import TipoJogoIcon from '../components/TipoJogoIcon';

const MapViewPins = dynamic(() => import('../components/MapViewPins'), { ssr: false });

function amanhaISO(hojeISO) {
  const [y, m, d] = hojeISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d + 1);
  return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
}

// Aba "Peladas" — onde mora a navegação completa: os dois toggles (todas /
// minhas), chips de filtro, raio, mapa/lista e cadastro de arena. A Início
// só mostra um recorte curado; quem quer "explorar tudo" vem pra cá.
export default function PeladasPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { games, loading, loadGames } = useGames();
  const { arenas, loadArenas } = useArenas();
  const justLotaram = useJustLotou(games, loading);
  const [modal, setModal] = useState(null); // 'new-arena' | {type:'confirm', game} | {type:'manage', game} | {type:'cancelar', ...}
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
    const confirmados = aprovadosDe(g).length;
    const restantes = Math.max(0, g.vagas_totais - confirmados);
    const msg = `⚽ Pelada marcada!\n📍 ${g.local} (${g.bairro})\n📅 ${g.data} às ${g.horario}\n🔢 ${restantes} vaga(s) livre(s) de ${g.vagas_totais}\n👑 Capitão: ${g.capitao}\n\nConfirma presença: ${shareUrl(g.id)}`;
    const win = window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
    if (win) showToast('📲 Pelada compartilhada');
  }

  function handleArenaCreated(arena) {
    setModal(null);
    loadArenas();
    // Dono do app cadastra já aprovado (ver app/api/arenas/route.js) — a
    // mensagem de "aguarde aprovação" seria enganosa nesse caso específico.
    showToast(arena?.status === 'aprovada' ? 'Arena cadastrada — já está no mapa!' : 'Arena enviada! Aparece no mapa depois de aprovada.');
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
    showToast('🔥 Você entrou no jogo!');
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
        clickThrough
      />
    );
  }

  return (
    <div>
      <div className="pl-header">
        <div className="pl-header-row">
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginLeft: 'auto' }}>
            {user?.id === ADMIN_USER_ID && (
              <Link href="/admin/arenas" className="pl-link-muted">🔒 Aprovar arenas</Link>
            )}
            <button className="pl-link-muted" onClick={() => setModal('new-arena')}>Cadastrar arena</button>
          </div>
        </div>
      </div>

      <div className="pl-tabs" style={{ marginTop: 18 }}>
        <button className={`pl-tab ${tab === 'todas' ? 'active' : ''}`} onClick={() => setTab('todas')}>Peladas</button>
        <button className={`pl-tab ${tab === 'minhas' ? 'active' : ''}`} onClick={() => setTab('minhas')}>Minhas peladas</button>
      </div>

      {tab === 'todas' && (
        <>
          <div className="pl-hero-title-row">
            <h2 className="pl-hero-title">⚽ Peladas perto de você</h2>
            <span className="pl-hero-count">
              {filtradas.length} pelada{filtradas.length === 1 ? '' : 's'} encontrada{filtradas.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="pl-view-toggle">
            <button type="button" className={`pl-view-toggle-btn ${viewMode === 'lista' ? 'active' : ''}`} onClick={() => setViewMode('lista')}>📋 Lista</button>
            <button type="button" className={`pl-view-toggle-btn ${viewMode === 'mapa' ? 'active' : ''}`} onClick={() => setViewMode('mapa')}>🗺️ Mapa</button>
          </div>

          <div className="pl-chips-row">
            <button className={`pl-chip ${dataChip === 'hoje' ? 'active' : ''}`} onClick={() => setDataChip(dataChip === 'hoje' ? '' : 'hoje')}>Hoje</button>
            <button className={`pl-chip ${dataChip === 'amanha' ? 'active' : ''}`} onClick={() => setDataChip(dataChip === 'amanha' ? '' : 'amanha')}>Amanhã</button>
            <button className={`pl-chip ${raioAtivo ? 'active' : ''}`} onClick={toggleRaio}>📍 Perto</button>
            <button className={`pl-chip pl-tipo-jogo-chip ${tipoChip === 'Futebol de campo' ? 'active' : ''}`} onClick={() => setTipoChip(tipoChip === 'Futebol de campo' ? '' : 'Futebol de campo')}><TipoJogoIcon tipo="Futebol de campo" size={14} /> Futebol</button>
            <button className={`pl-chip pl-tipo-jogo-chip ${tipoChip === 'Society' ? 'active' : ''}`} onClick={() => setTipoChip(tipoChip === 'Society' ? '' : 'Society')}><TipoJogoIcon tipo="Society" size={14} /> Society</button>
            <button className={`pl-chip pl-tipo-jogo-chip ${tipoChip === 'Futsal' ? 'active' : ''}`} onClick={() => setTipoChip(tipoChip === 'Futsal' ? '' : 'Futsal')}><TipoJogoIcon tipo="Futsal" size={14} /> Futsal</button>
            <button className={`pl-chip pl-tipo-jogo-chip ${tipoChip === 'Futebol de areia' ? 'active' : ''}`} onClick={() => setTipoChip(tipoChip === 'Futebol de areia' ? '' : 'Futebol de areia')}><TipoJogoIcon tipo="Futebol de areia" size={14} /> Areia</button>
            <button className={`pl-chip pl-tipo-jogo-chip ${tipoChip === 'Futebol de Rua' ? 'active' : ''}`} onClick={() => setTipoChip(tipoChip === 'Futebol de Rua' ? '' : 'Futebol de Rua')}><TipoJogoIcon tipo="Futebol de Rua" size={14} /> Rua</button>
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
            {tab === 'minhas' ? 'Você ainda não tá em nenhuma pelada 👀' : 'Tá quieto por aqui... 👀'}
          </h3>
          <p>{tab === 'minhas' ? 'Dá uma olhada nas peladas rolando e confirma presença.' : 'Que tal criar a primeira pelada da semana?'}</p>
          {tab !== 'minhas' && (
            <Link href="/?criar=1" className="pl-ticket" style={{ display: 'inline-flex', marginTop: 12, textDecoration: 'none' }}>
              <span className="pl-ticket-label">Criar pelada</span>
              <span className="pl-ticket-stub" aria-hidden="true">⚽</span>
            </Link>
          )}
        </div>
      ) : (
        <>
          {hoje.length > 0 && <>
            <div className="pl-section-title" style={{ maxWidth: 640, margin: '18px auto 0', padding: '0 16px', fontFamily: 'var(--font-display)', color: 'var(--neon)', textTransform: 'uppercase' }}>Rolando hoje</div>
            <div className="pl-list">{hoje.map(renderCard)}</div>
          </>}
          {proximas.length > 0 && <>
            <div className="pl-section-title" style={{ maxWidth: 640, margin: '22px auto 0', padding: '0 16px', fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)' }}>{tab === 'minhas' ? 'Outras peladas confirmadas' : 'Próximas peladas'}</div>
            <div className="pl-list">{proximas.map(renderCard)}</div>
          </>}
        </>
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
