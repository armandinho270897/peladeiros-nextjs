import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

// Login via API HTTP do Resend em vez do e-mail nativo do Supabase — o
// plano gratuito do Supabase trava em 2 e-mails/hora, o que impedia gente
// nova de entrar em picos de uso. Gera o link mágico com o service role
// (mesmo signInWithOtp por baixo, só que a gente controla o envio) e manda
// o e-mail direto pela API do Resend (fetch, sem SMTP e sem SDK novo).
export async function POST(request) {
  const ip = getClientIp(request);
  const { email, next } = await request.json().catch(() => ({}));

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Digita um e-mail válido.' }, { status: 400 });
  }
  const emailNormalizado = email.trim().toLowerCase();

  // Limita por e-mail (não manda vários links pro mesmo destinatário) e por
  // IP (não deixa varrer e-mails alheios).
  if (!checkRateLimit(`magic-link:email:${emailNormalizado}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Muitos pedidos de login pra esse e-mail. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }
  if (!checkRateLimit(`magic-link:ip:${ip}`, 20, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Muitos pedidos de login vindos daqui. Espera uns minutos e tenta de novo.' }, { status: 429 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Login por e-mail não está configurado no servidor (falta RESEND_API_KEY).' }, { status: 500 });
  }

  const origin = request.headers.get('origin') || new URL(request.url).origin;
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next || '/')}`;

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: emailNormalizado,
    options: { redirectTo },
  });

  if (error) {
    return NextResponse.json({ error: error.message || 'Não consegui gerar o link de login.' }, { status: 500 });
  }

  const actionLink = data?.properties?.action_link;
  if (!actionLink) {
    return NextResponse.json({ error: 'O link de login não foi gerado. Tenta de novo.' }, { status: 500 });
  }

  const from = process.env.RESEND_FROM_EMAIL || 'Peladeiros <onboarding@resend.dev>';

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: emailNormalizado,
      subject: 'Seu link pra entrar no Peladeiros',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 420px; margin: 0 auto; color: #0A0A0A;">
          <h2 style="margin-bottom: 4px;">PELADEIROS</h2>
          <p style="color: #6E7178; margin-top: 0;">Vem pro fut, vem.</p>
          <p>Clica no botão abaixo pra entrar:</p>
          <p style="margin: 24px 0;">
            <a href="${actionLink}" style="background:#A6FF00; color:#0A0A0A; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: bold; display: inline-block;">
              Entrar no Peladeiros
            </a>
          </p>
          <p style="color: #6E7178; font-size: 13px;">Se você não pediu esse link, pode ignorar esse e-mail.</p>
        </div>
      `,
    }),
  });

  if (!resendRes.ok) {
    const body = await resendRes.json().catch(() => ({}));
    return NextResponse.json({ error: body.message || 'Não consegui enviar o e-mail. Tenta de novo em alguns minutos.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
