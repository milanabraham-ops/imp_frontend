import { useState } from 'react'

export default function PasswordField({ value, onChange, placeholder = '••••••••', minLength, autoFocus }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="auth-password-wrap">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        required
        minLength={minLength}
        autoFocus={autoFocus}
        onChange={onChange}
        placeholder={placeholder}
      />
      <button
        type="button"
        className="auth-password-toggle"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        <i className={`ti ti-eye${visible ? '-off' : ''}`}></i>
      </button>
    </div>
  )
}
