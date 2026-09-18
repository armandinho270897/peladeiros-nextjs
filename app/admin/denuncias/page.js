'use client';
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '../../components/ToastProvider';
import EmptyFieldIcon from '../../components/icons/EmptyFieldIcon';
import MotivoModal from '../MotivoModal';

const FILTROS = [
  { id: '', label: 'Abertas' },
  { id: 'resolvida', label: 'Resolvidas' },
  { id: 'arquivada', label: 'Arquivadas' },
];

const MOTIVO_LABEL = {
  comportamento_abusivo: 'Comportamento abusivo',
  no_show_recorrente: 'No-show recorrente',
  informacao_falsa: 'Informação falsa',
  conteudo_inadequado: 'Conteúdo inadequado',
  problema_seguranca: 'Problema de segurança',
  outro: 'Outro',
};

const ALVO_LABEL = { jogador: 'Jogador', pelada: 'Pelada', arena: 'Arena' };

export default function AdminDenunciasPage() {
  const { showToast } = useToast();
  const [filtro, setFiltro] = useState('');
  const [denuncias, setDenuncias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const carregar = useCallback(async (status) => {
    setLoading(true);
    const res = await fetch(`/api/admin/denuncias${status ? `?status=${status}` : ''}`);
    const data = await res.json();
    setDenuncias(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(filtro); }, [filtro, carregar]);

  async function marcarEmAnalise(id) {
    const res = await fetch(`/api/admin/denuncias/${id}/decisao`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'em_analise' }) });
    const result = await res.json();
    if (!res.ok) { showToast(result.error || 'Não consegui processar.'); return; }
    setDenuncias((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'em_analise' } : d)));
  }

  async function decidir(id, status, decisao) {
    const res = await fetch(`/api/admin/denuncias/${id}/decisao`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, decisao }) });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    setDenuncias((prev) => prev.filter((d) => d.id !== id));
    setModal(null);
    showToast(status === 'resolvida' ? 'Denúncia resolvida.' : 'Denúncia arquivada.');
  }

  return (
    <div>
      <div className="pl-admin-toolbar">
        {FILTROS.map((f) => (
          <button key={f.id} type="button" className={`pl-tab ${filtro === f.id ? 'active' : ''}`} onClick={() => setFiltro(f.id)}>{f.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="pl-admin-cards">{[1, 2].map((i) => <div key={i} className="pl-skeleton" style={{ height: 130 }} />)}</div>
      ) : denuncias.length === 0 ? (
        <div className="pl-empty"><EmptyFieldIcon /><p>Nenhuma denúncia por aqui.</p></div>
      ) : (
        <div className="pl-admin-cards">
          {denuncias.map((d) => (
            <div key={d.id} className="pl-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <span className="pl-admin-badge">{ALVO_LABEL[d.alvo_tipo]}</span>
                  <h3 style={{ margin: '4px 0 2px', fontFamily: 'var(--font-display)', color: 'var(--paper)' }}>{d.alvo_label}</h3>
                  <div style={{ fontSize: 12, color: 'var(--paper-dim)' }}>{MOTIVO_LABEL[d.motivo]} · denunciado por {d.autor_nome}</div>
                  {d.descricao && <p style={{ fontSize: 13, color: 'var(--paper)', margin: '6px 0 0' }}>{d.descricao}</p>}
                  <div style={{ fontSize: 11, color: 'var(--paper-dim)', marginTop: 4 }}>{new Date(d.created_at).toLocaleString('pt-BR')}</div>
                  {d.decisao && <p style={{ fontSize: 12, color: 'var(--paper-dim)', marginTop: 4 }}>Decisão: {d.decisao}</p>}
                </div>
                <span className={`pl-admin-badge ${d.status === 'resolvida' ? 'positivo' : d.status === 'arquivada' ? 'negativo' : ''}`}>{d.status.replace('_', ' ')}</span>
              </div>

              {(d.status === 'aberta' || d.status === 'em_analise') && (
                <div className="pl-admin-row-actions">
                  {d.status === 'aberta' && (
                    <button type="button" className="pl-btn-secondary" onClick={() => marcarEmAnalise(d.id)}>Marcar em análise</button>
                  )}
                  <button type="button" className="pl-btn-secondary" onClick={() => setModal({ id: d.id, status: 'arquivada' })}>Arquivar</button>
                  <button type="button" className="pl-btn-secondary" onClick={() => setModal({ id: d.id, status: 'resolvida' })}>Resolver</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <MotivoModal
          titulo={modal.status === 'resolvida' ? 'Resolver denúncia' : 'Arquivar denúncia'}
          descricao="Registra a decisão tomada — fica salva na auditoria e visível pro autor da denúncia."
          labelBotao={modal.status === 'resolvida' ? 'Resolver' : 'Arquivar'}
          perigoso={false}
          onCancel={() => setModal(null)}
          onConfirm={(decisao) => decidir(modal.id, modal.status, decisao)}
        />
      )}
    </div>
  );
}
