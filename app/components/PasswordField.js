'use client';
import { useState } from 'react';
import EyeIcon from './EyeIcon';
import EyeOffIcon from './EyeOffIcon';

export default function PasswordField({ label, value, onChange, placeholder = '••••••', required, minLength, autoComplete }) {
  const [show, setShow] = useState(false);

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
