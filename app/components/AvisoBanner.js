'use client';
import { useEffect, useState } from 'react';

// Avisos publicados pela administração (/api/avisos/ativos) — o usuário
// pode dispensar cada um (some da tela até recarregar; não é "marcar como
// lido" persistido, o aviso mesmo tem uma janela de validade própria).
export default function AvisoBanner() {
  const [avisos, setAvisos] = useState([]);
  const [dispensados, setDispensados] = useState([]);

  useEffect(() => {
    fetch('/api/avisos/ativos').then((res) => (res.ok ? res.json() : [])).then((data) => setAvisos(Array.isArray(data) ? data : []));
  }, []);

  const visiveis = avisos.filter((a) => !dispensados.includes(a.id));
  if (visiveis.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 16px 0', maxWidth: 640, margin: '0 auto' }}>
      {visiveis.map((a) => (
        <div key={a.id} className="pl-card" style={{ display: 'flex', flexDirection: 'column', gap: 4, borderLeftColor: 'var(--neon)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontFamily: 'var(--font-display)', color: 'var(--paper)', textTransform: 'uppercase' }}>{a.titulo}</h3>
            <button
              type="button"
              onClick={() => setDispensados((prev) => [...prev, a.id])}
              aria-label="Dispensar aviso"
              style={{ background: 'none', border: 'none', color: 'var(--paper-dim)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}
            >
              ×
            </button>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--paper-dim)' }}>{a.mensagem}</p>
        </div>
      ))}
    </div>
  );
}
