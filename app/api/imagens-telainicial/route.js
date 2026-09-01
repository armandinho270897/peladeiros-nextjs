import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import path from 'path';

const EXTENSOES_VALIDAS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

// Lê o conteúdo real de public/imagens_telainicial/ em vez de manter uma
// lista fixa no código — usada tanto pelo fundo rotativo da Home quanto
// pelo fallback de pelada sem modalidade (GameArtBanner). Só muda quando
// alguém adiciona/remove arquivo na pasta e um novo deploy roda (arquivos
// em public/ são parte do build), então não precisa de force-dynamic
// nem fetchCache: ao contrário das rotas que leem o banco, a resposta
// aqui é legitimamente a mesma até o próximo deploy.
export async function GET() {
  const dir = path.join(process.cwd(), 'public', 'imagens_telainicial');
  let arquivos = [];
  try {
    arquivos = await readdir(dir);
  } catch {
    // pasta ainda não existe/vazia — devolve lista vazia, quem consome já trata
    return NextResponse.json([]);
  }
  const imagens = arquivos
    .filter((nome) => EXTENSOES_VALIDAS.has(path.extname(nome).toLowerCase()))
    .sort()
    .map((nome) => `/imagens_telainicial/${nome}`);
  return NextResponse.json(imagens);
}
