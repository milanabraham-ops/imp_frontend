import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import PasswordField from './PasswordField'
import Blobs from '../common/Blobs'
import logoDark from '../../assets/voicestack-logo-dark.svg'
import './auth.css'

// Mirrors backend/src/utils/passwordPolicy.js, same as ChangePasswordPage's own copy, kept in
// sync manually since the two apps don't share code. Instant client-side feedback only; the
// server enforces this too.
function passwordPolicyError(password) {
  if (!password || password.length < 8) return 'New password must be at least 8 characters'
  if (!/[a-z]/.test(password)) return 'New password must include a lowercase letter'
  if (!/[A-Z]/.test(password)) return 'New password must include an uppercase letter'
  if (!/[0-9]/.test(password)) return 'New password must include a number'
  if (!/[^a-zA-Z0-9]/.test(password)) return 'New password must include a special character'
  return null
}

// Deliberately no email link/code step, by explicit choice over setting up outbound email: typing
// a matching email is itself what unlocks the new-password form. See authController's
// forgotPassword/resetPassword for the tradeoff this accepts (no side-channel identity check).
export default function ForgotPasswordPage() {
  const { forgotPassword, resetPassword } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await forgotPassword(email)
      setStep('password')
    } catch (err) {
      setError(err.message || 'No resettable account found with that email')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const policyError = passwordPolicyError(newPassword)
    if (policyError) {
      setError(policyError)
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }
    setSubmitting(true)
    try {
      await resetPassword(email, newPassword)
      setDone(true)
    } catch (err) {
      setError(err.message || 'Could not reset password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <Blobs />

      <div className="auth-card">
        <div className="auth-brand">
          <img src={logoDark} alt="Voicestack" />
        </div>

        {done ? (
          <>
            <h1>Password Reset</h1>
            <p className="auth-sub">Your password has been changed. Every device signed into this account has been signed out.</p>
            <button type="button" className="auth-btn-primary" onClick={() => navigate('/login', { replace: true })}>
              Back to Sign In
            </button>
          </>
        ) : step === 'email' ? (
          <>
            <h1>Forgot Password</h1>
            <p className="auth-sub">Enter your account email to continue.</p>

            {error && (
              <div className="auth-error">
                <i className="ti ti-alert-circle"></i>
                {error}
              </div>
            )}

            <form onSubmit={handleEmailSubmit}>
              <div className="auth-field">
                <label>Email</label>
                <input type="email" value={email} required onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
              </div>
              <button type="submit" className="auth-btn-primary" disabled={submitting}>
                {submitting ? 'Checking…' : 'Continue'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1>Set a New Password</h1>
            <p className="auth-sub">Choose a new password for {email}.</p>

            {error && (
              <div className="auth-error">
                <i className="ti ti-alert-circle"></i>
                {error}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit}>
              <div className="auth-field">
                <label>New Password</label>
                <PasswordField value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} />
                <div className="hint">At least 8 characters, with uppercase, lowercase, a number, and a special character.</div>
              </div>
              <div className="auth-field">
                <label>Confirm New Password</label>
                <PasswordField value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <button type="submit" className="auth-btn-primary" disabled={submitting}>
                {submitting ? 'Saving…' : 'Reset Password'}
              </button>
            </form>
          </>
        )}

        {!done && (
          <p className="auth-sub" style={{ marginTop: 16, marginBottom: 0 }}>
            <Link to="/login">Back to Sign In</Link>
          </p>
        )}
      </div>
    </div>
  )
}
