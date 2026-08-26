'use client';
import { useState } from 'react';

// Campo com label flutuante (sobe e vira legenda no foco/preenchido) usado
// nas telas de autenticação. Estilo crítico (borda em degradê, posição do
// label) vai inline, calculado no próprio componente — não depende de
// nenhuma regra de CSS externa reagir a :focus/:has(), que se mostrou frágil
// entre navegadores nos testes desta tela.
export default function FloatingInput({ label, className, style, onChange, onFocus, onBlur, ...props }) {
  const [focused, setFocused] = useState(false);
  const [filled, setFilled] = useState(!!(props.value ?? props.defaultValue));
  const active = focused || filled;

  return (
    <div className={`pl-field ${className || ''}`} style={{ position: 'relative', marginBottom: 16, ...style }}>
      <label
        style={{
          position: 'absolute', left: 14, top: active ? 6 : 15, margin: 0, zIndex: 2,
          fontSize: active ? 10 : 15, textTransform: active ? 'uppercase' : 'none',
          letterSpacing: active ? '0.3px' : 0, color: active ? 'var(--neon)' : 'var(--paper-dim)',
          pointerEvents: 'none',
          transition: 'top 150ms ease, font-size 150ms ease, color 150ms ease, letter-spacing 150ms ease',
        }}
      >
        {label}
      </label>
      <input
        {...props}
        style={{
          width: '100%', padding: '20px 14px 8px', borderRadius: 'var(--radius-sm)',
          fontSize: 15, fontFamily: 'inherit', color: 'var(--paper)', outline: 'none',
          border: focused ? '1.5px solid transparent' : '1.5px solid rgba(255,255,255,0.14)',
          background: focused
            ? 'linear-gradient(rgba(0,0,0,0.35),rgba(0,0,0,0.35)) padding-box, linear-gradient(90deg, var(--neon), var(--lilas)) border-box'
            : 'rgba(0,0,0,0.35)',
          transition: 'border-color 160ms ease, background 160ms ease',
        }}
        onChange={(e) => { setFilled(e.target.value.length > 0); onChange?.(e); }}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      />
    </div>
  );
}
