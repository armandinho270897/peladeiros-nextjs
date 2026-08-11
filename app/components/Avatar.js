'use client';
import { initialsOf, colorOf } from '@/lib/avatar';

export default function Avatar({ nome, size = 36, ring = false }) {
  return (
    <div
      title={nome}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: colorOf(nome),
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-display)',
        fontSize: size * 0.4,
        flexShrink: 0,
        boxShadow: ring ? '0 0 0 2px var(--card-bg), 0 0 0 3px var(--neon)' : 'none',
        userSelect: 'none',
      }}
    >
      {initialsOf(nome)}
    </div>
  );
}
