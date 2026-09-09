'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import { MODALIDADE_LABEL } from '@/lib/gameUtils';
import { DIA_SEMANA_LABEL } from '@/lib/timeConstants';

// Card de time — estilo clube (escudo com anel neon, sigla, badge de
// recrutamento, tags de contexto). Reaproveita .pl-glass-card (mesmo
// glassmorphism já usado nos cards da Home) em vez de um sistema visual
// novo. `jogadoresAtual` é opcional de propósito — a listagem de /times
// hoje não conta membros aprovados na query; quando essa contagem for
// somada, o card já sabe mostrar "X/Y jogadores" sem mudar nada aqui.
//
// A cor de "--glow"/"--glow-soft" reage ao status de recrutamento do time
// e alimenta três efeitos ao mesmo tempo: o brilho da borda no hover, o
// halo atrás do escudo, e o brilho do nome — mesma cor, três lugares, em
// vez de três sistemas de cor separados.
const RECRUTAMENTO_INFO = {
  procurando_jogadores: { label: 'Recrutando', className: 'aberto', glow: 'rgba(166,255,0,0.8)', glowSoft: 'rgba(166,255,0,0.2)' },
  procurando_goleiro: { label: 'Precisa de goleiro', className: 'goleiro', glow: 'rgba(255,197,61,0.8)', glowSoft: 'rgba(255,197,61,0.2)' },
};
const FECHADO_GLOW = { glow: 'rgba(110,113,120,0.6)', glowSoft: 'rgba(110,113,120,0.16)' };
const DEFAULT_GLOW = { glow: 'rgba(166,255,0,0.7)', glowSoft: 'rgba(166,255,0,0.18)' };

const PAPEL_LABEL = { capitao: 'Capitão', vice_capitao: 'Vice-capitão', membro: 'Membro' };

export default function TimeCard({ time, index = 0 }) {
  const recrutamento = RECRUTAMENTO_INFO[time.recrutamento];
  const souMembro = !!time.papel;
  const glowInfo = recrutamento || (time.recrutamento === 'fechado' ? FECHADO_GLOW : DEFAULT_GLOW);

  const nameRef = useRef(null);
  const [marquee, setMarquee] = useState(false);

  useEffect(() => {
    const el = nameRef.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const overflow = el.scrollWidth > parent.clientWidth + 1;
    setMarquee(overflow);
    if (overflow) {
      const dist = el.scrollWidth - parent.clientWidth + 4;
      el.style.setProperty('--marquee-dist', `-${dist}px`);
      el.style.setProperty('--marquee-dur', `${Math.max(2.4, dist / 26)}s`);
    }
  }, [time.nome]);

  function handleMagnetic(e) {
    if (marquee || !nameRef.current) return;
    const rect = nameRef.current.getBoundingClientRect();
    const dx = Math.max(-6, Math.min(6, (e.clientX - (rect.left + rect.width / 2)) * 0.16));
    const dy = Math.max(-4, Math.min(4, (e.clientY - (rect.top + rect.height / 2)) * 0.16));
    nameRef.current.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`;
  }
  function resetMagnetic() {
    if (marquee || !nameRef.current) return;
    nameRef.current.style.transform = '';
  }

  return (
    <Link
      href={`/time/${time.id}`}
      className="pl-glass-card pl-time-card"
      style={{ '--glow': glowInfo.glow, '--glow-soft': glowInfo.glowSoft, '--reveal-delay': `${Math.min(index, 4) * 70}ms` }}
    >
      <div className="pl-time-card-top">
        <div className="pl-time-card-crest-wrap">
          <Avatar nome={time.nome} size={60} fotoUrl={time.escudo_url} ring />
        </div>
        <div className="pl-time-card-info">
          <div className="pl-time-card-nome-row" onMouseMove={handleMagnetic} onMouseLeave={resetMagnetic}>
            <h3>
              <span ref={nameRef} className={`pl-time-card-nome-text ${marquee ? 'marquee' : ''}`}>{time.nome}</span>
            </h3>
            {time.sigla && <span className="pl-time-card-sigla">{time.sigla}</span>}
          </div>
          <p className="meta">
            {time.papel && (PAPEL_LABEL[time.papel] || 'Membro')}
            {time.papel && time.modalidade && ' · '}
            {time.modalidade && (MODALIDADE_LABEL[time.modalidade] || time.modalidade)}
          </p>
        </div>
        {recrutamento ? (
          <span className={`pl-time-card-recrutamento ${recrutamento.className}`}>{recrutamento.label}</span>
        ) : (!souMembro && time.recrutamento === 'fechado') ? (
          <span className="pl-time-card-recrutamento fechado">Fechado</span>
        ) : null}
      </div>

      {(time.bairro || time.tecnico || time.dia_jogo || (time.jogadoresAtual != null && time.max_jogadores)) && (
        <div className="pl-time-card-tags">
          {time.bairro && <span className="pl-bairro-tag">{time.bairro}</span>}
          {time.tecnico && <span className="pl-time-card-meta-tag">Técnico: {time.tecnico}</span>}
          {time.dia_jogo && (
            <span className="pl-time-card-meta-tag">{DIA_SEMANA_LABEL[time.dia_jogo] || time.dia_jogo}{time.horario_jogo ? ` · ${time.horario_jogo}` : ''}</span>
          )}
          {time.jogadoresAtual != null && time.max_jogadores && (
            <span className="pl-time-card-meta-tag">{time.jogadoresAtual}/{time.max_jogadores} jogadores</span>
          )}
        </div>
      )}
    </Link>
  );
}
