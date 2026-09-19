const TIPOS_ACEITOS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
const TAMANHO_MAXIMO_BYTES = 4 * 1024 * 1024;

// O bucket times-escudos é público — só imagem de verdade entra, com a
// extensão vinda do tipo (nunca do nome que o cliente mandou).
export function validarEscudo(arquivo) {
  const ext = TIPOS_ACEITOS[arquivo?.type];
  if (!ext) return { ok: false, error: 'O escudo precisa ser uma imagem JPG, PNG, WebP ou GIF.' };
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) return { ok: false, error: 'O escudo pode ter no máximo 4 MB.' };
  return { ok: true, ext, contentType: arquivo.type };
}
