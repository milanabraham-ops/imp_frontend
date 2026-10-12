import { useState } from 'react'
import { apiFetch } from '../lib/apiFetch'

export function useFileUpload(apiUrl) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const upload = async (file, practiceName, locationName) => {
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (practiceName) formData.append('practiceName', practiceName)
      if (locationName) formData.append('locationName', locationName)
      const res = await apiFetch(`${apiUrl}/uploads`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Upload failed')
      }
      return await res.json()
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setUploading(false)
    }
  }

  const remove = async (fileId) => {
    try {
      await apiFetch(`${apiUrl}/uploads/${fileId}`, { method: 'DELETE' })
    } catch {
      // best-effort cleanup, ignore failures
    }
  }

  return { upload, remove, uploading, error }
}
