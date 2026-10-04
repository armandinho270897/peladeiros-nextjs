import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { fmtDate, fmtHora, ocupandoVagaDe } from '@/lib/gameUtils';
import PeladaClient from './PeladaClient';

async function fetchGame(id) {
  // Só usado pra montar título/descrição do generateMetadata (nunca chega
  // ao navegador). Precisa ser supabaseAdmin: quem lê essa metadata é o robô
  // do WhatsApp/Google, sempre anônimo, e anon não tem SELECT em
  // confirmacoes — com o client anônimo a consulta inteira falhava e todo
  // link compartilhado aparecia como "Pelada não encontrada". Colunas
  // explícitas (não '*') pra só sair daqui o que título/descrição mostram.
  const { data: game } = await supabaseAdmin
    .from('games')
    .select('local, bairro, data, horario, vagas_totais, confirmacoes(status)')
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
  // Mesma conta do selo de vaga na página (aprovado + aguardando confirmação)
  const restantes = Math.max(0, game.vagas_totais - ocupandoVagaDe(game).length);
  const title = `${game.local} — Peladeiros`;
  const description = `${d.dow} ${d.dom} às ${fmtHora(game.horario)} · ${game.bairro} · ${restantes} vaga(s) livre(s) de ${game.vagas_totais}`;

  return {
    title,
    description,
    // Sem `images` de propósito: a imagem vem de opengraph-image.js (cartaz
    // da pelada) — declarar aqui sobrescreveria com o ícone genérico.
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default function PeladaPage({ params }) {
  return <PeladaClient id={params.id} />;
}
