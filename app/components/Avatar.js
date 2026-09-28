'use client';
import { useState, useEffect } from 'react';
import { initialsOf, colorOf } from '@/lib/avatar';

export default function Avatar({ nome, size = 36, ring = false, fotoUrl = null }) {
  const [erro, setErro] = useState(false);
  // Se o mesmo Avatar montado recebe uma foto nova (ex: perfil atualizado
  // sem remount), reseta o erro da foto anterior — senão uma foto válida
  // nova ficaria presa mostrando iniciais por causa de um erro velho.
  useEffect(() => setErro(false), [fotoUrl]);

  const mostraFoto = fotoUrl && !erro;

  return (
    <div
      className="pl-sticker"
      title={nome}
      style={{
        width: size,
        height: size,
        background: mostraFoto ? 'var(--card-bg)' : colorOf(nome),
        fontSize: size * 0.4,
        boxShadow: ring ? '0 0 0 2px var(--card-bg), 0 0 0 3px var(--neon)' : 'none',
      }}
    >
      {mostraFoto ? (
        // Foto quebrada (link morto, storage fora do ar, etc.) cai pras
        // iniciais em vez de mostrar o ícone de imagem quebrada do
        // navegador — reparado aqui porque Avatar é usado em quase toda
        // tela do app (avisos, chat, escalação, perfil...).
        <img src={fotoUrl} alt={nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setErro(true)} />
      ) : (
        <>
          <span className="pl-sticker-shine" />
          {initialsOf(nome)}
        </>
      )}
    </div>
  );
}
