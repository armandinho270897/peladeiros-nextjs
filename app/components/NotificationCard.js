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
//
// compact: versão em linha, usada na seção "Já vistos" (histórico) — o
// mesmo ícone/avatar/categoria de sempre, só que menor e sem o peso visual
// do card grande (sem borda de não-lido, sem badge "+"), pra não competir
// com os avisos novos.
export default function NotificationCard({ n, ator, onNavigate, compact = false }) {
  let conteudo;
  try {
    const categoria = categoriaDe(n.tipo);
    const tempo = tempoRelativo(n.created_at);
    const mensagem = n.mensagem?.trim() || 'Aviso sem descrição.';

    if (compact) {
      conteudo = (
        <div className={`pl-n-row ${categoria}`}>
          <span className="pl-n-row-icon" aria-hidden="true">
            {ator ? <Avatar nome={ator.nome} fotoUrl={ator.foto_url} size={24} /> : <NotifIconBadge icone={iconeDe(n.tipo)} cor={corDe(n.tipo)} size={24} />}
          </span>
          <span className="pl-n-row-msg">{mensagem}</span>
          <span className="pl-n-row-time">{tempo}</span>
        </div>
      );
    } else {
      // Toda notificação com autor conhecido mostra quem é direto no lugar
      // do ícone de categoria, em vez de um símbolo genérico — o selo "+"
      // só faz sentido no caso de pedido pra entrar (é quando de fato
      // "adiciona" alguém), então fica reservado só pra esse tipo.
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
    }
  } catch (err) {
    Sentry.captureException(err instanceof Error ? err : new Error(`NotificationCard falhou renderizando ${n?.id}: ${err}`));
    conteudo = compact ? (
      <div className="pl-n-row"><span className="pl-n-row-msg">Aviso.</span></div>
    ) : (
      <div className="pl-n-card">
        <span className="pl-n-icon" aria-hidden="true" />
        <div className="pl-n-body"><p className="pl-n-msg">Aviso.</p></div>
      </div>
    );
  }

  if (n.game_id) {
    return (
      <Link href={`/pelada/${n.game_id}`} className={compact ? 'pl-n-row-link' : 'pl-n-card-link'} onClick={onNavigate}>
        {conteudo}
      </Link>
    );
  }
  return conteudo;
}
