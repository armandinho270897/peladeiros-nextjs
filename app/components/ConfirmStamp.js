'use client';
import { useEffect, useRef } from 'react';

// Carimbo animado — bate na tela quando a pessoa confirma vaga ou faz
// check-in. Mesma moldura dupla do .pl-stamp estático de "Lotado"
// (base.css), só que maior, neon (cor de confirmação, não o vermelho de
// aviso) e com entrada/saída animadas em vez de ficar parado num canto.
// Se desmonta sozinho (onDone) — nada de setTimeout solto no componente pai
// pra lembrar de limpar se a pessoa navegar pra outro lugar no meio.
//
// onDone guardado em ref e o efeito roda só uma vez (deps vazias de
// propósito): a chamada que dispara o carimbo (handleConfirmarVaga/
// handleCheckin) também chama loadGame() logo antes, que re-renderiza o
// pai enquanto o carimbo ainda tá na tela — um `onDone` inline novo a cada
// render reiniciaria o timeout do zero nesse meio tempo se ele fosse
// dependência do efeito, atrasando o sumiço do carimbo sem motivo.
export default function ConfirmStamp({ texto, onDone }) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), 1400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pl-confirm-stamp-overlay" aria-hidden="true">
      <div className="pl-confirm-stamp">{texto}</div>
    </div>
  );
}
