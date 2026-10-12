import { useCallback, useEffect, useMemo, useState } from 'react'
import { API_URL } from '../context/AuthContext'
import { apiFetch } from '../lib/apiFetch'
import { PMS_OPTIONS } from '../data/options'

// Shared by the wizard's PMS step and the Integrations board's edit modal — same admin-managed
// list of per-PMS integration guide links either way, fetched once per mount rather than
// duplicating the fetch/lookup logic in both places. Matching is case-insensitive since `pms` is
// a free-text field (ComboBoxInput), not a locked enum.
export function usePmsDocs() {
  const [docs, setDocs] = useState([])

  useEffect(() => {
    let cancelled = false
    apiFetch(`${API_URL}/pms-docs`)
      .then((res) => (res.ok ? res.json() : { docs: [] }))
      .then((body) => {
        if (!cancelled) setDocs(Array.isArray(body.docs) ? body.docs : [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const findDoc = useCallback(
    (pmsName) => {
      const name = (pmsName || '').trim().toLowerCase()
      if (!name) return null
      return docs.find((d) => d.name.toLowerCase() === name) || null
    },
    [docs],
  )

  // Admin-managed names (added via Settings, with or without a doc URL yet) merged in as dropdown
  // suggestions alongside the original static list — so registering a new PMS integration in
  // Settings is enough on its own to make it pickable on the form, no code change needed. The
  // static list's own names win on a case-insensitive collision (kept in their original casing).
  const names = useMemo(() => {
    const seen = new Map(PMS_OPTIONS.map((n) => [n.toLowerCase(), n]))
    for (const d of docs) {
      if (!seen.has(d.name.toLowerCase())) seen.set(d.name.toLowerCase(), d.name)
    }
    return Array.from(seen.values())
  }, [docs])

  return { docs, findDoc, names }
}
