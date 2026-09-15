'use client';
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '../../components/ToastProvider';

const LABEL = { tolerancia_checkin_min: 'Tolerância de check-in (minutos)', limite_cancelamento_horas: 'Limite de cancelamento (horas)' };

const MOTIVOS_DENUNCIA = [
  'Comportamento abusivo', 'No-show recorrente', 'Informação falsa', 'Conteúdo inadequado', 'Problema de segurança', 'Outro',
];

export default function AdminConfiguracoesPage() {
  const { showToast } = useToast();
  const [config, setConfig] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState({});
  const [salvando, setSalvando] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/config');
    const data = await res.json();
    setConfig(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function salvar(chave) {
    const valor = editando[chave];
    if (valor === undefined) return;
    setSalvando(chave);
    const res = await fetch('/api/admin/config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave, valor: Number(valor) }) });
    const result = await res.json();
    setSalvando(null);
    if (!res.ok) { showToast(result.error || 'Não consegui salvar.'); return; }
    setConfig((prev) => prev.map((c) => (c.chave === chave ? result : c)));
    setEditando((prev) => { const cp = { ...prev }; delete cp[chave]; return cp; });
    showToast('Configuração salva.');
  }

  return (
    <div>
      <div className="pl-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--paper)' }}>Valores operacionais</h3>
        <p style={{ fontSize: 12, color: 'var(--paper-dim)', margin: 0 }}>
          Registro do valor atual — a checagem de check-in/cancelamento no app segue esse número, mas hoje ainda lê a constante fixa no código (mudar aqui não muda o comportamento em tempo real nesta primeira versão).
        </p>
        {loading ? (
          <div className="pl-skeleton" style={{ height: 80 }} />
        ) : (
          config.map((c) => (
            <div key={c.chave} className="pl-field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ flex: 1 }}>{LABEL[c.chave] || c.chave}</label>
              <input
                type="number"
                style={{ width: 80 }}
                value={editando[c.chave] ?? c.valor}
                onChange={(e) => setEditando((prev) => ({ ...prev, [c.chave]: e.target.value }))}
              />
              <button type="button" className="pl-btn-secondary" disabled={salvando === c.chave} onClick={() => salvar(c.chave)}>
                {salvando === c.chave ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          ))
        )}
      </div>

      <div className="pl-card" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--paper)' }}>Categorias de denúncia</h3>
        <p style={{ fontSize: 12, color: 'var(--paper-dim)', margin: 0 }}>Fixas nesta versão (não editáveis por aqui):</p>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--paper)' }}>
          {MOTIVOS_DENUNCIA.map((m) => <li key={m}>{m}</li>)}
        </ul>
      </div>
    </div>
  );
}
