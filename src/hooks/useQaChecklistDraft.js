import { useEffect, useRef, useState } from 'react'

// Same "survive an unexpected logout/crash without losing work" safety net useFormDraft gives the
// intake wizard, applied to an in-progress QA review. Keyed per-submission (not one global slot)
// since a reviewer works through many different accounts over a session, reviewing one shouldn't
// surface a stale draft left over from a completely different one.
const DRAFT_KEY_PREFIX = 'voicestack.qaDraft.v1.'
const SAVE_DEBOUNCE_MS = 1500

function storageKey(submissionId) {
  return `${DRAFT_KEY_PREFIX}${submissionId}`
}

function loadDraft(submissionId) {
  try {
    const raw = localStorage.getItem(storageKey(submissionId))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveDraft(submissionId, draft) {
  try {
    localStorage.setItem(storageKey(submissionId), JSON.stringify(draft))
  } catch {
    // storage full/unavailable, draft just won't persist, not fatal
  }
}

function clearDraftStorage(submissionId) {
  try {
    localStorage.removeItem(storageKey(submissionId))
  } catch {
    // nothing to do, if removal fails the key is likely inaccessible anyway
  }
}

// A draft only counts as meaningful if it actually differs from what's already saved on the
// submission itself, otherwise just opening the review (which always seeds the checklist from
// the submission) would look like "a draft" every single time.
function isMeaningfulDraft(draftChecklist, savedChecklist) {
  if (!Array.isArray(draftChecklist) || draftChecklist.length === 0) return false
  const savedByItem = new Map((savedChecklist || []).map((row) => [row.item, row]))
  return draftChecklist.some((row) => {
    const saved = savedByItem.get(row.item)
    const savedStatus = saved?.status || ''
    const savedNote = saved?.note || ''
    return row.status !== savedStatus || row.note !== savedNote
  })
}

export function useQaChecklistDraft({ submissionId, checklist, savedChecklist, enabled }) {
  const [pendingDraft, setPendingDraft] = useState(null)
  const dismissedRef = useRef(false)
  const timerRef = useRef(null)

  // Check once whenever the submission being reviewed changes, not on every checklist edit.
  useEffect(() => {
    dismissedRef.current = false
    if (!enabled || !submissionId) {
      setPendingDraft(null)
      return
    }
    const draft = loadDraft(submissionId)
    setPendingDraft(draft && isMeaningfulDraft(draft.checklist, savedChecklist) ? draft : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, submissionId])

  // Debounced autosave, skipped until the restore/discard prompt (if any) has been resolved,
  // otherwise an in-progress edit could clobber the on-disk draft before the user ever sees it.
  useEffect(() => {
    if (!enabled || !submissionId) return
    if (pendingDraft && !dismissedRef.current) return

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (isMeaningfulDraft(checklist, savedChecklist)) {
        saveDraft(submissionId, { checklist, savedAt: new Date().toISOString() })
      } else {
        clearDraftStorage(submissionId)
      }
    }, SAVE_DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled, submissionId, checklist, savedChecklist, pendingDraft])

  const restoreDraft = () => {
    dismissedRef.current = true
    const draft = pendingDraft
    setPendingDraft(null)
    return draft
  }

  const discardDraft = () => {
    dismissedRef.current = true
    setPendingDraft(null)
    if (submissionId) clearDraftStorage(submissionId)
  }

  const clearDraft = () => {
    if (submissionId) clearDraftStorage(submissionId)
  }

  return { pendingDraft, restoreDraft, discardDraft, clearDraft }
}
