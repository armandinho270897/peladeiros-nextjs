'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '../components/AuthProvider';
import NotificationCard from '../components/NotificationCard';
import BolaParadaIcon from '../components/icons/BolaParadaIcon';
import { categoriaDe } from '@/lib/notifCategorias';
import { todayISO } from '@/lib/gameUtils';
import { fetchNotificacoesComAtores } from '@/lib/notificacoes';

function rotuloDia(iso) {
  if (!iso) return '';
  const data = iso.slice(0, 10);
  const hoje = todayISO();
  if (data === hoje) return 'Hoje';
  // Mesma lógica de todayISO (data local, não UTC) só que com "agora - 1
  // dia" — usar toISOString() aqui desalinharia com "hoje" perto da
  // meia-noite em fusos negativos (ex: Brasil, UTC-3).
  const ont = new Date();
  ont.setDate(ont.getDate() - 1);
  const ontem = ont.getFullYear() + '-' + String(ont.getMonth() + 1).padStart(2, '0') + '-' + String(ont.getDate()).padStart(2, '0');
  if (data === ontem) return 'Ontem';
  const [y, m, d] = data.split('-');
  return `${d}/${m}`;
}

export default function AvisosPage() {
  const { user, loading: authLoading } = useAuth();
  const [supabase] = useState(() => createClient());
  const [notificacoes, setNotificacoes] = useState([]);
  const [atores, setAtores] = useState({});
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState('urgente');
  const [anterioresAbertos, setAnterioresAbertos] = useState({ urgente: false, comunidade: false });

  // "Novo" pra essa visita é definido na primeira vez que cada aviso
  // aparece nesta sessão da página — não no campo `lida` ao vivo, que o
  // efeito abaixo já sobrescreve pra true segundos depois de abrir. Sem
  // esse instantâneo, a seção "Novos" ficaria vazia quase assim que a
  // página termina de carregar, mesmo pro usuário que acabou de chegar.
  // Um aviso que chegar de verdade enquanto a página está aberta (poll de
  // 30s) entra como novo normalmente, por nunca ter sido visto antes.
  const conhecidosRef = useRef(new Set());
  const novosRef = useRef(new Set());

  const load = useCallback(async () => {
    if (!user) return;
    const { notificacoes: rows, atores: atoresMap, error } = await fetchNotificacoesComAtores(supabase, user.id, 60);
    if (error) { Sentry.captureException(error); setLoading(false); return; }
    for (const n of rows) {
      if (!conhecidosRef.current.has(n.id)) {
        conhecidosRef.current.add(n.id);
        if (!n.lida) novosRef.current.add(n.id);
      }
    }
    setNotificacoes(rows);
    setAtores(atoresMap);
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    load();
    // Mesmo polling de 30s que o sino sempre teve — a página fica aberta
    // (ex: usuário esperando uma aprovação) e precisa continuar recebendo
    // avisos novos, não só carregar uma vez no mount.
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  // Abrir a página já marca como lido — mesmo comportamento de sempre
  // (abrir o painel marcava tudo), só que agora é a página inteira. Isso é
  // só o campo `lida` no banco/estado; a classificação novo x já visto
  // (novosRef, acima) não muda com isso.
  useEffect(() => {
    if (!user || notificacoes.length === 0) return;
    const naoLidasIds = notificacoes.filter((n) => !n.lida).map((n) => n.id);
    if (naoLidasIds.length === 0) return;
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    supabase.from('notificacoes').update({ lida: true }).eq('user_id', user.id).eq('lida', false)
      .then(({ error }) => {
        if (error) { Sentry.captureException(error); return; }
        // Avisa o sino (montado no layout raiz, fora desta página) que o
        // contador de não-lidas mudou — ele só reconsulta a cada 30s ou em
        // focus/visibilitychange, nenhum dos dois dispara numa navegação
        // client-side pra dentro/fora de /avisos.
        window.dispatchEvent(new Event('pl-notificacoes-lidas'));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificacoes.length, user]);

  if (authLoading || loading) {
    return (
      <div>
        <div className="pl-list" style={{ paddingTop: 14 }}><div className="pl-skeleton" style={{ height: 200 }} /></div>
      </div>
    );
  }

  const doTipo = notificacoes.filter((n) => categoriaDe(n.tipo) === aba);
  const novos = doTipo.filter((n) => novosRef.current.has(n.id));
  const anteriores = doTipo.filter((n) => !novosRef.current.has(n.id));

  const contaNovos = (cat) => notificacoes.filter((n) => categoriaDe(n.tipo) === cat && novosRef.current.has(n.id)).length;
  const urgentesCount = contaNovos('urgente');
  const comunidadeCount = contaNovos('comunidade');

  // Sem nada novo pra mostrar, não faz sentido esconder o único conteúdo
  // que existe atrás de um toggle fechado.
  const anterioresAberto = anterioresAbertos[aba] || novos.length === 0;

  let ultimoDia = null;

  return (
    <div>
      <div className="pl-avisos-head">
        <h1>Avisos</h1>
        <div className="pl-avisos-tabs">
          <button type="button" className={`pl-avisos-tab ${aba === 'urgente' ? 'active' : ''}`} onClick={() => setAba('urgente')}>
            Urgentes {urgentesCount > 0 && <span className="pl-avisos-tab-count">{urgentesCount}</span>}
          </button>
          <button type="button" className={`pl-avisos-tab ${aba === 'comunidade' ? 'active' : ''}`} onClick={() => setAba('comunidade')}>
            Comunidade {comunidadeCount > 0 && <span className="pl-avisos-tab-count">{comunidadeCount}</span>}
          </button>
        </div>
      </div>

      <div className="pl-avisos-list">
        {doTipo.length === 0 ? (
          <div className="pl-avisos-empty">
            <BolaParadaIcon width={72} />
            <p>Nada por aqui ainda.</p>
          </div>
        ) : (
          <>
            {novos.length === 0 ? (
              <div className="pl-avisos-tudo-em-dia">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--neon)" strokeWidth="1.8" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8 12.5l2.5 2.5L16 9" />
                </svg>
                <b>Tudo em dia</b>
                <span>Nenhum aviso novo — o histórico continua logo abaixo.</span>
              </div>
            ) : (
              <>
                <div className="pl-avisos-secao-label novos"><span className="linha" />Novos<span className="linha" /></div>
                {novos.map((n) => (
                  <NotificationCard key={n.id} n={n} ator={n.ator_user_id ? atores[n.ator_user_id] : null} />
                ))}
              </>
            )}

            {anteriores.length > 0 && (
              <>
                <button
                  type="button"
                  className={`pl-avisos-anteriores-toggle ${anterioresAberto ? 'aberto' : ''}`}
                  onClick={() => setAnterioresAbertos((prev) => ({ ...prev, [aba]: !prev[aba] }))}
                >
                  <span className="linha">Já vistos</span>
                  <span className="n">{anteriores.length}</span>
                  <svg className="seta" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {anterioresAberto && (
                  <div className="pl-avisos-anteriores">
                    {anteriores.map((n) => {
                      const dia = rotuloDia(n.created_at);
                      const mostraDia = dia !== ultimoDia;
                      ultimoDia = dia;
                      return (
                        <div key={n.id}>
                          {mostraDia && <div className="pl-avisos-day">{dia}</div>}
                          <NotificationCard n={n} ator={n.ator_user_id ? atores[n.ator_user_id] : null} compact />
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
