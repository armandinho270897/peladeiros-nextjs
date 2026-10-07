import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { limparEvento } from '@/lib/eventos';

// Medição do funil. Chamada por navigator.sendBeacon (lib/track.js), então
// ninguém espera a resposta: qualquer falha aqui é silenciosa de propósito —
// medir nunca pode atrapalhar o uso. Sem login também (o topo do funil é
// quem abre o link sem conta); user_id só entra se já houver sessão.
const SEM_CONTEUDO = () => new NextResponse(null, { status: 204 });

export async function POST(request) {
  if (!(await checkRateLimit(`evento:${getClientIp(request)}`, 120, 5 * 60 * 1000))) {
    return new NextResponse(null, { status: 429 });
  }

  const evento = limparEvento(await request.json().catch(() => null));
  if (!evento) return SEM_CONTEUDO();

  let userId = null;
  try {
    const { data: { user } } = await createServerClient().auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // sem sessão legível — segue como anônimo
  }

  try {
    await supabase.from('eventos').insert({ ...evento, user_id: userId });
  } catch {
    // idem: perder um evento é aceitável, quebrar a chamada não
  }
  return SEM_CONTEUDO();
}
