import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { fmtDate, fmtHora, ocupandoVagaDe, statusVagas } from '@/lib/gameUtils';

// Imagem da prévia do link (WhatsApp, Telegram, redes) — o cartaz da pelada
// em 1200x630, mesmo desenho do hero da página (PeladaHero.js). Só
// tipografia e gradiente, sem foto de propósito: o satori só gera PNG, e uma
// foto de ~1 MB passaria fácil de 1 MB — o WhatsApp costuma ignorar imagem
// de prévia acima de uns 600 KB e mostra o link sem foto nenhuma.
export const alt = 'Cartaz da pelada no Peladeiros';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 300;

const NEON = '#A6FF00';
const LILAS = '#B87FE8';
const GOLD = '#FFC53D';
const INK = '#161412';
const PAPER = '#F3F3EE';
const PAPER_DIM = '#B7B7AC';

// Lê do disco (assets/fonts, cópias das fontes OFL Anton e Permanent Marker)
// em vez de fetch(new URL(..., import.meta.url)): no runtime Node o webpack
// transforma isso numa URL relativa que o fetch não aceita. Caminho literal
// com process.cwd() é o que o Next rastreia pra incluir o arquivo no deploy.
async function fontes() {
  const [anton, marker] = await Promise.all([
    readFile(join(process.cwd(), 'assets/fonts/anton-latin-400-normal.woff')),
    readFile(join(process.cwd(), 'assets/fonts/permanent-marker-latin-400-normal.woff')),
  ]);
  return [
    { name: 'Anton', data: anton, weight: 400, style: 'normal' },
    { name: 'Marker', data: marker, weight: 400, style: 'normal' },
  ];
}

const fundo = {
  display: 'flex',
  width: '100%',
  height: '100%',
  position: 'relative',
  backgroundColor: INK,
  backgroundImage: `radial-gradient(circle at 12% 8%, rgba(166,255,0,0.22), rgba(166,255,0,0) 45%), radial-gradient(circle at 92% 92%, rgba(184,127,232,0.22), rgba(184,127,232,0) 50%)`,
};

const faixa = {
  position: 'absolute', left: 0, right: 0, bottom: 0, height: 12,
  backgroundImage: `linear-gradient(90deg, ${NEON}, ${LILAS})`,
};

function Marca() {
  return (
    <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 44, textTransform: 'uppercase', color: PAPER }}>
      PELADEI<span style={{ color: NEON }}>ROS</span>
    </div>
  );
}

function tamanhoDoTitulo(texto) {
  if (texto.length <= 14) return 150;
  if (texto.length <= 24) return 116;
  if (texto.length <= 40) return 92;
  return 72;
}

export default async function Image({ params }) {
  const fonts = await fontes();

  const { data: game } = await supabaseAdmin
    .from('games')
    .select('local, bairro, data, horario, tipo, vagas_totais, confirmacoes(status)')
    .eq('id', params.id)
    .single();

  if (!game) {
    return new ImageResponse(
      (
        <div style={{ ...fundo, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Marca />
          <div style={{ display: 'flex', marginTop: 18, fontFamily: 'Marker', fontSize: 40, color: LILAS }}>Vem pro fut, vem.</div>
          <div style={faixa} />
        </div>
      ),
      { ...size, fonts },
    );
  }

  const d = fmtDate(game.data);
  const restantes = Math.max(0, game.vagas_totais - ocupandoVagaDe(game).length);
  const status = statusVagas(restantes, restantes === 0);
  const local = game.local.length > 64 ? `${game.local.slice(0, 63)}…` : game.local;
  const detalhes = [game.bairro, game.tipo].filter(Boolean).join(' · ');

  return new ImageResponse(
    (
      <div style={{ ...fundo, flexDirection: 'column', justifyContent: 'space-between', padding: '56px 64px 64px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              backgroundColor: NEON, color: INK, padding: '14px 34px 18px', borderRadius: 8,
              transform: 'rotate(-4deg)', fontFamily: 'Marker', boxShadow: '0 10px 28px rgba(0,0,0,0.55)',
            }}
          >
            <div style={{ display: 'flex', fontSize: 64, lineHeight: 1 }}>{d.dow}</div>
            <div style={{ display: 'flex', fontSize: 44, lineHeight: 1.1 }}>{d.dom}</div>
          </div>

          <div
            style={{
              display: 'flex', fontFamily: 'Anton', fontSize: 34, textTransform: 'uppercase', letterSpacing: 1,
              padding: '10px 26px', borderRadius: 999, backgroundColor: 'rgba(22,20,18,0.78)',
              border: `3px solid ${status.className === 'ultimas' ? GOLD : 'rgba(255,255,255,0.22)'}`,
              color: status.className === 'ultimas' ? GOLD : PAPER_DIM,
            }}
          >
            {status.label}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex', fontFamily: 'Anton', textTransform: 'uppercase', color: PAPER,
              fontSize: tamanhoDoTitulo(local), lineHeight: 0.98, maxWidth: 1072,
            }}
          >
            {local}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 22 }}>
            <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 40, textTransform: 'uppercase', letterSpacing: 2, color: PAPER_DIM }}>
              <span style={{ color: NEON }}>{fmtHora(game.horario)}</span>
              {detalhes ? <span style={{ marginLeft: 16 }}>{`· ${detalhes}`}</span> : null}
            </div>
            <Marca />
          </div>
        </div>

        <div style={faixa} />
      </div>
    ),
    { ...size, fonts },
  );
}
