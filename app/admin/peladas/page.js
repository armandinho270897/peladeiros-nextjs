'use client';
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '../../components/ToastProvider';
import { fmtDate } from '@/lib/gameUtils';
import EmptyFieldIcon from '../../components/EmptyFieldIcon';
import MotivoModal from '../MotivoModal';

export default function AdminPeladasPage() {
  const { showToast } = useToast();
  const [data, setData] = useState('');
  const [bairro, setBairro] = useState('');
  const [peladas, setPeladas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (data) params.set('data', data);
    if (bairro) params.set('bairro', bairro);
    const res = await fetch(`/api/admin/peladas?${params.toString()}`);
    const json = await res.json();
    setPeladas(Array.isArray(json) ? json : []);
    setLoading(false);
  }, [data, bairro]);

  useEffect(() => { carregar(); }, [carregar]);

  async function pausar(id, motivo) {
    const res = await fetch(`/api/admin/peladas/${id}/pausar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ motivo }) });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    setPeladas((prev) => prev.map((g) => (g.id === id ? { ...g, pausada_em: result.pausada ? new Date().toISOString() : null } : g)));
    setModal(null);
    showToast(result.pausada ? 'Pelada pausada.' : 'Pelada reativada.');
  }

  async function cancelar(id, motivo) {
    const res = await fetch(`/api/admin/peladas/${id}/cancelar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ motivo }) });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    setPeladas((prev) => prev.filter((g) => g.id !== id));
    setModal(null);
    showToast('Pelada cancelada.');
  }

  return (
    <div>
      <div className="pl-admin-toolbar">
        <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        <input placeholder="Bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
        <button type="button" className="pl-btn-secondary" onClick={carregar}>Filtrar</button>
      </div>

      {loading ? (
        <div className="pl-admin-cards">{[1, 2, 3].map((i) => <div key={i} className="pl-skeleton" style={{ height: 110 }} />)}</div>
      ) : peladas.length === 0 ? (
        <div className="pl-empty"><EmptyFieldIcon /><p>Nenhuma pelada encontrada.</p></div>
      ) : (
        <div className="pl-admin-cards">
          {peladas.map((g) => {
            const d = fmtDate(g.data);
            return (
              <div key={g.id} className="pl-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <h3 style={{ margin: '0 0 2px', fontFamily: 'var(--font-display)', color: 'var(--paper)' }}>{g.local}</h3>
                    <div style={{ fontSize: 12, color: 'var(--paper-dim)' }}>{d.dow} {d.dom} · {g.horario?.slice(0, 5)} · {g.bairro}</div>
                    <div style={{ fontSize: 12, color: 'var(--paper-dim)' }}>Capitão: {g.capitao} · {g.confirmados}/{g.vagas_totais} confirmados</div>
                  </div>
                  {g.pausada_em && <span className="pl-admin-badge negativo">pausada</span>}
                  {g.encerrada_em && !g.pausada_em && <span className="pl-admin-badge">encerrada</span>}
                </div>
                {g.pausada_motivo && <p style={{ fontSize: 12, color: 'var(--paper-dim)' }}>Motivo da pausa: {g.pausada_motivo}</p>}
                <div className="pl-admin-row-actions">
                  <button type="button" className="pl-btn-secondary" onClick={() => setModal({ id: g.id, acao: 'pausar' })}>
                    {g.pausada_em ? 'Reativar' : 'Pausar'}
                  </button>
                  <button type="button" className="pl-btn-secondary pl-btn-danger" onClick={() => setModal({ id: g.id, acao: 'cancelar' })}>Cancelar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <MotivoModal
          titulo={modal.acao === 'cancelar' ? 'Cancelar pelada' : 'Pausar/reativar pelada'}
          descricao="Situação excepcional — organizador e participantes confirmados são avisados."
          labelBotao={modal.acao === 'cancelar' ? 'Cancelar pelada' : 'Confirmar'}
          onCancel={() => setModal(null)}
          onConfirm={(motivo) => (modal.acao === 'cancelar' ? cancelar(modal.id, motivo) : pausar(modal.id, motivo))}
        />
      )}
    </div>
  );
}
