'use client';
import Image from 'next/image';
import { imagemDoTipo } from '@/lib/tipoJogoImagem';

// Ilustração do tipo de jogo, usada como banner no card da lista (variant
// "card") e como hero no topo da tela de detalhe (variant "hero"). Tipo sem
// imagem mapeada (ex: "Outro", ou pelada sem tipo definido) cai num fundo
// sólido em vez de quebrar ou deixar espaço vazio.
const SIZES_PADRAO = { hero: '(max-width: 672px) 100vw, 640px', card: '(max-width: 640px) 100vw, 608px' };

export default function GameArtBanner({ tipo, variant = 'card', priority = false, sizes }) {
  const src = imagemDoTipo(tipo);
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
