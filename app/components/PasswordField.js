'use client';
import { useState } from 'react';
import EyeIcon from './EyeIcon';
import EyeOffIcon from './EyeOffIcon';

// `floating`: usado só nas telas de autenticação (login, redefinir senha) —
// label sobe e borda acende em degradê no foco, estilo inline (não depende
// de CSS externo reagindo a :focus/:has(), que se mostrou frágil entre
// navegadores). Fora disso (ex: Configurações) mantém o visual original.
export default function PasswordField({ label, value, onChange, placeholder = '••••••', required, minLength, autoComplete, tabIndex, floating }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);

  if (!floating) {
    return (
      <div className="pl-field">
        {label && <label>{label}</label>}
        <div className="pl-password-wrap">
          <input
            type={show ? 'text' : 'password'}
            required={required}
            minLength={minLength}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            autoComplete={autoComplete}
            tabIndex={tabIndex}
          />
          <button
            type="button"
            className="pl-password-toggle"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {show ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>
    );
  }

  const filled = (value || '').length > 0;
  const active = focused || filled;

  return (
    <div className="pl-field" style={{ position: 'relative', marginBottom: 16 }}>
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
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          required={required}
          minLength={minLength}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          tabIndex={tabIndex}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%', padding: '20px 42px 8px 14px', borderRadius: 'var(--radius-sm)',
            fontSize: 15, fontFamily: 'inherit', color: 'var(--paper)', outline: 'none',
            border: focused ? '1.5px solid transparent' : '1.5px solid rgba(255,255,255,0.14)',
            background: focused
              ? 'linear-gradient(rgba(0,0,0,0.35),rgba(0,0,0,0.35)) padding-box, linear-gradient(90deg, var(--neon), var(--lilas)) border-box'
              : 'rgba(0,0,0,0.35)',
            transition: 'border-color 160ms ease, background 160ms ease',
          }}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          style={{
            position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)',
            background: 'none', border: 'none', padding: 4, margin: 0,
            color: 'var(--paper-dim)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}
