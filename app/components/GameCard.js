'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fmtDate, aprovadosDe, esperaDe, pendentesDe, ocupandoVagaDe, todayISO, statusVagas, souCapitaoDe } from '@/lib/gameUtils';
import Avatar from './Avatar';
import CaptainIcon from './CaptainIcon';
import TicketButton from './TicketButton';
import Confetti from './Confetti';
import TipoJogoIcon from './TipoJogoIcon';
import GameArtBanner from './GameArtBanner';

function ConfirmadoAvatar({ nome, moral, bench, fotoUrl }) {
  return (
    <div style={{ position: 'relative' }} className={bench ? 'pl-bench-avatar' : ''}>
      <Avatar nome={nome} size={24} fotoUrl={fotoUrl} />
      {moral != null && (
        <div
          style={{
            position: 'absolute', bottom: -4, right: -4,
            background: 'var(--gold)', color: 'var(--ink)',
            fontSize: 9, fontWeight: 700, borderRadius: 'var(--radius-pill)',
            padding: '1px 4px', lineHeight: 1.3,
            border: '1.5px solid var(--card-bg)',
          }}
        >
          ★{moral.toFixed(1)}
        </div>
      )}
    </div>
  );
}

// stopPropagation nos controles internos evita que um clique num botão
// (editar, confirmar, cancelar, compartilhar) também dispare a navegação
// do clickThrough pro card inteiro.
function pararPropagacao(fn) {
  return (e) => { e.stopPropagation(); fn(); };
}

export default function GameCard({ game, currentUserId, onEdit, onConfirm, onShare, onCancelPresenca, onConfirmarVaga, justLotou, distanciaKm, clickThrough, showArt = true, artSizes }) {
  const router = useRouter();
  const g = game;
  const d = fmtDate(g.data);
  const aprovados = aprovadosDe(g);
  // Capitão sempre aparece primeiro entre os confirmados. Peladas criadas
  // depois do fix de 2026-08-30 já trazem a linha dele em confirmacoes (só
  // reordena pra frente); peladas antigas ou um insert que falhou não têm
  // essa linha — sintetiza uma entrada só com o nome (sem foto/moral) pra
  // não sumir com o capitão da lista de qualquer forma.
  // g.owner_id é null em peladas antigas sem capitão — sem o `!!g.owner_id`
  // aqui, um convidado sem conta (user_id também null) seria confundido
  // com "o capitão já tem linha" (null === null), e o sort logo abaixo
  // colocaria esse convidado na frente como se fosse o capitão.
  const capitaoTemLinha = !!g.owner_id && aprovados.some((c) => c.user_id === g.owner_id);
  const confirmados = !g.owner_id
    ? aprovados
    : capitaoTemLinha
      ? [...aprovados].sort((a, b) => (b.user_id === g.owner_id) - (a.user_id === g.owner_id))
      : [{ id: `capitao-${g.id}`, user_id: g.owner_id, nome: g.capitao, moral: null, foto_url: null }, ...aprovados];
  const espera = esperaDe(g);
  const pendentes = pendentesDe(g);
  const restantes = Math.max(0, g.vagas_totais - ocupandoVagaDe(g).length);
  const lotado = restantes === 0;
  const status = statusVagas(restantes, lotado);
  const podeEditar = !g.owner_id || g.owner_id === currentUserId;
  const souCapitao = souCapitaoDe(g, currentUserId);
  const minhaConfirmacao = (g.confirmacoes || []).find((c) => c.user_id === currentUserId);
  const aguardandoAprovacao = !souCapitao && minhaConfirmacao?.status === 'pendente';
  const minhaPresencaAprovada = souCapitao || minhaConfirmacao?.status === 'aprovado';
  const minhaVagaAguardandoConfirmacao = !souCapitao && minhaConfirmacao?.status === 'aguardando_confirmacao';

  const [pulse, setPulse] = useState(false);
  const prevRestantes = useRef(restantes);
  useEffect(() => {
    if (prevRestantes.current !== restantes) {
      setPulse(true);
      prevRestantes.current = restantes;
      const t1 = setTimeout(() => setPulse(false), 350);
      return () => clearTimeout(t1);
    }
  }, [restantes]);

  const ehHoje = g.data === todayISO();
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (!ehHoje) return;
    const id = setInterval(() => setAgora(Date.now()), 60000);
    return () => clearInterval(id);
  }, [ehHoje]);

  const contagem = (() => {
    if (!ehHoje) return null;
    const inicio = new Date(`${g.data}T${g.horario}`).getTime();
    const diff = inicio - agora;
    if (diff <= 0) return '⚽ Acontecendo agora';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `⚡ Começa em ${h}h${String(m).padStart(2, '0')}min` : `⚡ Começa em ${m}min`;
  })();

  // Contagem regressiva do prazo pra confirmar a vaga — dá pro jogador uma
  // noção real de urgência, em vez de só o botão parado.
  const [agoraPrazo, setAgoraPrazo] = useState(() => Date.now());
  useEffect(() => {
    if (!minhaVagaAguardandoConfirmacao) return;
    const id = setInterval(() => setAgoraPrazo(Date.now()), 30000);
    return () => clearInterval(id);
  }, [minhaVagaAguardandoConfirmacao]);

  const contagemPrazo = (() => {
    if (!minhaVagaAguardandoConfirmacao || !minhaConfirmacao?.prazo_confirmacao) return null;
    const diff = new Date(minhaConfirmacao.prazo_confirmacao).getTime() - agoraPrazo;
    if (diff <= 0) return 'Prazo vencendo...';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `Confirma em até ${h}h${String(m).padStart(2, '0')}min` : `Confirma em até ${m}min`;
  })();

  // Testado ao vivo: envolver o card inteiro num <Link> navegava de qualquer
  // forma ao clicar nos botões internos (Editar, Compartilhar etc.), mesmo
  // com stopPropagation neles. router.push num onClick comum no card não
  // tem esse problema. e.target === e.currentTarget no keydown evita que um
  // Enter dado num botão interno (que já bolha um keydown pro card antes do
  // click do botão rodar) também dispare a navegação do card.
  const wrapperProps = clickThrough
    ? {
        role: 'link',
        tabIndex: 0,
        'aria-label': `Ver detalhes da pelada em ${g.local}`,
        onClick: () => router.push(`/pelada/${g.id}`),
        onKeyDown: (e) => { if (e.key === 'Enter' && e.target === e.currentTarget) router.push(`/pelada/${g.id}`); },
      }
    : {};

  return (
    <div className={`pl-card ${!showArt ? 'pl-card-no-art' : ''}`} {...wrapperProps}>
      {/* showArt={false} hoje só existe em PeladaClient.js, que já tem seu
          próprio hero (GameArtBanner variant="hero") logo acima — daí o
          card embutido ficar sem nenhuma identidade visual própria não é
          um card "pelado" na prática. Um novo showArt={false} em outro
          lugar sem hero próprio precisaria de um fallback aqui também. */}
      {showArt && <GameArtBanner tipo={g.tipo} variant="card" sizes={artSizes} />}
      {justLotou && <Confetti />}
      {lotado && <div className="pl-stamp">Lotado</div>}

      {/* Editar/Compartilhar viram um par de ícones ancorados no canto,
          fora do bloco centralizado — não competem com ele. */}
      <div className="pl-card-icon-actions">
        {podeEditar && (
          <button className="pl-icon-btn-sm" onClick={pararPropagacao(() => onEdit(g))} aria-label="Editar">
            ✎
            {pendentes.length > 0 && <span className="pl-pending-badge">{pendentes.length}</span>}
          </button>
        )}
        <button className="pl-icon-btn-sm" onClick={pararPropagacao(() => onShare(g))} aria-label="Compartilhar">🔗</button>
      </div>

      {/* Bloco central — data, local, horário, tags e a ação principal,
          tudo como uma unidade só, centralizado. */}
      <div className="pl-card-center">
        <div className="pl-date-pill">{d.dow} {d.dom}</div>
        <h3>{g.local}</h3>
        <span className="pl-card-when">{contagem || g.horario}</span>

        <div className="pl-card-tags">
          <div className={`pl-status-badge ${status.className} ${pulse ? 'pl-flip-pulse' : ''}`}>{status.label}</div>
          {g.tipo && <span className="pl-tipo-tag"><TipoJogoIcon tipo={g.tipo} size={13} /> {g.tipo}</span>}
          <span className="pl-bairro-tag">{g.bairro}</span>
          {distanciaKm != null && (
            <span className="pl-distancia">📍 {distanciaKm.toFixed(1).replace('.', ',')} km</span>
          )}
        </div>

        <div className="pl-card-cta">
          {aguardandoAprovacao ? (
            <p className="pl-aguardando">Aguardando aprovação do capitão</p>
          ) : minhaVagaAguardandoConfirmacao ? (
            <div className="pl-card-cta-col">
              <p className="pl-aguardando">Aprovado — falta você confirmar</p>
              {contagemPrazo && <p className="pl-prazo-confirmacao">{contagemPrazo}</p>}
              <TicketButton compact onClick={pararPropagacao(() => onConfirmarVaga(minhaConfirmacao.id))}>
                Confirmar minha vaga
              </TicketButton>
            </div>
          ) : minhaPresencaAprovada ? (
            <>
              <span className="pl-inside-badge">✓ Você está dentro</span>
              {/* Capitão não cancela a própria presença por aqui — sairia
                  do próprio jogo sem sair da posição de dono. Quem quer
                  desmarcar a pelada inteira usa o fluxo de editar/encerrar. */}
              {!souCapitao && (
                <button className="pl-link-danger-small" onClick={pararPropagacao(() => onCancelPresenca(minhaConfirmacao.id, g))}>
                  Cancelar presença
                </button>
              )}
            </>
          ) : (
            <TicketButton compact onClick={pararPropagacao(() => onConfirm(g))}>
              {lotado ? 'Entrar no banco' : 'Confirmar'}
            </TicketButton>
          )}
        </div>
      </div>

      {/* Rodapé discreto — capitão e quem já confirmou */}
      <div className="pl-card-footer">
        <p className="pl-card-capitao"><CaptainIcon /> {g.capitao}</p>

        {confirmados.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {confirmados.slice(0, 6).map((c) => (
              <ConfirmadoAvatar key={c.id} nome={c.nome} moral={c.moral} fotoUrl={c.foto_url} />
            ))}
            {confirmados.length > 6 && (
              <div style={{ fontSize: 11, color: 'var(--paper-dim)', alignSelf: 'center' }}>+{confirmados.length - 6}</div>
            )}
          </div>
        )}
        {espera.length > 0 && (
          <div className="pl-bench">
            <span className="pl-bench-label">Banco:</span>
            {espera.slice(0, 6).map((c) => (
              <ConfirmadoAvatar key={c.id} nome={c.nome} moral={c.moral} fotoUrl={c.foto_url} bench />
            ))}
            {espera.length > 6 && <span style={{ fontSize: 11, color: 'var(--concrete)' }}>+{espera.length - 6}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
