import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function GET(request) {
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login.' }, { status: 401 });

  const papel = request.nextUrl.searchParams.get('papel');

  let query = supabase
    .from('time_membros')
    .select('papel, times(id, nome, escudo_url, bairro, modalidade)')
    .eq('user_id', user.id)
    .eq('status', 'aprovado');
  if (papel) query = query.eq('papel', papel);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const times = (data || []).map((m) => ({ ...m.times, papel: m.papel }));
  return NextResponse.json(times);
}

export async function POST(request) {
  if (!checkRateLimit(`times:create:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitos times criados em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login pra criar um time.' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('nome').eq('id', user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: 'Complete seu perfil antes de criar um time.' }, { status: 400 });

  const form = await request.formData();
  const nome = form.get('nome')?.toString().trim();
  const bairro = form.get('bairro')?.toString().trim() || null;
  const modalidade = form.get('modalidade')?.toString().trim() || null;
  const escudo = form.get('escudo');

  if (!nome) return NextResponse.json({ error: 'Dá um nome pro time.' }, { status: 400 });

  const { data: time, error } = await supabase
    .from('times')
    .insert({ nome, bairro, modalidade, criado_por: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { error: membroError } = await supabase
    .from('time_membros')
    .insert({ time_id: time.id, user_id: user.id, papel: 'capitao', status: 'aprovado' });

  if (membroError) return NextResponse.json({ error: membroError.message }, { status: 500 });

  if (escudo && typeof escudo === 'object' && escudo.size > 0) {
    const ext = escudo.name?.split('.').pop() || 'jpg';
    const path = `${time.id}/escudo.${ext}`;
    const buffer = Buffer.from(await escudo.arrayBuffer());
    const { error: uploadError } = await supabase.storage.from('times-escudos').upload(path, buffer, {
      upsert: true,
      contentType: escudo.type || 'image/jpeg',
    });
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('times-escudos').getPublicUrl(path);
      const escudoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from('times').update({ escudo_url: escudoUrl }).eq('id', time.id);
      time.escudo_url = escudoUrl;
    }
  }

  return NextResponse.json(time, { status: 201 });
}
