// Gera as telas de abertura (splash screen) do iOS instalado como app.
// O Safari não gera isso sozinho a partir do manifest (diferente do
// Android/Chrome, que já usa background_color + ícone automaticamente) —
// exige um <link apple-touch-startup-image> por combinação de tamanho de
// tela + densidade de pixel. Roda uma vez (`node scripts/gerar-splash-ios.mjs`)
// sempre que o ícone ou a cor de fundo mudar; os PNGs gerados ficam versionados
// em public/icons/splash, não é build step.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { SPLASH_IOS } from '../lib/splashIos.js';

const FUNDO = '#0A0A0A'; // mesmo background_color do public/manifest.json
const ICONE_ORIGEM = 'public/icons/icon-512.png';
const SAIDA_DIR = 'public/icons/splash';

mkdirSync(SAIDA_DIR, { recursive: true });

for (const tela of SPLASH_IOS) {
  const w = tela.cssW * tela.dpr;
  const h = tela.cssH * tela.dpr;
  const icone = Math.round(Math.min(w, h) * 0.36);

  const iconeBuffer = await sharp(ICONE_ORIGEM).resize(icone, icone).toBuffer();

  await sharp({ create: { width: w, height: h, channels: 3, background: FUNDO } })
    .composite([{ input: iconeBuffer, gravity: 'center' }])
    .png()
    .toFile(`${SAIDA_DIR}/splash-${tela.nome}.png`);

  console.log(`splash-${tela.nome}.png (${w}x${h}, ${tela.dpr}x)`);
}
