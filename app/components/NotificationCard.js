'use client';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';
import Avatar from './Avatar';
import NotifIconBadge from './NotifIconBadge';
import { categoriaDe, iconeDe, corDe, indicadorDe } from '@/lib/notifCategorias';
import { tempoRelativo, comNomeEmNegrito } from '@/lib/notificacoes';

// Cada card é isolado no próprio try/catch — um registro com dado
// inesperado (data inválida, mensagem vazia) não derruba a lista inteira,
// só vira um card genérico e reporta pro Sentry o que aconteceu.
export default function NotificationCard({ n, ator, onNavigate }) {
  let conteudo;
  try {
    const categoria = categoriaDe(n.tipo);
    const tempo = tempoRelativo(n.created_at);
    const mensagem = n.mensagem?.trim() || 'Aviso sem descrição.';
    // Toda notificação com autor conhecido mostra quem é direto no lugar do
    // ícone de categoria, em vez de um símbolo genérico — o selo "+" só faz
    // sentido no caso de pedido pra entrar (é quando de fato "adiciona"
    // alguém), então fica reservado só pra esse tipo.
    const ehPedido = n.tipo === 'solicitacao_pendente';

    conteudo = (
      <div className={`pl-n-card ${categoria} ${n.lida ? '' : 'unread'}`}>
        {!n.lida && <span className="pl-n-dot" aria-hidden="true" />}
        {ator ? (
          <span className="pl-n-icon pl-n-icon-avatar" aria-hidden="true">
            <Avatar nome={ator.nome} fotoUrl={ator.foto_url} size={34} />
            {ehPedido && <span className="pl-n-actor-badge">+</span>}
          </span>
        ) : (
          <NotifIconBadge icone={iconeDe(n.tipo)} cor={corDe(n.tipo)} size={34} {...indicadorDe(n.tipo)} />
        )}
        <div className="pl-n-body">
          <div className="pl-n-top">
            <span className="pl-n-time">{tempo}</span>
          </div>
          <p className="pl-n-msg">{comNomeEmNegrito(mensagem, ator?.nome)}</p>
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
