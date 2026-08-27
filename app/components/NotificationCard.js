'use client';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';
import Avatar from './Avatar';
import { categoriaDe, iconeDe } from '@/lib/notifCategorias';

function tempoRelativo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

// Cada card é isolado no próprio try/catch — um registro com dado
// inesperado (data inválida, mensagem vazia) não derruba a lista inteira,
// só vira um card genérico e reporta pro Sentry o que aconteceu.
export default function NotificationCard({ n, ator, onNavigate }) {
  let conteudo;
  try {
    const categoria = categoriaDe(n.tipo);
    const tempo = tempoRelativo(n.created_at);
    const mensagem = n.mensagem?.trim() || 'Aviso sem descrição.';

    conteudo = (
      <div className={`pl-n-card ${categoria} ${n.lida ? '' : 'unread'}`}>
        {!n.lida && <span className="pl-n-dot" aria-hidden="true" />}
        <span className="pl-n-icon" aria-hidden="true">{iconeDe(n.tipo)}</span>
        <div className="pl-n-body">
          <div className="pl-n-top">
            <span className="pl-n-time">{tempo}</span>
          </div>
          <p className="pl-n-msg">{mensagem}</p>
          {ator && (
            <div className="pl-n-actor">
              <Avatar nome={ator.nome} fotoUrl={ator.foto_url} size={20} />
              <span>{ator.nome}</span>
            </div>
          )}
        </div>
      </div>
    );
  } catch (err) {
    Sentry.captureException(err instanceof Error ? err : new Error(`NotificationCard falhou renderizando ${n?.id}: ${err}`));
    conteudo = (
      <div className="pl-n-card">
        <span className="pl-n-icon" aria-hidden="true">🔔</span>
        <div className="pl-n-body"><p className="pl-n-msg">Aviso.</p></div>
      </div>
    );
  }

  if (n.game_id) {
    return (
      <Link href={`/pelada/${n.game_id}`} className="pl-n-card-link" onClick={onNavigate}>
        {conteudo}
      </Link>
    );
  }
  return conteudo;
}
