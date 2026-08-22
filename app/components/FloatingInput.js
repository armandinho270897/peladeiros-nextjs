'use client';
import { useState } from 'react';

// Campo com label flutuante (sobe e vira legenda no foco/preenchido) usado
// nas telas de autenticação. Estado em React em vez de :has()/:placeholder-
// shown — mais confiável entre navegadores do que o truque puro em CSS.
export default function FloatingInput({ label, className, onChange, onFocus, onBlur, ...props }) {
  const [focused, setFocused] = useState(false);
  const [filled, setFilled] = useState(!!(props.value ?? props.defaultValue));

  return (
    <div className={`pl-field ${focused ? 'pl-field-focused' : ''} ${filled ? 'pl-field-filled' : ''} ${className || ''}`}>
      <label>{label}</label>
      <input
        {...props}
        onChange={(e) => { setFilled(e.target.value.length > 0); onChange?.(e); }}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      />
    </div>
  );
}
