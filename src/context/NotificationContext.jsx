import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth, API_URL } from './AuthContext'
import { apiFetch } from '../lib/apiFetch'
import { useToast } from './ToastContext'
import { playNotificationSound } from '../lib/notificationSound'

const NotificationContext = createContext(null)
// Single source of truth for every notification category, everything else below (empty-state
// shapes, localStorage merge, badge reset) is derived from this list, so adding a category is a
// one-line change here instead of five scattered edits.
const CATEGORIES = [
  'newRequest',
  'qaHandoff',
  'pocHandover',
  'comment',
  'sectionComment',
  'pocEdit',
  'newIntegration',
  'integrationComplete',
]
const POLL_MS = 5000

function mapOf(fn) {
  return Object.fromEntries(CATEGORIES.map((cat) => [cat, fn()]))
}

function blankBadges() {
  return mapOf(() => false)
}

function emptyIds() {
  return mapOf(() => new Set())
}

function storageKey(userId) {
  return `voicestack.notifications.v2.${userId}`
}

function blankState() {
  return { baselined: mapOf(() => false), seen: mapOf(() => ({})) }
}

function loadState(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return blankState()
    const parsed = JSON.parse(raw)
    const blank = blankState()
    return {
      baselined: { ...blank.baselined, ...parsed.baselined },
      seen: Object.fromEntries(CATEGORIES.map((cat) => [cat, { ...blank.seen[cat], ...parsed.seen?.[cat] }])),
    }
  } catch {
    return blankState()
  }
}

function saveState(userId, state) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state))
  } catch {
    // storage full/unavailable, badges just won't persist across reloads, not fatal
  }
}

function submissionLabel(s) {
  return `${s.clientName || 'Untitled'} (${s.locationName || 'Untitled location'})`
}

// Which submissions/groups matter for which category, scoped to the current user, plus a
// human-readable `message` per event, this is what actually shows up in the toast pop, not just
// a silent badge dot. "createdAt" is when the location was first submitted; "qaHandoffAt"/
// "pocHandoverAt"/"lastPocEditAt"/"integrationTicketCreatedAt"/"integrationCompletedAt" are
// separate app-stamped moments (see Submission.js) for when each of those things actually
// happened. Comments are per-submission, the latest one addressed to this user, either as the
// thread's primary recipient (notifyUserId) or explicitly @-mentioned in it (mentions), same
// granularity as the other categories so every category can share one path.
function relevantEvents(submissions, groups, role, userId) {
  const events = mapOf(() => [])
  const wantsNewRequest = ['specialist', 'qa', 'admin'].includes(role)
  const wantsQaHandoff = ['qa', 'admin'].includes(role)
  const wantsPocHandover = ['poc', 'admin'].includes(role)
  // A POC can't touch a tracking field at all (the backend blocks it), only their edits to the
  // actual setup data ever stamp lastPocEditAt, so whoever's actually configuring/reviewing it
  // (or an admin, who can do either) is the right audience, same as newRequest.
  const wantsPocEdit = ['specialist', 'qa', 'admin'].includes(role)
  // No specialist/QA split on integrations, anyone but a POC can pick one up.
  const wantsNewIntegration = ['specialist', 'qa', 'admin'].includes(role)
  const wantsIntegrationComplete = ['poc', 'admin'].includes(role)

  for (const s of submissions) {
    if (wantsNewRequest && s.createdAt) {
      events.newRequest.push({ id: s._id, at: s.createdAt, message: `New request: ${submissionLabel(s)}, submitted by ${s.poc || 'a POC'}` })
    }
    if (wantsQaHandoff && s.qaHandoffAt) {
      events.qaHandoff.push({ id: s._id, at: s.qaHandoffAt, message: `Ready for QA: ${submissionLabel(s)}` })
    }
    if (wantsPocHandover && s.pocHandoverAt) {
      events.pocHandover.push({ id: s._id, at: s.pocHandoverAt, message: `Handed over to you: ${submissionLabel(s)}` })
    }
    if (wantsPocEdit && s.lastPocEditAt) {
      events.pocEdit.push({
        id: s._id,
        at: s.lastPocEditAt,
        message: `${s.poc || 'The POC'} updated ${submissionLabel(s)}${s.lastPocEditSummary ? ` (${s.lastPocEditSummary.replace(/^Edited /, '')})` : ''}`,
      })
    }
    if (wantsNewIntegration && s.integrationTicketCreatedAt) {
      events.newIntegration.push({ id: s._id, at: s.integrationTicketCreatedAt, message: `New integration ticket: ${submissionLabel(s)} (${s.pms})` })
    }
    if (wantsIntegrationComplete && s.integrationCompletedAt) {
      events.integrationComplete.push({ id: s._id, at: s.integrationCompletedAt, message: `Integration complete: ${submissionLabel(s)}` })
    }

    const mine = (s.comments || []).filter(
      (c) => String(c.notifyUserId) === String(userId) || (c.mentions || []).some((id) => String(id) === String(userId)),
    )
    // Split by comment.section, null is the general thread (IntegrationEditModal/QAReviewModal,
    // surfaced on the Integrations nav/board), anything else is one of the submission "View"
    // modal's per-section threads (SubmissionDetailSections, surfaced on Accounts/Pipeline). Same
    // submission can carry both at once; each needs its own category so opening one thread's view
    // doesn't silently mark the other's unrelated comment as seen too.
    const general = mine.filter((c) => !c.section)
    const sectioned = mine.filter((c) => c.section)
    const latestOf = (list) => list.reduce((max, c) => (!max || new Date(c.createdAt) > new Date(max) ? c.createdAt : max), null)
    if (general.length) {
      events.comment.push({ id: s._id, at: latestOf(general), message: `New comment on ${submissionLabel(s)}` })
    }
    if (sectioned.length) {
      events.sectionComment.push({ id: s._id, at: latestOf(sectioned), message: `New comment on ${submissionLabel(s)}` })
    }
  }

  // GET /submissions deliberately excludes grouped locations (group: null filter) for a POC ,
  // those are only reachable via /groups, which rolls each group's most recent handover into
  // mostRecentHandoverAt so a multi-location account's POC still gets notified. (Comments, edits,
  // and integration events on grouped locations aren't covered yet, /groups doesn't expose them.)
  if (wantsPocHandover) {
    for (const g of groups) {
      if (g.mostRecentHandoverAt) events.pocHandover.push({ id: g._id, at: g.mostRecentHandoverAt, message: `Handed over to you: ${g.clientName}` })
    }
  }

  return events
}

// Global, cross-page: badges + a sound + a toast pop for every category above, driven by a
// background poll independent of whatever page is currently open. Read state is tracked per-item
// (per submission/group), not one "seen up to X" timestamp per category, so a nav badge reflects
// "something in here is unseen" while each list page can point at exactly which row it is, and
// opening the list itself doesn't blow away that detail.
export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [badges, setBadges] = useState(blankBadges)
  const [unseenIds, setUnseenIds] = useState(emptyIds)
  const stateRef = useRef(blankState())
  const alertedRef = useRef(new Set())
  // True only for the very first poll of a fresh session (reset on every login/user switch), lets
  // that poll silently sync badges for whatever backlog built up while logged out, without a toast
  // for each one. A toast is for something happening live; replaying history as a burst of popups
  // the instant someone logs in isn't that.
  const isFirstPollRef = useRef(true)

  useEffect(() => {
    stateRef.current = user ? loadState(user.id) : blankState()
    alertedRef.current = new Set()
    isFirstPollRef.current = true
    setBadges(blankBadges())
    setUnseenIds(emptyIds())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function poll() {
      try {
        // A dedicated minimal-field endpoint (see backend notificationController.feed) rather than
        // the full GET /submissions + GET /groups every board page already polls, this runs
        // globally, once per open tab, independent of whatever page is on screen, so it doesn't
        // need (or want) the full documents those pages fetch for themselves.
        const res = await apiFetch(`${API_URL}/notifications/feed`)
        if (!res.ok || cancelled) return
        const body = await res.json()
        const submissions = Array.isArray(body.submissions) ? body.submissions : []
        const groups = Array.isArray(body.groups) ? body.groups : []
        const events = relevantEvents(submissions, groups, user.role, user.id)

        const state = stateRef.current
        // Each category baselines itself independently, once, the first time it's ever polled,
        // whatever already exists is "already seen", so shipping this doesn't retroactively
        // alert (or toast) on old history. Anything that shows up after that is real.
        for (const cat of CATEGORIES) {
          if (!state.baselined[cat]) {
            state.baselined[cat] = true
            for (const e of events[cat]) {
              if (state.seen[cat][e.id] === undefined) state.seen[cat][e.id] = e.at
            }
          }
        }
        saveState(user.id, state)

        const nextBadges = {}
        const nextIds = {}
        let playSound = false
        const isFirstPoll = isFirstPollRef.current
        for (const cat of CATEGORIES) {
          const seenMap = state.seen[cat]
          const unseen = events[cat].filter((e) => new Date(e.at) > new Date(seenMap[e.id] || 0))
          nextBadges[cat] = unseen.length > 0
          nextIds[cat] = new Set(unseen.map((e) => e.id))
          const unalerted = unseen.filter((e) => !alertedRef.current.has(`${cat}:${e.id}:${e.at}`))
          if (unalerted.length > 0) {
            unalerted.forEach((e) => {
              alertedRef.current.add(`${cat}:${e.id}:${e.at}`)
              // Badges above still reflect this regardless, only the toast+sound burst is
              // skipped for whatever was already sitting there before this session started.
              if (!isFirstPoll) showToast(e.message, 'info')
            })
            if (!isFirstPoll) playSound = true
          }
        }
        isFirstPollRef.current = false
        if (!cancelled) {
          setBadges(nextBadges)
          setUnseenIds(nextIds)
          if (playSound) playNotificationSound()
        }
      } catch {
        // A missed poll just means the badge waits for the next one, not worth surfacing.
      }
    }

    poll()
    const interval = setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Clears the unread flag for one specific item in one category, called when that row is
  // actually opened/acted on, not just when the list page it lives on is visited, so the dot
  // stays put (letting someone "pinpoint which one") until it's genuinely addressed.
  const markSeen = useCallback(
    (category, itemId) => {
      if (!user || !itemId) return
      const state = stateRef.current
      state.seen[category] = { ...state.seen[category], [String(itemId)]: new Date().toISOString() }
      saveState(user.id, state)
      setUnseenIds((prev) => {
        const next = new Set(prev[category])
        next.delete(String(itemId))
        setBadges((prevBadges) => ({ ...prevBadges, [category]: next.size > 0 }))
        return { ...prev, [category]: next }
      })
    },
    [user],
  )

  return <NotificationContext.Provider value={{ badges, unseenIds, markSeen }}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
