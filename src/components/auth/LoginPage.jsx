import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { roleHome } from '../../lib/roles'
import GoogleSignInButton from './GoogleSignInButton'
import PasswordField from './PasswordField'
import Blobs from '../common/Blobs'
import logoDark from '../../assets/voicestack-logo-dark.svg'
import './auth.css'

export default function LoginPage() {
  const { user, login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    return <Navigate to={user.mustChangePassword ? '/change-password' : location.state?.from || roleHome(user.role)} replace />
  }

  const destinationFor = (loggedInUser) =>
    loggedInUser.mustChangePassword ? '/change-password' : location.state?.from || roleHome(loggedInUser.role)

  const redirectAfterAuth = (loggedInUser) => navigate(destinationFor(loggedInUser), { replace: true })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const loggedInUser = await login(email, password)
      redirectAfterAuth(loggedInUser)
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleCredential = async (credential) => {
    setError('')
    try {
      const loggedInUser = await loginWithGoogle(credential)
      redirectAfterAuth(loggedInUser)
    } catch (err) {
      setError(err.message || 'Google sign-in failed')
    }
  }

  return (
    <div className="auth-shell">
      <Blobs />

      <div className="auth-card">
        <div className="auth-brand">
          <img src={logoDark} alt="Voicestack" />
        </div>
        <h1>Welcome back</h1>
        <p className="auth-sub">Sign in to access your implementation submissions.</p>

        {error && (
          <div className="auth-error">
            <i className="ti ti-alert-circle"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Email</label>
            <input type="email" value={email} required onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="auth-btn-primary" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="auth-divider"><span>or</span></div>

        <GoogleSignInButton onCredential={handleGoogleCredential} />
      </div>
    </div>
  )
}
