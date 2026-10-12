import { useEffect, useRef, useState } from 'react'

// Bump the version suffix if the stored shape ever changes, so old drafts from a previous shape
// don't get misread by newer code (same convention as NotificationContext's storageKey).
const DRAFT_KEY = 'voicestack.formDraft.v1'
const SAVE_DEBOUNCE_MS = 1500

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveDraft(draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // storage full/unavailable — draft just won't persist, not fatal
  }
}

function clearDraftStorage() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // nothing to do — if removal fails the key is likely inaccessible anyway
  }
}

// A draft only counts as "real" if at least one field actually differs from a blank form —
// otherwise every fresh visit to the wizard would offer to "restore" an empty draft.
function isMeaningfulDraft(draftData, blankData) {
  if (!draftData || typeof draftData !== 'object') return false
  return Object.keys(blankData).some((key) => {
    const value = draftData[key]
    const blankValue = blankData[key]
    if (Array.isArray(blankValue)) return Array.isArray(value) && value.length > 0
    if (value === blankValue) return false
    return value !== '' && value !== undefined && value !== null
  })
}

// Client-side autosave for the in-progress NEW submission (mode === 'create' only). Debounces
// writes to localStorage, and on mount surfaces any existing draft so the caller can prompt the
// user to restore or discard it rather than silently overwriting/loading it.
export function useFormDraft({ enabled, data, step, blankData }) {
  const [pendingDraft, setPendingDraft] = useState(null)
  const dismissedRef = useRef(false)
  const timerRef = useRef(null)

  // Check once on mount whether a meaningful draft is sitting in storage.
  useEffect(() => {
    if (!enabled) return
    const draft = loadDraft()
    if (draft && isMeaningfulDraft(draft.data, blankData)) {
      setPendingDraft(draft)
    }
    // Only ever check on mount — deliberately not re-checking as data/blankData change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  // Debounced autosave of the current data + step, skipped until the restore/discard prompt (if
  // any) has been resolved — otherwise an in-progress edit could clobber the on-disk draft before
  // the user ever gets to choose.
  useEffect(() => {
    if (!enabled) return
    if (pendingDraft && !dismissedRef.current) return

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (isMeaningfulDraft(data, blankData)) {
        saveDraft({ data, step, savedAt: new Date().toISOString() })
      }
    }, SAVE_DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled, data, step, pendingDraft, blankData])

  const restoreDraft = () => {
    dismissedRef.current = true
    const draft = pendingDraft
    setPendingDraft(null)
    return draft
  }

  const discardDraft = () => {
    dismissedRef.current = true
    setPendingDraft(null)
    clearDraftStorage()
  }

  const clearDraft = () => {
    clearDraftStorage()
  }

  return { pendingDraft, restoreDraft, discardDraft, clearDraft }
}
