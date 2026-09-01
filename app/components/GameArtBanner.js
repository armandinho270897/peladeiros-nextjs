'use client';
import Image from 'next/image';
import { imagemDoTipo, imagemFixaPorId } from '@/lib/tipoJogoImagem';
import { useImagensTelainicial } from '@/lib/useImagensTelainicial';

// Ilustração do tipo de jogo, usada como banner no card da lista (variant
// "card") e como hero no topo da tela de detalhe (variant "hero"). Tipo sem
// imagem mapeada (ex: "Outro", ou pelada sem tipo definido) cai numa arte
// de public/imagens_telainicial/ sorteada uma vez por pelada (fixa pelo
// gameId — mesma pelada sempre mostra a mesma imagem, em qualquer tela),
// nunca uma das 5 artes de modalidade (essas continuam exclusivas de quem
// tem tipo definido). Sem gameId nem lista carregada ainda, cai no fundo
// sólido de sempre em vez de quebrar ou deixar espaço vazio.
const SIZES_PADRAO = { hero: '(max-width: 672px) 100vw, 640px', card: '(max-width: 640px) 100vw, 608px' };

export default function GameArtBanner({ tipo, gameId, variant = 'card', priority = false, sizes }) {
  const imagensTelainicial = useImagensTelainicial();
  const src = imagemDoTipo(tipo) || imagemFixaPorId(gameId, imagensTelainicial);
  const className = `pl-art-banner pl-art-banner-${variant}`;

  if (!src) {
    return <div className={`${className} pl-art-banner-fallback`} aria-hidden="true" />;
  }

  return (
    <div className={className} aria-hidden="true">
      <Image
        src={src}
        alt=""
        fill
        sizes={sizes || SIZES_PADRAO[variant]}
        style={{ objectFit: 'cover' }}
        priority={priority}
      />
      <div className="pl-art-banner-overlay" />
    </div>
  );
}
