import { supabase } from '@/lib/supabase';
import { fmtDate, confirmadosDe } from '@/lib/gameUtils';
import PeladaClient from './PeladaClient';

async function fetchGame(id) {
  const { data: game } = await supabase
    .from('games')
    .select('*, confirmacoes(*)')
    .eq('id', id)
    .single();
  return game || null;
}

export async function generateMetadata({ params }) {
  const game = await fetchGame(params.id);

  if (!game) {
    return { title: 'Pelada não encontrada | Peladeiros' };
  }

  const d = fmtDate(game.data);
  const confirmados = confirmadosDe(game).length;
  const restantes = Math.max(0, game.vagas_totais - confirmados);
  const title = `${game.local} — Peladeiros`;
  const description = `${d.dow} ${d.dom} às ${game.horario} · ${game.bairro} · ${restantes} vaga(s) livre(s) de ${game.vagas_totais}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ['/icons/icon-512.png'],
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: ['/icons/icon-512.png'],
    },
  };
}

export default function PeladaPage({ params }) {
  return <PeladaClient id={params.id} />;
}
