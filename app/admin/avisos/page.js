'use client';
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '../../components/ToastProvider';
import EmptyFieldIcon from '../../components/EmptyFieldIcon';

const PUBLICOS = [
  { id: 'todos', label: 'Todos' },
  { id: 'organizadores', label: 'Organizadores' },
];

export default function AdminAvisosPage() {
  const { showToast } = useToast();
  const [avisos, setAvisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ titulo: '', mensagem: '', publicoAlvo: 'todos', fimEm: '' });
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/avisos');
    const data = await res.json();
    setAvisos(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function criar(e) {
    e.preventDefault();
    if (!form.titulo.trim() || !form.mensagem.trim()) return;
    setEnviando(true);
    const res = await fetch('/api/admin/avisos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, fimEm: form.fimEm ? new Date(form.fimEm).toISOString() : null }),
    });
    const result = await res.json();
    setEnviando(false);
    if (!res.ok) { showToast(result.error || 'Não consegui criar.'); return; }
    setAvisos((prev) => [result, ...prev]);
    setForm({ titulo: '', mensagem: '', publicoAlvo: 'todos', fimEm: '' });
    showToast('Aviso criado como rascunho — publica quando revisar.');
  }

  async function alternarPublicacao(id, publicado) {
    const res = await fetch(`/api/admin/avisos/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publicado: !publicado }) });
    const result = await res.json();
    if (!res.ok) { showToast(result.error || 'Não consegui atualizar.'); return; }
    setAvisos((prev) => prev.map((a) => (a.id === id ? result : a)));
    showToast(result.publicado ? 'Aviso publicado.' : 'Aviso despublicado.');
  }

  return (
    <div>
      <form onSubmit={criar} className="pl-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--paper)' }}>Novo aviso</h3>
        <div className="pl-field"><label>Título</label><input value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} /></div>
        <div className="pl-field"><label>Mensagem</label><textarea rows={3} value={form.mensagem} onChange={(e) => setForm((f) => ({ ...f, mensagem: e.target.value }))} style={{ width: '100%' }} /></div>
        <div className="pl-field">
          <label>Público-alvo</label>
          <select className="pl-select" value={form.publicoAlvo} onChange={(e) => setForm((f) => ({ ...f, publicoAlvo: e.target.value }))} style={{ width: '100%' }}>
            {PUBLICOS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div className="pl-field"><label>Encerrar em (opcional)</label><input type="datetime-local" value={form.fimEm} onChange={(e) => setForm((f) => ({ ...f, fimEm: e.target.value }))} /></div>
        <button type="submit" className="pl-btn-secondary" disabled={enviando}>{enviando ? 'Criando...' : 'Criar rascunho'}</button>
      </form>

      {loading ? (
        <div className="pl-admin-cards">{[1, 2].map((i) => <div key={i} className="pl-skeleton" style={{ height: 90 }} />)}</div>
      ) : avisos.length === 0 ? (
        <div className="pl-empty"><EmptyFieldIcon /><p>Nenhum aviso criado ainda.</p></div>
      ) : (
        <div className="pl-admin-cards">
          {avisos.map((a) => (
            <div key={a.id} className="pl-card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--paper)' }}>{a.titulo}</h3>
                <span className={`pl-admin-badge ${a.publicado ? 'positivo' : ''}`}>{a.publicado ? 'publicado' : 'rascunho'}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--paper)', margin: 0 }}>{a.mensagem}</p>
              <div style={{ fontSize: 12, color: 'var(--paper-dim)' }}>
                Público: {a.publico_alvo} {a.fim_em && `· até ${new Date(a.fim_em).toLocaleString('pt-BR')}`}
              </div>
              <div className="pl-admin-row-actions">
                <button type="button" className="pl-btn-secondary" onClick={() => alternarPublicacao(a.id, a.publicado)}>
                  {a.publicado ? 'Despublicar' : 'Publicar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
