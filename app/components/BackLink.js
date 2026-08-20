import Link from 'next/link';
import BackArrowIcon from './BackArrowIcon';

// Voltar padronizado — mesma borda em degradê + levitação dos outros
// botões secundários (.pl-btn-secondary etc), em vez do link cru que cada
// tela reimplementava com estilo inline próprio.
export default function BackLink({ href, children = 'Voltar' }) {
  return (
    <Link href={href} className="pl-back-link">
      <BackArrowIcon />
      {children}
    </Link>
  );
}
