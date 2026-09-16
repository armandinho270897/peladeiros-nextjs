// Apito de juiz tipo "pealess" (Fox 40, o padrão hoje em campo de
// futebol) — câmara redonda dominante (a parte que ressoa o som), bocal
// em cunha saindo dela pra esquerda (um path ABERTO, sem Z: as duas
// pontas já nascem exatamente sobre a circunferência da câmara — mesmo
// truque da v4/trilho duplo — então nunca cruza o contorno do círculo
// por dentro), tablete do bocal em cima e argola de cordão encostada na
// câmara. Uma v5 com o bocal em zigue-zague (tentando imitar as
// estrias do corpo) e a argola grande demais leu como binóculo — corpo
// simples e argola pequena, só tangenciando a câmara, resolveu.
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
      <circle cx="15.5" cy="13" r="4.3" />
      <path d="M11.87 10.7 4 13 11.87 15.3" />
      <rect x="14" y="6.8" width="3" height="1.7" rx="0.4" />
      <circle cx="19.5" cy="9.8" r="1" />
    </svg>
  );
}
