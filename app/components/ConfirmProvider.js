'use client';
import { createContext, useContext, useCallback, useState, useRef, useEffect } from 'react';
import TicketButton from './TicketButton';

const ConfirmContext = createContext(null);

// Substitui window.confirm() nativo (10 lugares no app usavam) por um
// modal no estilo do resto do app, com a mesma cara de ConfirmModal/
// CancelPresencaModal — em vez de reescrever cada callsite, um hook só
// (mesma arquitetura do useToast) devolve uma Promise<boolean>, então a
// troca é literalmente `if (!confirm(msg))` -> `if (!(await confirmar({mensagem: msg})))`.
//
// Fricção proporcional ao risco (NN/g, Material Design): `perigo: true`
// deixa o botão de confirmar vermelho pra ações sérias/sem volta
// (excluir time, cancelar pelada); sem isso, fica no estilo neutro do
// resto do app — Cancelar é sempre a opção "seguro por padrão", nunca o
// botão seguro fica ao lado do perigoso sem diferença visual entre eles.
export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);

  const confirmar = useCallback(({ titulo, mensagem, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', perigo = false }) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({ titulo, mensagem, confirmLabel, cancelLabel, perigo });
    });
  }, []);

  const responder = useCallback((ok) => {
    setDialog(null);
    resolverRef.current?.(ok);
    resolverRef.current = null;
  }, []);

  // Esc cancela — mesmo raciocínio de "a saída fácil é a segura": não
  // exige alcançar o botão, só apertar a tecla que já significa "sai
  // disso" em qualquer outro modal.
  useEffect(() => {
    if (!dialog) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') responder(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dialog, responder]);

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      {dialog && (
        <div className="pl-overlay" onClick={(e) => e.target === e.currentTarget && responder(false)}>
          <div className="pl-modal">
            {dialog.titulo && <h3>{dialog.titulo}</h3>}
            <p>{dialog.mensagem}</p>
            <div className="pl-modal-actions">
              <button type="button" className="pl-btn-secondary" onClick={() => responder(false)} autoFocus>
                {dialog.cancelLabel}
              </button>
              {dialog.perigo ? (
                <button type="button" className="pl-btn-secondary pl-btn-danger" onClick={() => responder(true)}>
                  {dialog.confirmLabel}
                </button>
              ) : (
                <TicketButton compact onClick={() => responder(true)}>{dialog.confirmLabel}</TicketButton>
              )}
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
