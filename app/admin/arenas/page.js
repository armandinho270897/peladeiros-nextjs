'use client';
import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { ADMIN_USER_ID } from '@/lib/adminConfig';
import { useAuth } from '../../components/AuthProvider';
import { useToast } from '../../components/ToastProvider';
import TicketButton from '../../components/TicketButton';
import EmptyFieldIcon from '../../components/EmptyFieldIcon';
import BackLink from '../../components/BackLink';

const ArenaMiniMap = dynamic(() => import('../../components/ArenaMiniMap'), { ssr: false });

// Fila de aprovação de arena — só o dono do app acessa (verificado pelo
// user_id fixo em lib/adminConfig.js). Quem não é o dono vê uma mensagem
// de acesso negado em vez do conteúdo da fila.
export default function AprovarArenasPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [pendentes, setPendentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/arenas/pendentes');
    const data = await res.json();
    setPendentes(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user?.id === ADMIN_USER_ID) carregar();
  }, [user, carregar]);

  async function handleDecisao(id, acao) {
    setProcessando(id);
    const res = await fetch(`/api/arenas/${id}/${acao}`, { method: 'POST' });
    const result = await res.json();
    setProcessando(null);
    if (!res.ok) { showToast(result.error || 'Não consegui processar. Tenta de novo.'); return; }
    setPendentes((prev) => prev.filter((a) => a.id !== id));
    showToast(acao === 'aprovar' ? 'Arena aprovada — já aparece no mapa!' : 'Arena rejeitada.');
  }

  if (authLoading) {
    return (
      <div>
        <div className="pl-header"><BackLink href="/peladas" /></div>
        <div className="pl-list" style={{ paddingTop: 14 }}><div className="pl-skeleton" style={{ height: 200 }} /></div>
      </div>
    );
  }

  if (user?.id !== ADMIN_USER_ID) {
    return (
      <div>
        <div className="pl-header"><BackLink href="/peladas" /></div>
        <div className="pl-empty">
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--paper)' }}>Sem permissão</h3>
          <p>Essa página é só pra administração do app.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="pl-header"><Link href="/peladas" style={{ color: 'var(--neon)', fontSize: 13, textDecoration: 'none' }}>&larr; Voltar</Link></div>

      <div className="pl-hero-title-row" style={{ maxWidth: 640, margin: '18px auto 0', padding: '0 16px' }}>
        <h2 className="pl-hero-title">Aprovar arenas</h2>
        <span className="pl-hero-count">{pendentes.length} pendente{pendentes.length === 1 ? '' : 's'}</span>
      </div>

      <div style={{ maxWidth: 640, margin: '14px auto 0', padding: '0 16px 24px' }}>
        {loading ? (
          <div className="pl-list">
            {[1, 2].map((i) => <div key={i} className="pl-skeleton" style={{ height: 220 }} />)}
          </div>
        ) : pendentes.length === 0 ? (
          <div className="pl-empty">
            <EmptyFieldIcon />
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--paper)' }}>Fila vazia 🎉</h3>
            <p>Nenhuma arena esperando aprovação agora.</p>
          </div>
        ) : (
          <div className="pl-list">
            {pendentes.map((a) => (
              <div key={a.id} className="pl-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {a.foto_url && (
                  <img src={a.foto_url} alt={a.nome} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
                )}
                <div>
                  <h3 style={{ margin: '0 0 2px', fontFamily: 'var(--font-display)', color: 'var(--paper)', textTransform: 'uppercase' }}>{a.nome}</h3>
                  <div style={{ fontSize: 12, color: 'var(--paper-dim)', textTransform: 'capitalize' }}>{a.tipo} · {a.bairro}</div>
                  <div style={{ fontSize: 12, color: 'var(--paper-dim)' }}>{a.endereco}</div>
                  <div style={{ fontSize: 12, color: 'var(--paper-dim)', marginTop: 4 }}>
                    Proposto por: {a.proposto_por_nome || 'Desconhecido'}
                  </div>
                </div>
                {a.latitude != null && a.longitude != null ? (
                  <ArenaMiniMap lat={Number(a.latitude)} lng={Number(a.longitude)} />
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--paper-dim)', fontStyle: 'italic' }}>Sem localização marcada no mapa.</div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className="pl-btn-secondary"
                    style={{ flex: 1 }}
                    disabled={processando === a.id}
                    onClick={() => handleDecisao(a.id, 'rejeitar')}
                  >
                    Rejeitar
                  </button>
                  <TicketButton style={{ flex: 1 }} disabled={processando === a.id} onClick={() => handleDecisao(a.id, 'aprovar')}>
                    {processando === a.id ? 'Processando...' : 'Aprovar'}
                  </TicketButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
