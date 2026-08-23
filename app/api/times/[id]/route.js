import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { authorizeTimeCaptain } from '@/lib/timeAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { createNotification } from '@/lib/notify';
import { errJson } from '@/lib/apiError';

export async function GET(request, { params }) {
  const { id } = params;

  const { data: time, error } = await supabase.from('times').select('*').eq('id', id).single();
  if (error || !time) return NextResponse.json({ error: 'Time não encontrado.' }, { status: 404 });

  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();

  const { data: membrosRows } = await supabase
    .from('time_membros')
    .select('id, papel, status, user_id')
    .eq('time_id', id)
    .eq('status', 'aprovado');

  const souCapitao = !!user && (membrosRows || []).some((m) => m.papel === 'capitao' && m.user_id === user.id);

  let pendentesRows = [];
  if (souCapitao) {
    const { data } = await supabase.from('time_membros').select('id, user_id').eq('time_id', id).eq('status', 'pendente');
    pendentesRows = data || [];
  }

  // profiles não tem FK direta com time_membros (ambos só referenciam
  // auth.users) — PostgREST não consegue embedar automaticamente, então
  // busca à parte e junta em JS, mesmo padrão usado em toda rota que
  // cruza confirmacoes/time_membros com profiles.
  const idsRelevantes = [...new Set([...(membrosRows || []).map((m) => m.user_id), ...pendentesRows.map((p) => p.user_id)])];
  const { data: perfis } = idsRelevantes.length > 0
    ? await supabase.from('profiles').select('id, nome, foto_url, modalidade_principal, posicoes').in('id', idsRelevantes)
    : { data: [] };
  const perfilPorId = Object.fromEntries((perfis || []).map((p) => [p.id, p]));

  const membros = (membrosRows || []).map((m) => ({ ...m, profiles: perfilPorId[m.user_id] || null }));
  const pendentes = pendentesRows.map((p) => ({ ...p, profiles: perfilPorId[p.user_id] || null }));
  const capitao = membros.find((m) => m.papel === 'capitao')?.profiles || null;

  return NextResponse.json({
    time,
    capitao,
    membros,
    pendentes,
    souCapitao,
  });
}

export async function PATCH(request, { params }) {
  if (!checkRateLimit(`times:editar:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;

  const auth = await authorizeTimeCaptain(id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const form = await request.formData();
  const nome = form.get('nome')?.toString().trim();
  const bairro = form.get('bairro')?.toString().trim() || null;
  const modalidade = form.get('modalidade')?.toString().trim() || null;
  const escudo = form.get('escudo');

  if (!nome) return NextResponse.json({ error: 'Dá um nome pro time.' }, { status: 400 });

  const updates = { nome, bairro, modalidade };

  if (escudo && typeof escudo === 'object' && escudo.size > 0) {
    const ext = escudo.name?.split('.').pop() || 'jpg';
    const path = `${id}/escudo.${ext}`;
    const buffer = Buffer.from(await escudo.arrayBuffer());
    const { error: uploadError } = await supabase.storage.from('times-escudos').upload(path, buffer, {
      upsert: true,
      contentType: escudo.type || 'image/jpeg',
    });
    if (uploadError) {
      Sentry.captureException(new Error(uploadError.message));
    } else {
      const { data: urlData } = supabase.storage.from('times-escudos').getPublicUrl(path);
      updates.escudo_url = `${urlData.publicUrl}?t=${Date.now()}`;
    }
  }

  const { data: time, error } = await supabase.from('times').update(updates).eq('id', id).select().single();
  if (error) return errJson(error.message, 500);

  return NextResponse.json(time);
}

export async function DELETE(request, { params }) {
  if (!checkRateLimit(`times:excluir:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'Muitas ações em pouco tempo. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  const { id } = params;

  const auth = await authorizeTimeCaptain(id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: time } = await supabase.from('times').select('nome').eq('id', id).single();
  if (!time) return NextResponse.json({ error: 'Time não encontrado.' }, { status: 404 });

  const { data: outrosMembros } = await supabase
    .from('time_membros')
    .select('user_id')
    .eq('time_id', id)
    .eq('status', 'aprovado')
    .neq('user_id', auth.user.id);

  const { error } = await supabase.from('times').delete().eq('id', id);
  if (error) return errJson(error.message, 500);

  for (const m of outrosMembros || []) {
    await createNotification({
      userId: m.user_id,
      tipo: 'time_excluido',
      mensagem: `O time ${time.nome} foi excluído pelo capitão.`,
      atorUserId: auth.user.id,
    });
  }

  return NextResponse.json({ ok: true });
}
