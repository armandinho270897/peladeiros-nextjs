'use client';
import { useState } from 'react';
import EyeIcon from './EyeIcon';
import EyeOffIcon from './EyeOffIcon';

export default function PasswordField({ label, value, onChange, placeholder = '••••••', required, minLength, autoComplete, tabIndex }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const filled = (value || '').length > 0;

  return (
    <div className={`pl-field ${focused ? 'pl-field-focused' : ''} ${filled ? 'pl-field-filled' : ''}`}>
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
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
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
