const TIPOS_ACEITOS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

// Mesma validação usada nos 3 uploads de imagem do app (escudo de time,
// avatar, foto de arena) — os buckets do Storage têm o mesmo teto de tipo e
// tamanho (migration 059, 5MB) — cada tela pode pedir um teto mais apertado.
// Roda ANTES do upload só pra dar um erro claro na hora — quem garante de
// verdade é o bucket (o cliente pode mentir o `type`).
export function validarImagem(arquivo, { label = 'A imagem', maxBytes = 5 * 1024 * 1024 } = {}) {
  const ext = TIPOS_ACEITOS[arquivo?.type];
  if (!ext) return { ok: false, error: `${label} precisa ser uma imagem JPG, PNG, WebP ou GIF.` };
  if (arquivo.size > maxBytes) return { ok: false, error: `${label} pode ter no máximo ${Math.round(maxBytes / (1024 * 1024))} MB.` };
  return { ok: true, ext, contentType: arquivo.type };
}
