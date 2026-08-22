// Cenário das telas de autenticação: quadra à noite vista de quem acabou de
// chegar, olhando pro meio de campo. Puro CSS/SVG (sem lib, sem imagem
// pesada) — textura de grama, linhas de giz em perspectiva e refletores
// pulsando bem devagar. Decorativo, então aria-hidden.
export default function NightPitchBackground() {
  return (
    <div className="pl-night-pitch" aria-hidden="true">
      <div className="pl-night-grass" />
      <div className="pl-night-floodlight pl-night-floodlight-l" />
      <div className="pl-night-floodlight pl-night-floodlight-r" />
      <svg
        className="pl-night-lines"
        viewBox="0 0 400 700"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
      >
        <path d="M40,700 L170,80" stroke="rgba(243,243,238,0.22)" strokeWidth="2" />
        <path d="M360,700 L230,80" stroke="rgba(243,243,238,0.22)" strokeWidth="2" />
        <path d="M103,400 L297,400" stroke="rgba(243,243,238,0.16)" strokeWidth="1.5" />
        <ellipse cx="200" cy="400" rx="46" ry="13" stroke="rgba(243,243,238,0.16)" strokeWidth="1.5" />
        <path d="M61,600 L339,600" stroke="rgba(243,243,238,0.22)" strokeWidth="1.8" />
        <path d="M61,600 L40,700" stroke="rgba(243,243,238,0.22)" strokeWidth="1.8" />
        <path d="M339,600 L360,700" stroke="rgba(243,243,238,0.22)" strokeWidth="1.8" />
        <rect x="163" y="668" width="74" height="30" stroke="rgba(166,255,0,0.3)" strokeWidth="2" />
      </svg>
    </div>
  );
}
