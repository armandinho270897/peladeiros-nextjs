'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from './AuthProvider';
import { fetchNotificacoesComAtores, tempoRelativo, comNomeEmNegrito } from '@/lib/notificacoes';
import { iconeDe } from '@/lib/notifCategorias';
import Avatar from './Avatar';
import BolaParadaIcon from './BolaParadaIcon';

const CHAVE_CONQUISTAS_VISTAS = 'pl-conquistas-vistas';

// Compara as conquistas desbloqueadas agora com as que esse aparelho já
// tinha visto (localStorage) — a diferença é "recém-desbloqueada" e ganha
// o brilho neon no feed. Na primeira vez que essa lógica roda (sem nada
// salvo ainda), só registra o estado atual sem marcar nada como novo —
// senão alguém com 3 conquistas antigas veria as 3 "piscarem" de uma vez
// só por ter atualizado o app.
function useConquistasRecentes(conquistas) {
  const [recentes, setRecentes] = useState([]);
  useEffect(() => {
    if (!conquistas) return;
    let vistas;
    try { vistas = JSON.parse(localStorage.getItem(CHAVE_CONQUISTAS_VISTAS) || 'null'); } catch { vistas = null; }
    if (!Array.isArray(vistas)) vistas = null;
    const desbloqueadasAgora = conquistas.filter((c) => c.desbloqueada).map((c) => c.id);
    if (vistas === null) {
      try { localStorage.setItem(CHAVE_CONQUISTAS_VISTAS, JSON.stringify(desbloqueadasAgora)); } catch {}
      return;
    }
    const novas = conquistas.filter((c) => c.desbloqueada && !vistas.includes(c.id));
    if (novas.length > 0) {
      setRecentes(novas);
      try { localStorage.setItem(CHAVE_CONQUISTAS_VISTAS, JSON.stringify(desbloqueadasAgora)); } catch {}
    }
  }, [conquistas]);
  return recentes;
}

export default function HomeFeed({ conquistas, proximaConquista }) {
  const { user } = useAuth();
  const [supabase] = useState(() => createClient());
  const [notificacoes, setNotificacoes] = useState(null); // null = carregando
  const [atores, setAtores] = useState({});
  const recentes = useConquistasRecentes(conquistas);

  useEffect(() => {
    if (!user) return;
    fetchNotificacoesComAtores(supabase, user.id, 6).then(({ notificacoes: rows, atores: atoresMap, error }) => {
      if (error) { Sentry.captureException(error); setNotificacoes([]); return; }
      setNotificacoes(rows);
      setAtores(atoresMap);
    });
  }, [supabase, user?.id]);

  // O feed resumido da Home é, ele mesmo, uma leitura das notificações mais
  // recentes — mesmo comportamento de /avisos/page.js ("abrir a página já
  // marca como lido"), só que aqui é "aparecer no feed" em vez de "abrir a
  // rota inteira". Sem isso o sino nunca zera pra quem só usa a Home.
  useEffect(() => {
    if (!user || !notificacoes || notificacoes.length === 0) return;
    const naoLidasIds = notificacoes.filter((n) => !n.lida).map((n) => n.id);
    if (naoLidasIds.length === 0) return;
    setNotificacoes((prev) => prev.map((n) => (naoLidasIds.includes(n.id) ? { ...n, lida: true } : n)));
    supabase.from('notificacoes').update({ lida: true }).in('id', naoLidasIds)
      .then(({ error }) => {
        if (error) { Sentry.captureException(error); return; }
        window.dispatchEvent(new Event('pl-notificacoes-lidas'));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificacoes?.length, user?.id]);

  const carregando = notificacoes === null;
  const vazio = !carregando && notificacoes.length === 0 && recentes.length === 0;

  return (
    <div className="pl-home-feed">
      {proximaConquista && (
        <div className="pl-glass-card pl-progress-card">
          <div className="pl-progress-top">
            <span className="pl-progress-label">Próxima conquista</span>
            <span className="pl-progress-next">{proximaConquista.titulo}</span>
          </div>
          {proximaConquista.meta != null ? (
            <>
              <div className="pl-progress-track">
                <div
                  className="pl-progress-fill"
                  style={{ width: `${Math.min(100, Math.round((proximaConquista.atual / proximaConquista.meta) * 100))}%` }}
                />
              </div>
              <div className="pl-progress-count">{proximaConquista.atual} de {proximaConquista.meta}</div>
            </>
          ) : (
            <p className="pl-progress-count" style={{ marginTop: 4 }}>{proximaConquista.descricao}</p>
          )}
        </div>
      )}

      {recentes.map((c) => (
        <div key={c.id} className="pl-glass-card pl-glass-unlocked">
          <span className="pl-glass-icon">🏆</span>
          <div className="pl-glass-body">
            <p className="pl-glass-msg">Conquista desbloqueada: <b>{c.titulo}</b> 🎉</p>
            <span className="pl-glass-time">agora</span>
          </div>
        </div>
      ))}

      {carregando ? (
        <div className="pl-skeleton" style={{ height: 60, borderRadius: 8 }} />
      ) : vazio ? (
        <div className="pl-glass-empty">
          <BolaParadaIcon width={48} />
          <p>Sem novidades ainda — confirma sua primeira pelada e o feed começa a rodar aqui.</p>
        </div>
      ) : (
        notificacoes.map((n) => {
          const ator = n.ator_user_id ? atores[n.ator_user_id] : null;
          const mensagem = n.mensagem?.trim() || 'Aviso.';
          return (
            <Link key={n.id} href={n.game_id ? `/pelada/${n.game_id}` : '/avisos'} className="pl-glass-card">
              {ator ? (
                <span className="pl-glass-icon pl-glass-icon-avatar" aria-hidden="true">
                  <Avatar nome={ator.nome} fotoUrl={ator.foto_url} size={38} />
                  {n.tipo === 'solicitacao_pendente' && <span className="pl-n-actor-badge">+</span>}
                </span>
              ) : (
                <span className="pl-glass-icon" aria-hidden="true">{iconeDe(n.tipo)}</span>
              )}
              <div className="pl-glass-body">
                <p className="pl-glass-msg">{comNomeEmNegrito(mensagem, ator?.nome)}</p>
                <span className="pl-glass-time">{tempoRelativo(n.created_at)}</span>
              </div>
            </Link>
          );
        })
      )}

      {!carregando && !vazio && (
        <div className="pl-glass-see-all"><Link href="/avisos">Ver todos os avisos →</Link></div>
      )}
    </div>
  );
}
