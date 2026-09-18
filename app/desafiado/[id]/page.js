import DesafiadoClient from './DesafiadoClient';

export const metadata = { title: 'Desafiado | Peladeiros' };

export default function DesafiadoPage({ params }) {
  return <DesafiadoClient id={params.id} />;
}
