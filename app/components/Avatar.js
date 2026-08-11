'use client';
import { initialsOf, colorOf } from '@/lib/avatar';

export default function Avatar({ nome, size = 36, ring = false }) {
  return (
    <div
      className="pl-sticker"
      title={nome}
      style={{
        width: size,
        height: size,
        background: colorOf(nome),
        fontSize: size * 0.4,
        boxShadow: ring ? '0 0 0 2px var(--card-bg), 0 0 0 3px var(--neon)' : 'none',
      }}
    >
      <span className="pl-sticker-shine" />
      {initialsOf(nome)}
    </div>
  );
}
