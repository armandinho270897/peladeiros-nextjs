// Marca d'água da aba ativa na navegação inferior — mesma bola (círculo +
// pentágono + costuras) já usada em CriarButton.js, reaproveitada aqui em
// vez de outro desenho, pra manter as duas a mesma identidade visual.
// Só stroke (sem preenchimento): fica leve o bastante pra não virar um
// fundo pesado atrás do ícone/rótulo — ver .pl-bottom-nav-ball no CSS.
export default function BottomNavBall() {
  return (
    <svg className="pl-bottom-nav-ball" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8.8L15.04 11.01 13.88 14.59 10.12 14.59 8.96 11.01Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M12 8.8V4M15.04 11.01L19.6 9.53M13.88 14.59L16.7 18.47M10.12 14.59L7.3 18.47M8.96 11.01L4.39 9.53" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}
