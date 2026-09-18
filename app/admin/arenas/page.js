'use client';
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '../../components/ToastProvider';
import EmptyFieldIcon from '../../components/icons/EmptyFieldIcon';
import MotivoModal from '../MotivoModal';

const FILTROS = [
  { id: 'pendente', label: 'Pendentes' },
  { id: 'aprovada', label: 'Aprovadas' },
  { id: 'pausada', label: 'Pausadas' },
  { id: 'rejeitada', label: 'Rejeitadas' },
];

const BADGE = { pendente: '', aprovada: 'positivo', pausada: '', rejeitada: 'negativo' };

export default function AdminArenasPage() {
  const { showToast } = useToast();
  const [filtro, setFiltro] = useState('pendente');
  const [arenas, setArenas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(null);
  const [modal, setModal] = useState(null);
  const [editando, setEditando] = useState(null);

  const carregar = useCallback(async (status) => {
    setLoading(true);
    const res = await fetch(`/api/admin/arenas?status=${status}`);
    const data = await res.json();
    setArenas(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(filtro); }, [filtro, carregar]);

  async function aprovar(id) {
    setProcessando(id);
    const res = await fetch(`/api/admin/arenas/${id}/aprovar`, { method: 'POST' });
    setProcessando(null);
    const result = await res.json();
    if (!res.ok) { showToast(result.error || 'Não consegui processar.'); return; }
    setArenas((prev) => prev.filter((a) => a.id !== id));
    showToast('Arena aprovada.');
  }

  async function despausar(id) {
    setProcessando(id);
    const res = await fetch(`/api/admin/arenas/${id}/despausar`, { method: 'POST' });
    setProcessando(null);
    const result = await res.json();
    if (!res.ok) { showToast(result.error || 'Não consegui processar.'); return; }
    setArenas((prev) => prev.filter((a) => a.id !== id));
    showToast('Arena reativada.');
  }

  async function salvarEdicao(id, campos) {
    const res = await fetch(`/api/admin/arenas/${id}/editar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(campos) });
    const result = await res.json();
    if (!res.ok) { showToast(result.error || 'Não consegui salvar.'); return; }
    setArenas((prev) => prev.map((a) => (a.id === id ? { ...a, ...result } : a)));
    setEditando(null);
    showToast('Arena atualizada.');
  }

  async function comMotivo(id, acao, motivo) {
    const res = await fetch(`/api/admin/arenas/${id}/${acao}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ motivo }) });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    setArenas((prev) => prev.filter((a) => a.id !== id));
    setModal(null);
    showToast(acao === 'rejeitar' ? 'Arena rejeitada.' : 'Arena pausada.');
  }

  return (
    <div>
      <div className="pl-admin-toolbar">
        {FILTROS.map((f) => (
          <button key={f.id} type="button" className={`pl-tab ${filtro === f.id ? 'active' : ''}`} onClick={() => setFiltro(f.id)}>{f.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="pl-admin-cards">{[1, 2].map((i) => <div key={i} className="pl-skeleton" style={{ height: 140 }} />)}</div>
      ) : arenas.length === 0 ? (
        <div className="pl-empty"><EmptyFieldIcon /><p>Nenhuma arena aqui agora.</p></div>
      ) : (
        <div className="pl-admin-cards">
          {arenas.map((a) => (
            <div key={a.id} className="pl-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <h3 style={{ margin: '0 0 2px', fontFamily: 'var(--font-display)', color: 'var(--paper)', textTransform: 'uppercase' }}>{a.nome}</h3>
                  <div style={{ fontSize: 12, color: 'var(--paper-dim)', textTransform: 'capitalize' }}>{a.tipo} · {a.bairro}</div>
                  <div style={{ fontSize: 12, color: 'var(--paper-dim)' }}>{a.endereco}</div>
                  <div style={{ fontSize: 12, color: 'var(--paper-dim)', marginTop: 4 }}>Proposto por: {a.proposto_por_nome || 'Desconhecido'}</div>
                </div>
                <span className={`pl-admin-badge ${BADGE[a.status]}`}>{a.status}</span>
              </div>

              {editando === a.id ? (
                <EditarArenaForm arena={a} onCancel={() => setEditando(null)} onSalvar={(campos) => salvarEdicao(a.id, campos)} />
              ) : (
                <div className="pl-admin-row-actions">
                  {a.status === 'pendente' && (
                    <>
                      <button type="button" className="pl-btn-secondary pl-btn-danger" disabled={processando === a.id} onClick={() => setModal({ id: a.id, acao: 'rejeitar' })}>Rejeitar</button>
                      <button type="button" className="pl-btn-secondary" disabled={processando === a.id} onClick={() => aprovar(a.id)}>{processando === a.id ? 'Processando...' : 'Aprovar'}</button>
                    </>
                  )}
                  {a.status === 'aprovada' && (
                    <button type="button" className="pl-btn-secondary" disabled={processando === a.id} onClick={() => setModal({ id: a.id, acao: 'pausar' })}>Pausar</button>
                  )}
                  {a.status === 'pausada' && (
                    <button type="button" className="pl-btn-secondary" disabled={processando === a.id} onClick={() => despausar(a.id)}>Reativar</button>
                  )}
                  <button type="button" className="pl-btn-secondary" onClick={() => setEditando(a.id)}>Editar dados</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <MotivoModal
          titulo={modal.acao === 'rejeitar' ? 'Rejeitar arena' : 'Pausar arena'}
          labelBotao={modal.acao === 'rejeitar' ? 'Rejeitar' : 'Pausar'}
          onCancel={() => setModal(null)}
          onConfirm={(motivo) => comMotivo(modal.id, modal.acao, motivo)}
        />
      )}
    </div>
  );
}

const TIPOS_ARENA = ['quadra escolar', 'arena', 'quadra pública', 'rua', 'campo', 'estádio'];

function EditarArenaForm({ arena, onCancel, onSalvar }) {
  const [nome, setNome] = useState(arena.nome);
  const [endereco, setEndereco] = useState(arena.endereco);
  const [bairro, setBairro] = useState(arena.bairro);
  const [tipo, setTipo] = useState(arena.tipo);
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar() {
    setSalvando(true);
    await onSalvar({ nome, endereco, bairro, tipo });
    setSalvando(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="pl-field"><label>Nome</label><input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
      <div className="pl-field"><label>Endereço</label><input value={endereco} onChange={(e) => setEndereco(e.target.value)} /></div>
      <div className="pl-field"><label>Bairro</label><input value={bairro} onChange={(e) => setBairro(e.target.value)} /></div>
      <div className="pl-field">
        <label>Tipo</label>
        <select className="pl-select" value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ width: '100%' }}>
          {TIPOS_ARENA.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="pl-admin-row-actions">
        <button type="button" className="pl-btn-secondary" onClick={onCancel}>Cancelar</button>
        <button type="button" className="pl-btn-secondary" disabled={salvando} onClick={handleSalvar}>{salvando ? 'Salvando...' : 'Salvar'}</button>
      </div>
    </div>
  );
}
