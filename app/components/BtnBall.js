// Bola girando pra estado de carregamento dentro de botões (TicketButton) —
// reaproveita as keyframes do LoadingBall de página cheia, só menor.
export default function BtnBall() {
  return (
    <span className="pl-btn-ball-stage" aria-hidden="true">
      <span className="pl-btn-ball">⚽</span>
      <span className="pl-btn-ball-shadow" />
    </span>
  );
}
