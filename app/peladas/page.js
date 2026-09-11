'use client';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useGames } from '@/lib/useGames';
import { useArenas } from '@/lib/useArenas';
import { todayISO, aprovadosDe, shareUrl, haversineKm } from '@/lib/gameUtils';
import { getRadiusPref, saveRadiusPref } from '@/lib/radiusPref';
import { getFiltrosPref, saveFiltrosPref } from '@/lib/filtrosPref';
import { useJustLotou } from '@/lib/useJustLotou';
import { ADMIN_USER_ID } from '@/lib/adminConfig';
import { useAuth } from '../components/AuthProvider';
import { useToast } from '../components/ToastProvider';
import GameCard from '../components/GameCard';
import DescobrirFiltros, { resumoFiltrosAtivos } from '../components/DescobrirFiltros';
import NewArenaModal from '../components/NewArenaModal';
import ConfirmModal from '../components/ConfirmModal';
import ManageModal from '../components/ManageModal';
import CancelPresencaModal from '../components/CancelPresencaModal';
import EmptyFieldIcon from '../components/EmptyFieldIcon';

const MapViewPins = dynamic(() => import('../components/MapViewPins'), { ssr: false });

const FILTROS_PADRAO = {
  bairro: '', data: '', periodo: '', tipo: '', nivel: '', precoMax: '', vagas: '', somenteTimes: false, ordenar: '',
};

// Aba "Peladas" — a tela de Descoberta do app: os dois toggles (todas /
// minhas), filtros combináveis, ordenação, mapa/lista e cadastro de arena.
// A Início só mostra um recorte curado; quem quer "explorar tudo" vem pra
// cá. Filtros/ordenação de "todas" são resolvidos no SERVIDOR (GET
// /api/games com query params — ver app/api/games/route.js) — o front só
// manda o que o usuário escolheu e renderiza o que volta; "minhas peladas"
// continua 100% client-side sobre a lista completa, exatamente como
// sempre foi (não é o alvo desse pacote, sem motivo pra mexer).
export default function PeladasPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { arenas, loadArenas } = useArenas();
  const [modal, setModal] = useState(null);
  const [viewMode, setViewMode] = useState('lista');
  const [tab, setTab] = useState('todas');
  const [raioAtivo, setRaioAtivo] = useState(false);
  const [raioKm, setRaioKm] = useState(10);
  const [minhaLocalizacao, setMinhaLocalizacao] = useState(null);
  const [erroLocalizacao, setErroLocalizacao] = useState('');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [filtros, setFiltros] = useState(FILTROS_PADRAO);
  const [filtrosCarregados, setFiltrosCarregados] = useState(false);

  // Restaura filtros salvos (localStorage, mesmo padrão de raioKm) e o raio
  // — só uma vez, na abertura. Sinaliza `filtrosCarregados` pra não salvar
  // de volta o padrão em cima do que acabou de ler (ver efeito abaixo).
  useEffect(() => {
    const raioSalvo = getRadiusPref();
    if (raioSalvo) setRaioKm(raioSalvo);
    const filtrosSalvos = getFiltrosPref();
    if (filtrosSalvos) setFiltros((f) => ({ ...f, ...filtrosSalvos }));
    setFiltrosCarregados(true);
  }, []);

  useEffect(() => {
    if (filtrosCarregados) saveFiltrosPref(filtros);
  }, [filtros, filtrosCarregados]);

  function toggleRaio() {
    if (raioAtivo) { setRaioAtivo(false); setErroLocalizacao(''); return; }
    if (!navigator.geolocation) { setErroLocalizacao('Seu navegador não suporta localização.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMinhaLocalizacao({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setRaioAtivo(true);
        setErroLocalizacao('');
      },
      () => setErroLocalizacao('Não consegui acessar sua localização — usa o filtro de bairro aqui embaixo.'),
      { timeout: 10000 }
    );
  }

  function handleRaioChange(e) {
    const km = Number(e.target.value);
    setRaioKm(km);
    saveRadiusPref(km);
  }

  // A ausência de geolocalização nunca quebra a busca: sem minhaLocalizacao,
  // simplesmente não manda lat/lng pro servidor (nem calcula distância
  // client-side) — os filtros e a lista continuam funcionando normalmente.
  const paramsDescoberta = useMemo(() => {
    if (tab !== 'todas') return {}; // 'minhas' continua com o fetch completo de sempre
    return {
      // Marcador sempre presente (mesmo com todo o resto vazio) — sem ele,
      // "Descobrir" com zero filtro ativo mandava a MESMA query string vazia
      // que o fetch legado de "minhas peladas" (params={}), e o servidor não
      // tinha como saber que devia aplicar o padrão "só futuras" (ver
      // app/api/games/route.js). Achado testando o caso mais comum — abrir
      // a aba sem mexer em nada — que é justamente o que não manda nenhum
      // outro param.
      escopo: 'descobrir',
      bairro: filtros.bairro,
      data: filtros.data,
      periodo: filtros.periodo,
      tipo: filtros.tipo,
      nivel: filtros.nivel,
      precoMax: filtros.precoMax,
      vagas: filtros.vagas,
      somenteTimes: filtros.somenteTimes ? '1' : '',
      lat: raioAtivo && minhaLocalizacao ? minhaLocalizacao.lat : undefined,
      lng: raioAtivo && minhaLocalizacao ? minhaLocalizacao.lng : undefined,
      raioKm: raioAtivo && minhaLocalizacao ? raioKm : undefined,
      ordenar: filtros.ordenar,
    };
  }, [tab, filtros, raioAtivo, minhaLocalizacao, raioKm]);

  const { games, total, loading, loadGames } = useGames(paramsDescoberta);
  const justLotaram = useJustLotou(games, loading);

  function distanciaDe(g) {
    if (g.distanciaKm != null) return g.distanciaKm;
    if (!minhaLocalizacao || g.latitude == null || g.longitude == null) return null;
    return haversineKm(minhaLocalizacao.lat, minhaLocalizacao.lng, Number(g.latitude), Number(g.longitude));
  }

  function shareGame(g) {
    const confirmados = aprovadosDe(g).length;
    const restantes = Math.max(0, g.vagas_totais - confirmados);
    const msg = `Pelada marcada!\n${g.local} (${g.bairro})\n${g.data} às ${g.horario}\n${restantes} vaga(s) livre(s) de ${g.vagas_totais}\nCapitão: ${g.capitao}\n\nConfirma presença: ${shareUrl(g.id)}`;
    const win = window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
    if (win) showToast('Pelada compartilhada');
  }

  function handleArenaCreated(arena) {
    setModal(null);
    loadArenas();
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
    showToast('Você entrou no jogo!');
  }

  const today = todayISO();

  // "minhas peladas" — exatamente a mesma lógica client-side de sempre,
  // sobre a lista completa (paramsDescoberta={} nesse tab, então `games`
  // aqui já É a lista inteira, sem filtro nenhum do servidor).
  const minhasFiltradas = useMemo(() => {
    if (tab !== 'minhas') return [];
    return games
      .filter((g) => g.data >= today)
      .sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario))
      .filter((g) => aprovadosDe(g).some((c) => c.user_id === user?.id));
  }, [games, tab, user, today]);

  const filtradas = tab === 'minhas' ? minhasFiltradas : games;
  const resultCount = tab === 'minhas' ? minhasFiltradas.length : total;

  // Bairros disponíveis pro <select> — derivados do resultado atual (some
  // conforme os outros filtros estreitam o que existe; é o comportamento
  // esperado de uma busca facetada, não um bug).
  const bairros = useMemo(
    () => Array.from(new Set(filtradas.map((g) => g.bairro).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [filtradas]
  );

  const ordenacaoCronologica = !filtros.ordenar || filtros.ordenar === '';
  const hoje = ordenacaoCronologica ? filtradas.filter((g) => g.data === today) : [];
  const proximas = ordenacaoCronologica ? filtradas.filter((g) => g.data !== today) : filtradas;

  const filtrosAtivos = tab === 'todas' ? resumoFiltrosAtivos(filtros, bairros) : [];
  const temFiltroAtivo = filtrosAtivos.length > 0 || raioAtivo;

  function limparFiltro(chave) {
    setFiltros((f) => ({ ...f, [chave]: chave === 'somenteTimes' ? false : '' }));
  }

  function limparTudo() {
    setFiltros(FILTROS_PADRAO);
    if (raioAtivo) { setRaioAtivo(false); setErroLocalizacao(''); }
  }

  function renderCard(g, i) {
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
        motivo={filtros.ordenar === 'recomendadas' ? g.motivo : null}
        clickThrough
        revealIndex={i}
      />
    );
  }

  return (
    <div>
      <div className="pl-header">
        <div className="pl-header-row">
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginLeft: 'auto' }}>
            {user?.id === ADMIN_USER_ID && (
              <Link href="/admin/arenas" className="pl-link-muted">Aprovar arenas</Link>
            )}
            <button className="pl-link-muted" onClick={() => setModal('new-arena')}>Cadastrar arena</button>
          </div>
        </div>
      </div>

      <div className="pl-tabs" style={{ marginTop: 18 }}>
        <button className={`pl-tab ${tab === 'todas' ? 'active' : ''}`} onClick={() => setTab('todas')}>Descobrir</button>
        <button className={`pl-tab ${tab === 'minhas' ? 'active' : ''}`} onClick={() => setTab('minhas')}>Minhas peladas</button>
      </div>

      {tab === 'todas' && (
        <>
          <div className="pl-hero-title-row">
            <h2 className="pl-hero-title">Descobrir peladas</h2>
            <span className="pl-hero-count">
              {resultCount} pelada{resultCount === 1 ? '' : 's'} encontrada{resultCount === 1 ? '' : 's'}
            </span>
          </div>

          <div className="pl-view-toggle">
            <button type="button" className={`pl-view-toggle-btn ${viewMode === 'lista' ? 'active' : ''}`} onClick={() => setViewMode('lista')}>Lista</button>
            <button type="button" className={`pl-view-toggle-btn ${viewMode === 'mapa' ? 'active' : ''}`} onClick={() => setViewMode('mapa')}>Mapa</button>
          </div>

          <div className="pl-chips-row">
            <button className={`pl-chip ${filtros.data === 'hoje' ? 'active' : ''}`} onClick={() => setFiltros((f) => ({ ...f, data: f.data === 'hoje' ? '' : 'hoje' }))}>Hoje</button>
            <button className={`pl-chip ${filtros.data === 'amanha' ? 'active' : ''}`} onClick={() => setFiltros((f) => ({ ...f, data: f.data === 'amanha' ? '' : 'amanha' }))}>Amanhã</button>
            <button className={`pl-chip ${filtros.data === 'fimDeSemana' ? 'active' : ''}`} onClick={() => setFiltros((f) => ({ ...f, data: f.data === 'fimDeSemana' ? '' : 'fimDeSemana' }))}>Fim de semana</button>
            <button className={`pl-chip ${raioAtivo ? 'active' : ''}`} onClick={toggleRaio}>Perto</button>
            <button className={`pl-chip pl-chip-filtros ${filtrosAbertos ? 'active' : ''}`} onClick={() => setFiltrosAbertos((v) => !v)}>Filtros</button>
          </div>
          {erroLocalizacao && <div style={{ maxWidth: 640, margin: '4px auto 0', padding: '0 16px', fontSize: 11, color: 'var(--tag-red)' }}>{erroLocalizacao}</div>}

          {filtrosAbertos && (
            <DescobrirFiltros filtros={filtros} onChange={setFiltros} bairros={bairros} />
          )}

          {raioAtivo && (
            <div style={{ maxWidth: 640, margin: '8px auto 0', padding: '0 16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--paper-dim)' }}>
                Raio: {raioKm}km
                <input type="range" min="1" max="50" value={raioKm} onChange={handleRaioChange} style={{ width: 120 }} aria-label="Raio em quilômetros" />
              </label>
            </div>
          )}

          {temFiltroAtivo && (
            <div style={{ maxWidth: 640, margin: '8px auto 0', padding: '0 16px', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              {filtrosAtivos.map((f) => (
                <button key={f.chave} type="button" className="pl-bairro-tag" style={{ cursor: 'pointer', border: 'none' }} onClick={() => limparFiltro(f.chave)}>
                  {f.label} ✕
                </button>
              ))}
              {raioAtivo && (
                <button type="button" className="pl-bairro-tag" style={{ cursor: 'pointer', border: 'none' }} onClick={() => setRaioAtivo(false)}>
                  Até {raioKm}km ✕
                </button>
              )}
              <button type="button" className="pl-link-muted" style={{ fontSize: 11 }} onClick={limparTudo}>Limpar tudo</button>
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
            {tab === 'minhas' ? 'Você ainda não tá em nenhuma pelada' : temFiltroAtivo ? 'Nada por aqui com esses filtros' : 'Tá quieto por aqui...'}
          </h3>
          <p>
            {tab === 'minhas'
              ? 'Dá uma olhada nas peladas rolando e confirma presença.'
              : temFiltroAtivo
                ? 'Tenta ajustar os filtros, ver outra data ou criar a pelada que tá faltando.'
                : 'Que tal criar a primeira pelada da semana?'}
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {tab === 'todas' && temFiltroAtivo && (
              <button type="button" className="pl-share-btn" onClick={limparTudo}>Limpar filtros</button>
            )}
            {tab !== 'minhas' && (
              <Link href="/?criar=1" className="pl-ticket" style={{ display: 'inline-flex', textDecoration: 'none' }}>
                <span className="pl-ticket-label">Criar pelada</span>
                <span className="pl-ticket-stub" aria-hidden="true">⚽</span>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <>
          {hoje.length > 0 && <>
            <div className="pl-section-title" style={{ maxWidth: 640, margin: '18px auto 0', padding: '0 16px', fontFamily: 'var(--font-display)', color: 'var(--neon)', textTransform: 'uppercase' }}>Rolando hoje</div>
            <div className="pl-list">{hoje.map(renderCard)}</div>
          </>}
          {proximas.length > 0 && <>
            <div className="pl-section-title" style={{ maxWidth: 640, margin: '22px auto 0', padding: '0 16px', fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)' }}>
              {tab === 'minhas' ? 'Outras peladas confirmadas' : ordenacaoCronologica ? 'Próximas peladas' : 'Resultados'}
            </div>
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
