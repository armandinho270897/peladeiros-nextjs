'use client';
import { useEffect, useState, useCallback } from 'react';
import BackLink from '../components/BackLink';
import Brand from '../components/Brand';
import EmptyFieldIcon from '../components/EmptyFieldIcon';
import MinhaPeladaCard from '../components/MinhaPeladaCard';
import CancelPresencaModal from '../components/CancelPresencaModal';
import { useToast } from '../components/ToastProvider';

const SECOES = [
  { chave: 'confirmadas', titulo: 'Confirmadas' },
  { chave: 'aguardandoConfirmacao', titulo: 'Aguardando confirmação' },
  { chave: 'espera', titulo: 'Lista de espera' },
  { chave: 'pendentes', titulo: 'Solicitações enviadas' },
];

export default function MinhasPeladasPage() {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelando, setCancelando] = useState(null);
  const { showToast } = useToast();

  const carregar = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const res = await fetch('/api/minhas-peladas');
    if (res.ok) setDados(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function handleConfirmar(confirmacaoId) {
    const res = await fetch(`/api/confirmacoes/${confirmacaoId}/confirmar-vaga`, { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { showToast(json.error || 'Não consegui confirmar sua vaga.'); return; }
    showToast('Vaga confirmada!');
    carregar(true);
  }

  const totalItens = dados ? SECOES.reduce((soma, s) => soma + dados[s.chave].length, 0) : 0;

  return (
    <div>
      <div className="pl-header">
        <BackLink href="/perfil">Perfil</BackLink>
        <Brand style={{ marginTop: 10 }} />
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px' }}>
        <h2 style={{ margin: '4px 0 2px' }}>Minhas peladas</h2>
        <p className="meta">Suas próximas partidas, num lugar só.</p>
      </div>

      {loading ? (
        <div className="pl-list" style={{ paddingTop: 14 }}>
          {[1, 2, 3].map((i) => <div key={i} className="pl-skeleton" style={{ height: 96 }} />)}
        </div>
      ) : totalItens === 0 ? (
        <div className="pl-empty">
          <EmptyFieldIcon />
          <p>Você ainda não tem nenhuma pelada nos próximos dias. Vai em "Peladas" e confirma presença numa pra ela aparecer aqui.</p>
        </div>
      ) : (
        SECOES.map((secao) => {
          const itens = dados[secao.chave];
          if (itens.length === 0) return null;
          return (
            <div key={secao.chave}>
              <div className="pl-section-title" style={{ maxWidth: 640, margin: '18px auto 8px', padding: '0 16px', fontSize: 11, textTransform: 'uppercase', color: 'var(--paper-dim)' }}>
                {secao.titulo}
              </div>
              <div className="pl-list" style={{ paddingBottom: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {itens.map((item, i) => (
                  <MinhaPeladaCard
                    key={item.minhaConfirmacaoId}
                    item={item}
                    index={i}
                    onConfirmar={handleConfirmar}
                    onCancelar={(confirmacaoId, g) => setCancelando({ confirmacaoId, game: g })}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}

      {cancelando && (
        <CancelPresencaModal
          confirmacaoId={cancelando.confirmacaoId}
          game={cancelando.game}
          onClose={() => setCancelando(null)}
          onCancelled={() => { setCancelando(null); showToast('Presença cancelada.'); carregar(true); }}
        />
      )}
    </div>
  );
}
