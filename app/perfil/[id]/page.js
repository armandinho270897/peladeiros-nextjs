import { supabase } from '@/lib/supabase';
import PerfilPublicoClient from './PerfilPublicoClient';

async function fetchProfile(id) {
  const { data: profile } = await supabase.from('profiles').select('nome, foto_url').eq('id', id).maybeSingle();
  return profile || null;
}

export async function generateMetadata({ params }) {
  const profile = await fetchProfile(params.id);

  if (!profile) {
    return { title: 'Jogador não encontrado | Peladeiros' };
  }

  const title = `${profile.nome} — Peladeiros`;
  const description = 'Perfil de jogador no Peladeiros.';

  return {
    title,
    description,
    openGraph: { title, description, images: [profile.foto_url || '/icons/icon-512.png'], type: 'website' },
    twitter: { card: 'summary', title, description, images: [profile.foto_url || '/icons/icon-512.png'] },
  };
}

export default function PerfilPublicoPage({ params }) {
  return <PerfilPublicoClient id={params.id} />;
}
