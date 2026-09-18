'use client';
import { useEffect, useState, useCallback } from 'react';
import EmptyFieldIcon from '../../components/icons/EmptyFieldIcon';

const PERIODOS = [{ id: '', label: 'Tudo' }, { id: 'hoje', label: 'Hoje' }, { id: '7d', label: '7 dias' }, { id: '30d', label: '30 dias' }];

export default function AdminAuditoriaPage() {
  const [periodo, setPeriodo] = useState('7d');
  const [alvoTipo, setAlvoTipo] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (periodo) params.set('periodo', periodo);
    if (alvoTipo) params.set('alvoTipo', alvoTipo);
    const res = await fetch(`/api/admin/auditoria?${params.toString()}`);
    const data = await res.json();
    setLogs(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [periodo, alvoTipo]);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div>
      <div className="pl-admin-toolbar">
        {PERIODOS.map((p) => (
          <button key={p.id} type="button" className={`pl-tab ${periodo === p.id ? 'active' : ''}`} onClick={() => setPeriodo(p.id)}>{p.label}</button>
        ))}
        <select className="pl-select" value={alvoTipo} onChange={(e) => setAlvoTipo(e.target.value)}>
          <option value="">Todos os alvos</option>
          <option value="arena">Arena</option>
          <option value="usuario">Usuário</option>
          <option value="pelada">Pelada</option>
          <option value="denuncia">Denúncia</option>
          <option value="aviso">Aviso</option>
          <option value="config">Configuração</option>
        </select>
      </div>

      {loading ? (
        <div className="pl-admin-cards">{[1, 2, 3].map((i) => <div key={i} className="pl-skeleton" style={{ height: 70 }} />)}</div>
      ) : logs.length === 0 ? (
        <div className="pl-empty"><EmptyFieldIcon /><p>Nenhuma ação registrada nesse filtro.</p></div>
      ) : (
        <div className="pl-admin-cards">
          {logs.map((l) => (
            <div key={l.id} className="pl-card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <b style={{ fontSize: 13, color: 'var(--paper)' }}>{l.acao.replace(/_/g, ' ')}</b>
                <span style={{ fontSize: 11, color: 'var(--paper-dim)' }}>{new Date(l.created_at).toLocaleString('pt-BR')}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--paper-dim)' }}>
                {l.admin_nome} · {l.alvo_tipo}{l.alvo_id ? ` #${l.alvo_id.slice(0, 8)}` : ''}
              </div>
              {l.motivo && <div style={{ fontSize: 12, color: 'var(--paper)' }}>Motivo: {l.motivo}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
