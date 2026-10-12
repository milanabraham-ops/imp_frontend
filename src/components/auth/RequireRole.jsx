import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { roleHome } from '../../lib/roles'

export default function RequireRole({ roles, children }) {
  const { user, loading } = useAuth()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />
  if (!roles.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />
  return children
}
