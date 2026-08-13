'use client';
import { initialsOf, colorOf } from '@/lib/avatar';

export default function Avatar({ nome, size = 36, ring = false, fotoUrl = null }) {
  return (
    <div
      className="pl-sticker"
      title={nome}
      style={{
        width: size,
        height: size,
        background: fotoUrl ? 'var(--card-bg)' : colorOf(nome),
        fontSize: size * 0.4,
        boxShadow: ring ? '0 0 0 2px var(--card-bg), 0 0 0 3px var(--neon)' : 'none',
      }}
    >
      {fotoUrl ? (
        <img src={fotoUrl} alt={nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <>
          <span className="pl-sticker-shine" />
          {initialsOf(nome)}
        </>
      )}
    </div>
  );
}
