import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { API_URL } from '../../lib/apiUrl'

// Avatar images are served through our own protected /api/uploads or /api/avatar/file routes,
// which now require auth — but <img src> can't attach a custom Authorization header, so the
// current access token rides along as a query param instead. Only ever appended to our own API
// origin, never to some other URL a caller might pass in, so the token can't leak to a
// third-party host. Re-derived on every render (not baked in once) so it stays valid as the
// token rotates during the session.
function withAuthToken(url, token) {
  if (!url || !token || !url.startsWith(API_URL)) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}token=${encodeURIComponent(token)}`
}

export default function Avatar({ name, email, avatarUrl, size = 28 }) {
  const { token } = useAuth()
  const [src, setSrc] = useState(() => withAuthToken(avatarUrl, token))
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setSrc(withAuthToken(avatarUrl, token))
    setFailed(false)
  }, [avatarUrl, token])

  if (src && !failed) {
    return (
      <img
        className="avatar-img"
        src={src}
        alt={name || 'Account'}
        width={size}
        height={size}
        onError={() => setFailed(true)}
      />
    )
  }

  const initial = (name || email || '?').trim().charAt(0).toUpperCase()
  return (
    <div className="avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.5 }}>
      {initial}
    </div>
  )
}
