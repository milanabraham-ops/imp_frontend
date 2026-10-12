import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { roleHome } from '../../lib/roles'
import Blobs from '../common/Blobs'
import PasswordField from './PasswordField'
import logoDark from '../../assets/voicestack-logo-dark.svg'
import './auth.css'

// Mirrors Backend/src/utils/passwordPolicy.js — kept in sync manually since the two apps don't
// share code. Client-side check is just for instant feedback; the server enforces this too.
function passwordPolicyError(password) {
  if (!password || password.length < 8) return 'New password must be at least 8 characters'
  if (!/[a-z]/.test(password)) return 'New password must include a lowercase letter'
  if (!/[A-Z]/.test(password)) return 'New password must include an uppercase letter'
  if (!/[0-9]/.test(password)) return 'New password must include a number'
  if (!/[^a-zA-Z0-9]/.test(password)) return 'New password must include a special character'
  return null
}

// Forced gate — reached only when user.mustChangePassword is true (see ProtectedRoute/RequireRole).
// Once changed, the account behaves like any other and this page is unreachable again.
export default function ChangePasswordPage() {
  const { user, loading, changePassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (!user.mustChangePassword) return <Navigate to={roleHome(user.role)} replace />

  const handleSubmit = async (e) => {
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
    if (newPassword === currentPassword) {
      setError('New password must be different from your current password')
      return
    }
    setSubmitting(true)
    try {
      await changePassword(currentPassword, newPassword)
    } catch (err) {
      setError(err.message || 'Could not change password')
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
        <h1>Set a New Password</h1>
        <p className="auth-sub">Your account was created with a default password. Choose your own before continuing.</p>

        {error && (
          <div className="auth-error">
            <i className="ti ti-alert-circle"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Current Password</label>
            <PasswordField value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
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
            {submitting ? 'Saving…' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
