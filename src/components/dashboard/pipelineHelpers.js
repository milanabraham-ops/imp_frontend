// Shared by every place that shows a submission as a draggable/viewable pipeline card —
// Pipeline (the specialist/QA work queue), Accounts, and the group drill-in.

export function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function normalize(value) {
  return (value || '').trim().toUpperCase()
}

// Same "who owns this right now" rule the backend enforces (submissionController's
// stripForeignOwnershipEdits/isInQaDomain) — a location is the specialist's until it reaches QA
// (or is paused mid-QA-review), then it's the QA reviewer's. Only that person may drag it.
export function isInQaDomain(s) {
  const status = normalize(s.configurationStatus)
  if (status === 'QA' || status === 'COMPLETED') return true
  return status === 'ON HOLD' && normalize(s.statusBeforeHold) === 'QA'
}

export function activeOwnerName(s) {
  return isInQaDomain(s) ? s.qaAgent : s.implementationSpecialist
}

export function canDrag(s, isMineFn, userName, userRole) {
  if (userRole === 'admin') return true
  const owner = activeOwnerName(s)
  return Boolean(owner) && isMineFn(owner, userName)
}

// Account Onboarded belongs to whoever is actually working the account right now (specialist
// while configuring, QA during review) — same rule as everywhere else it's edited.
export const ACCOUNT_ONBOARDED_OPTIONS = ['', 'Open', 'Closed']

export const COLUMNS = [
  {
    key: 'NOT_STARTED',
    label: 'Not Started',
    tone: 'neutral',
    match: (s) => !['IN PROGRESS', 'ON HOLD', 'QA', 'COMPLETED'].includes(normalize(s.configurationStatus)),
  },
  { key: 'IN_PROGRESS', label: 'In Progress', tone: 'warning', match: (s) => normalize(s.configurationStatus) === 'IN PROGRESS' },
  { key: 'ON_HOLD', label: 'On Hold', tone: 'danger', match: (s) => normalize(s.configurationStatus) === 'ON HOLD' },
  { key: 'QA', label: 'QA Review', tone: 'accent', match: (s) => normalize(s.configurationStatus) === 'QA' },
  { key: 'COMPLETED', label: 'Completed', tone: 'success', match: (s) => normalize(s.configurationStatus) === 'COMPLETED' },
]

export function columnFor(card) {
  return COLUMNS.find((c) => c.match(card))?.key || 'NOT_STARTED'
}

// A group's rolled-up configurationStatus (from GET /groups — see groupController's
// rollupConfigurationStatus) only ever comes back as '', 'In Progress', 'QA' or 'Completed' —
// never 'On Hold' on its own, since a group is only ever "in" one stage overall. '' covers both
// "no locations yet" and "every location is still untouched" — both correctly fall through to
// NOT_STARTED below.
export function columnForGroupStatus(status) {
  const s = normalize(status)
  if (s === 'COMPLETED') return 'COMPLETED'
  if (s === 'QA') return 'QA'
  if (s === 'IN PROGRESS') return 'IN_PROGRESS'
  return 'NOT_STARTED'
}

// Integration is its own independent 4-stage workflow (see submissionController's needsIntegration/
// IntegrationBoard) — shared here so both the Integrations overview and a group's integration
// drill-in (IntegrationGroupDetail) use the exact same column set rather than each defining it.
export const INTEGRATION_COLUMNS = [
  { key: 'TICKET', label: 'Needle Request (OneApi Cred)', tone: 'neutral', status: 'Needle Request (OneApi Cred)' },
  { key: 'SETUP', label: 'OneAPI Setup & Integration Process', tone: 'warning', status: 'OneAPI Setup & Integration Process' },
  { key: 'L2_HANDOVER', label: 'L2 Handover', tone: 'accent', status: 'L2 Handover' },
  { key: 'COMPLETED', label: 'Completed', tone: 'success', status: 'Completed' },
]

export function columnForIntegration(card) {
  const status = normalize(card.integrationStatus)
  const match = INTEGRATION_COLUMNS.find((c) => normalize(c.status) === status)
  return match ? match.key : 'TICKET'
}

// A group's rolled-up integrationStatus (see groupController's rollupIntegrationStatus) — only
// ever meaningful for a group that needsIntegration; the Integrations overview filters those in
// before this is ever called, so '' (nothing needs integration) never actually reaches here.
export function columnForIntegrationGroupStatus(status) {
  const s = normalize(status)
  if (s === 'COMPLETED') return 'COMPLETED'
  if (s === 'L2 HANDOVER') return 'L2_HANDOVER'
  if (s === 'ONEAPI SETUP & INTEGRATION PROCESS') return 'SETUP'
  return 'TICKET'
}
