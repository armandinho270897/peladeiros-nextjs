// Gera as telas de abertura (splash screen) do iOS instalado como app.
// O Safari não gera isso sozinho a partir do manifest (diferente do
// Android/Chrome, que já usa background_color + ícone automaticamente) —
// exige um <link apple-touch-startup-image> por combinação de tamanho de
// tela + densidade de pixel. Roda uma vez (`node scripts/gerar-splash-ios.mjs`)
// sempre que assets/marca-fonte.png ou a cor de fundo mudar; os PNGs gerados
// ficam versionados em public/icons/splash, não é build step.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { SPLASH_IOS } from '../lib/splashIos.js';

const FUNDO = '#0A0A0A'; // mesmo background_color do public/manifest.json
// Arte com a marca completa (coroa + P + bola + "PELADEIROS"), retrato
// 1024x1536. Redimensionada com fit:"inside" pra nunca cortar a coroa nem o
// texto, mesmo em telas com proporção bem mais estreita que a da arte.
const MARCA_ORIGEM = 'assets/marca-fonte.png';
const SAIDA_DIR = 'public/icons/splash';
const MARGEM = 0.86; // fração do menor lado disponível pra arte (resto é respiro)

mkdirSync(SAIDA_DIR, { recursive: true });

for (const tela of SPLASH_IOS) {
  const w = tela.cssW * tela.dpr;
  const h = tela.cssH * tela.dpr;

  const marcaBuffer = await sharp(MARCA_ORIGEM)
    .resize(Math.round(w * MARGEM), Math.round(h * MARGEM), { fit: 'inside' })
    .toBuffer();

  await sharp({ create: { width: w, height: h, channels: 3, background: FUNDO } })
    .composite([{ input: marcaBuffer, gravity: 'center' }])
    .png({ compressionLevel: 9, effort: 10 }) // sem isso o PNG sai ~3x maior pro mesmo conteúdo
    .toFile(`${SAIDA_DIR}/splash-${tela.nome}.png`);

  console.log(`splash-${tela.nome}.png (${w}x${h}, ${tela.dpr}x)`);
}
