import Link from 'next/link';

// Bloco 2 — uma frase só (não lista) sintetizando o evento social mais
// recente da semana. Quando não há nenhum evento na janela (resumoSocial
// null), o bloco inteiro some — sem frase substituta.
function fraseDe({ tipo, quantidade, nome }) {
  if (tipo === 'pedidos') {
    return quantidade === 1
      ? '1 pessoa pediu pra jogar com você essa semana'
      : `${quantidade} pessoas pediram pra jogar com você essa semana`;
  }
  if (tipo === 'time') {
    return quantidade === 1 ? 'Seu time ganhou 1 membro novo' : `Seu time ganhou ${quantidade} membros novos`;
  }
  if (tipo === 'mensagens') {
    return quantidade === 1
      ? `${nome} mandou mensagem no seu jogo`
      : `${nome} e mais ${quantidade - 1} mandaram mensagem nos seus jogos`;
  }
  return null;
}

export default function SocialSummaryCard({ resumoSocial }) {
  if (!resumoSocial) return null;
  const frase = fraseDe(resumoSocial);
  if (!frase) return null;

  return (
    <div className="pl-glass-card pl-social-card pl-reveal pl-reveal-2">
      <p className="pl-social-text">{frase}</p>
      <Link href="/avisos" className="pl-social-link">Ver tudo em Avisos →</Link>
    </div>
  );
}
