'use client';
import { useEffect, useState, useCallback } from 'react';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '../components/AuthProvider';
import BackLink from '../components/BackLink';
import NotificationCard from '../components/NotificationCard';
import BolaParadaIcon from '../components/BolaParadaIcon';
import { categoriaDe } from '@/lib/notifCategorias';
import { todayISO } from '@/lib/gameUtils';

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

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('notificacoes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(60);
    if (error) { Sentry.captureException(error); setLoading(false); return; }
    const rows = data || [];
    setNotificacoes(rows);
    setLoading(false);

    const atorIds = [...new Set(rows.map((n) => n.ator_user_id).filter(Boolean))];
    if (atorIds.length > 0) {
      const { data: perfis } = await supabase.from('profiles').select('id, nome, foto_url').in('id', atorIds);
      setAtores(Object.fromEntries((perfis || []).map((p) => [p.id, p])));
    }
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
  // (abrir o painel marcava tudo), só que agora é a página inteira.
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
        <div className="pl-header"><BackLink href="/" /></div>
        <div className="pl-list" style={{ paddingTop: 14 }}><div className="pl-skeleton" style={{ height: 200 }} /></div>
      </div>
    );
  }

  const doTipo = notificacoes.filter((n) => categoriaDe(n.tipo) === aba);
  const urgentesCount = notificacoes.filter((n) => categoriaDe(n.tipo) === 'urgente').length;
  const comunidadeCount = notificacoes.filter((n) => categoriaDe(n.tipo) === 'comunidade').length;

  let ultimoDia = null;

  return (
    <div>
      <div className="pl-header"><BackLink href="/" /></div>

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
          doTipo.map((n) => {
            const dia = rotuloDia(n.created_at);
            const mostraDia = dia !== ultimoDia;
            ultimoDia = dia;
            return (
              <div key={n.id}>
                {mostraDia && <div className="pl-avisos-day">{dia}</div>}
                <NotificationCard n={n} ator={n.ator_user_id ? atores[n.ator_user_id] : null} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
