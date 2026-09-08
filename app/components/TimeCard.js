'use client';
import Link from 'next/link';
import Avatar from './Avatar';
import { MODALIDADE_LABEL } from '@/lib/gameUtils';

// Card de time — estilo clube (escudo com anel neon, sigla, badge de
// recrutamento, tags de contexto). Reaproveita .pl-glass-card (mesmo
// glassmorphism já usado nos cards da Home) em vez de um sistema visual
// novo. `jogadoresAtual` é opcional de propósito — a listagem de /times
// hoje não conta membros aprovados na query; quando essa contagem for
// somada (Passo 4), o card já sabe mostrar "X/Y jogadores" sem mudar nada
// aqui.
const RECRUTAMENTO_INFO = {
  procurando_jogadores: { label: 'Recrutando', className: 'aberto' },
  procurando_goleiro: { label: 'Precisa de goleiro', className: 'goleiro' },
};

const PAPEL_LABEL = { capitao: 'Capitão', vice_capitao: 'Vice-capitão', membro: 'Membro' };

export default function TimeCard({ time }) {
  const recrutamento = RECRUTAMENTO_INFO[time.recrutamento];

  return (
    <Link href={`/time/${time.id}`} className="pl-glass-card pl-time-card">
      <div className="pl-time-card-top">
        <Avatar nome={time.nome} size={60} fotoUrl={time.escudo_url} ring />
        <div className="pl-time-card-info">
          <div className="pl-time-card-nome-row">
            <h3>{time.nome}</h3>
            {time.sigla && <span className="pl-time-card-sigla">{time.sigla}</span>}
          </div>
          <p className="meta">
            {PAPEL_LABEL[time.papel] || 'Membro'}
            {time.modalidade && ` · ${MODALIDADE_LABEL[time.modalidade] || time.modalidade}`}
          </p>
        </div>
        {recrutamento && (
          <span className={`pl-time-card-recrutamento ${recrutamento.className}`}>{recrutamento.label}</span>
        )}
      </div>

      {(time.bairro || time.tecnico || time.dia_jogo || (time.jogadoresAtual != null && time.max_jogadores)) && (
        <div className="pl-time-card-tags">
          {time.bairro && <span className="pl-bairro-tag">{time.bairro}</span>}
          {time.tecnico && <span className="pl-time-card-meta-tag">Técnico: {time.tecnico}</span>}
          {time.dia_jogo && (
            <span className="pl-time-card-meta-tag">{time.dia_jogo}{time.horario_jogo ? ` · ${time.horario_jogo}` : ''}</span>
          )}
          {time.jogadoresAtual != null && time.max_jogadores && (
            <span className="pl-time-card-meta-tag">{time.jogadoresAtual}/{time.max_jogadores} jogadores</span>
          )}
        </div>
      )}
    </Link>
  );
}
