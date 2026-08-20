import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { ADMIN_USER_ID } from '@/lib/adminConfig';
import { NextResponse } from 'next/server';
import { errJson } from '@/lib/apiError';

export async function POST(request, { params }) {
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user || user.id !== ADMIN_USER_ID) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  const { data: arena, error } = await supabase
    .from('arenas')
    .update({ status: 'rejeitada' })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return errJson(error.message, 500);

  return NextResponse.json(arena);
}
