'use client';
import Link from 'next/link';
import { fmtDate } from '@/lib/gameUtils';
import { googleCalendarUrl } from '@/lib/calendarEvent';
import TicketButton from './TicketButton';

const STATUS_LABEL = {
  aprovado: 'Confirmado',
  aguardando_confirmacao: 'Falta você confirmar',
  espera: 'Na lista de espera',
  pendente: 'Aguardando o capitão aprovar',
};

// Card da Agenda da Pelada — mesma linguagem visual do histórico do Perfil
// (.pl-card/.pl-date/.pl-info/.pl-bairro-tag), com as ações que fazem
// sentido pra cada status: confirmar a vaga (aguardando_confirmacao),
// cancelar presença (qualquer status ativo) e agenda — só pra quem tá
// 'aprovado' de verdade (o resto nem vê os botões de calendário; a
// rota do .ics também recusa no servidor, isso aqui é só a UX).
export default function MinhaPeladaCard({ item, onConfirmar, onCancelar, index = 0 }) {
  const d = fmtDate(item.data);
  const podeAgenda = item.minhaConfirmacaoStatus === 'aprovado';
  const revealClass = `pl-reveal pl-reveal-${Math.min(index + 1, 4)}`;

  return (
    <div className={`pl-card ${revealClass}`} style={{ flexWrap: 'wrap' }}>
      <div className="pl-date"><div className="dow">{d.dow}</div><div className="dom">{d.dom}</div></div>
      <div className="pl-info">
        <h3>{item.local}</h3>
        <p className="meta">{item.horario?.slice(0, 5)}</p>
        <span className="pl-bairro-tag">{item.bairro}</span>
        <p className="meta">
          {item.tipo && `${item.tipo} · `}
          {item.nivel && `${item.nivel} · `}
          {item.valor != null && `R$ ${Number(item.valor).toFixed(2)} · `}
          {item.vagasOcupadas}/{item.vagasTotais} vagas
        </p>
        <p className="meta" style={{ color: 'var(--paper-dim)' }}>{STATUS_LABEL[item.minhaConfirmacaoStatus]}</p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, width: '100%', marginTop: 8, justifyContent: 'flex-end' }}>
        <Link href={`/pelada/${item.id}`} className="pl-share-btn" style={{ textDecoration: 'none' }}>Ver detalhes</Link>
        {item.minhaConfirmacaoStatus === 'aguardando_confirmacao' && (
          <TicketButton compact onClick={() => onConfirmar(item.minhaConfirmacaoId)}>Confirmar vaga</TicketButton>
        )}
        {podeAgenda && (
          <>
            <a href={googleCalendarUrl(item)} target="_blank" rel="noopener noreferrer" className="pl-share-btn" style={{ textDecoration: 'none' }}>
              Google Agenda
            </a>
            <a href={`/api/games/${item.id}/ics`} className="pl-share-btn" style={{ textDecoration: 'none' }}>
              Baixar .ics
            </a>
          </>
        )}
        <button type="button" className="pl-share-btn pl-btn-danger" onClick={() => onCancelar(item.minhaConfirmacaoId, item)}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
