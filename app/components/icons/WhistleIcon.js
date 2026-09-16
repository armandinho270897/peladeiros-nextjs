// Apito de juiz — bojo redondo (cx=15 cy=12 r=5.2) + bocal em "trilho
// duplo": duas linhas que nascem exatamente sobre a circunferência do
// bojo — em (10.2, 10) e (10.2, 14), os pontos onde as cordas y=10 e
// y=14 tocam o círculo (15 - sqrt(5.2² - 2²) = 10.2) — e seguem pra fora
// em linha reta. v1 (cápsula única) lia como pendrive; v2 (círculo +
// retângulo por cima) e v3 (hexágono único) tinham contornos se cruzando
// ou virando outra coisa (gravata, folha). Como as linhas do trilho
// começam EXATAMENTE em cima do contorno do círculo, nunca entram nele —
// não sobra nenhum traço cruzado, só um bojo com um cano de verdade
// saindo dele.
export default function WhistleIcon({ active = false, className = '', size = 24 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      data-active={active || undefined}
      aria-hidden="true"
    >
      <circle cx="15" cy="12" r="5.2" />
      <line x1="10.2" y1="10" x2="4" y2="10" />
      <line x1="10.2" y1="14" x2="4" y2="14" />
      <path d="M13.5 8v1.6" />
    </svg>
  );
}
