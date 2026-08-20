import { supabase } from '@/lib/supabase';
import TimeClient from './TimeClient';

async function fetchTime(id) {
  const { data: time } = await supabase.from('times').select('*').eq('id', id).single();
  return time || null;
}

export async function generateMetadata({ params }) {
  const time = await fetchTime(params.id);

  if (!time) {
    return { title: 'Time não encontrado | Peladeiros' };
  }

  const title = `${time.nome} — Peladeiros`;
  const description = [time.bairro, time.modalidade].filter(Boolean).join(' · ') || 'Time de pelada';

  return {
    title,
    description,
    openGraph: { title, description, images: [time.escudo_url || '/icons/icon-512.png'], type: 'website' },
    twitter: { card: 'summary', title, description, images: [time.escudo_url || '/icons/icon-512.png'] },
  };
}

export default function TimePage({ params }) {
  return <TimeClient id={params.id} />;
}
