import { validarImagem } from './validarImagem';

const TAMANHO_MAXIMO_BYTES = 4 * 1024 * 1024;

// O bucket times-escudos é público — só imagem de verdade entra, com a
// extensão vinda do tipo (nunca do nome que o cliente mandou).
export function validarEscudo(arquivo) {
  return validarImagem(arquivo, { label: 'O escudo', maxBytes: TAMANHO_MAXIMO_BYTES });
}
