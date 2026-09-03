'use client';
import { useState } from 'react';
import { useToast } from './ToastProvider';

// Bloco 1 — o que precisa de você agora, direto no card, sem abrir o
// gerenciador da pelada. Cada card some assim que resolvido (a Home
// recarrega o /api/perfil, que já não traz mais aquele item); o registro
// continua existindo no histórico completo de /avisos normalmente, já que
// aprovar/rejeitar/confirmar dispara as mesmas notificações de sempre.
export default function PendingActionCards({ acaoPendente, onChanged }) {
  const { showToast } = useToast();
  const [atuando, setAtuando] = useState(null);

  if (!acaoPendente) return null;
  const { aprovacoes = [], vagaConfirmar } = acaoPendente;
  if (aprovacoes.length === 0 && !vagaConfirmar) return null;

  // Um POST por vez, não Promise.all — aprovar/rejeitar consulta quantas
  // vagas já estão ocupadas antes de decidir se ainda cabe mais gente
  // (ver app/api/confirmacoes/[id]/aprovar/route.js); disparar vários em
  // paralelo pro mesmo jogo faz todos lerem a mesma contagem desatualizada
  // e todos passarem, estourando vagas_totais. Sequencial garante que cada
  // aprovação enxerga o resultado da anterior.
  async function postAcao(id, url, { successMsg } = {}) {
    const res = await fetch(url, { method: 'POST', body: JSON.stringify({}) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return body?.error || 'Não consegui completar a ação.';
    if (successMsg) showToast(successMsg);
    return null;
  }

  async function responderTodos(confirmacaoIds, acao) {
    setAtuando(confirmacaoIds[0]);
    let erro = null;
    try {
      for (const id of confirmacaoIds) {
        erro = await postAcao(id, `/api/confirmacoes/${id}/${acao}`);
        if (erro) break;
      }
    } finally {
      setAtuando(null);
      // Atualiza mesmo em falha parcial — parte do lote pode ter passado
      // antes do erro, e o card precisa refletir isso (senão um novo clique
      // reprocessaria itens já respondidos e devolveria 409 de novo).
      onChanged();
      if (erro) showToast(erro);
    }
  }

  async function confirmarVaga(confirmacaoId) {
    setAtuando(confirmacaoId);
    try {
      const erro = await postAcao(confirmacaoId, `/api/confirmacoes/${confirmacaoId}/confirmar-vaga`, { successMsg: 'Você entrou no jogo!' });
      if (erro) showToast(erro);
    } finally {
      setAtuando(null);
      onChanged();
    }
  }

  return (
    <div className="pl-pending-block pl-reveal pl-reveal-1">
      {aprovacoes.map((a) => (
        <div key={a.gameId} className="pl-glass-card pl-pending-card">
          <p className="pl-pending-text">
            {a.confirmacaoIds.length === 1 ? '1 pessoa está' : `${a.confirmacaoIds.length} pessoas estão`} esperando sua aprovação em <b>{a.local}</b>
          </p>
          <div className="pl-pending-actions">
            <button
              type="button"
              className="pl-btn-reject"
              disabled={atuando === a.confirmacaoIds[0]}
              onClick={() => responderTodos(a.confirmacaoIds, 'rejeitar')}
            >
              Rejeitar
            </button>
            <button
              type="button"
              className="pl-btn-approve"
              disabled={atuando === a.confirmacaoIds[0]}
              onClick={() => responderTodos(a.confirmacaoIds, 'aprovar')}
            >
              Aprovar
            </button>
          </div>
        </div>
      ))}

      {vagaConfirmar && (
        <div className="pl-glass-card pl-vaga-card">
          <div className="pl-vaga-text">
            <span className="pl-vaga-status">Aprovado — falta você confirmar</span>
            {vagaConfirmar.local} · {vagaConfirmar.bairro}
          </div>
          <button
            type="button"
            className="pl-btn-confirm-vaga"
            disabled={atuando === vagaConfirmar.confirmacaoId}
            onClick={() => confirmarVaga(vagaConfirmar.confirmacaoId)}
          >
            Confirmar minha vaga
          </button>
        </div>
      )}
    </div>
  );
}
