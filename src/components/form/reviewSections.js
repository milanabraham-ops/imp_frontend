import { QUEUE_TYPES } from '../../data/options'

const QUEUE_KEY_BY_VALUE = Object.fromEntries(QUEUE_TYPES.map((q) => [q.value, q.key]))

function list(value) {
  return Array.isArray(value) && value.length ? value.join(', ') : ''
}

// This file stays plain JS (no JSX) since it's a .js module, not .jsx — when there's an actual
// uploaded file, the summary becomes { text, file } instead of a plain string, and it's up to
// whichever component renders it (see ReviewFieldValue.jsx, shared by every consumer) to turn
// that into a real clickable link. Without this, a submitted audio file is only ever reachable
// by re-opening the whole form in edit mode — reviewers couldn't actually listen to what a POC
// uploaded from the screens they actually use to review it.
function audioToggleSummary(type, script, file) {
  if (!type) return ''
  if (type !== 'Custom') return 'Default'
  const parts = []
  if (script) parts.push('Script/link provided')
  if (file?.filename) return { text: parts.join(' · '), file }
  return parts.length ? parts.join(' · ') : 'Custom selected, but no script/link/file added yet'
}

function rawAudioSummary(script, file) {
  const parts = []
  if (script) parts.push('Script/link provided')
  if (file?.filename) return { text: parts.join(' · '), file }
  return parts.join(' · ')
}

function activeQueueDetail(group) {
  const key = QUEUE_KEY_BY_VALUE[group.queueType]
  return key ? group.queue[key] : null
}

// One ring group's fields, reused per-entry in Step9Review since ringGroups is a repeatable
// list rather than a fixed set of top-level fields like the other review sections.
export const RING_GROUP_FIELDS = [
  { label: 'Ring Type', get: (g) => g.ringType },
  { label: 'Ring Duration (s)', get: (g) => g.ringDuration },
  { label: 'Ring Group Users', get: (g) => g.ringGroupUsers },
  { label: 'Shared Voicemail Group Users', get: (g) => g.svmUsers },
  { label: 'Voicemail to Email Notification', get: (g) => g.vmEmail },
  { label: 'Voicemail Email Addresses', get: (g) => g.vmEmailAddresses },
  { label: 'Call Queue Type', get: (g) => g.queueType },
  {
    label: 'On-Hold Audio',
    get: (g) => {
      const q = activeQueueDetail(g)
      return q ? audioToggleSummary(q.onholdType, q.onholdScript, q.onholdFile) : ''
    },
  },
  { label: 'Max Queue Duration (s)', get: (g) => activeQueueDetail(g)?.maxDuration || '' },
  { label: 'Max Callers in Queue', get: (g) => activeQueueDetail(g)?.maxCallers || '' },
  { label: 'Queue Announcement', get: (g) => list(activeQueueDetail(g)?.announcement) },
  { label: 'Queue Exit Type', get: (g) => activeQueueDetail(g)?.exitType || '' },
  { label: 'Key to Activate Exit', get: (g) => activeQueueDetail(g)?.exitKey || '' },
  {
    label: 'Exit Voicemail / Call-Back Audio',
    get: (g) => {
      const q = activeQueueDetail(g)
      return q ? rawAudioSummary(q.exitScript, q.exitFile) : ''
    },
  },
  { label: 'Auto Dial (Queue Only)', get: (g) => g.autoDial },
]

// Tracking fields (set by specialist/QA, not part of the form itself) — shown in the read-only
// detail view (SubmissionDetailSections) but deliberately NOT in REVIEW_SECTIONS below: that
// array is also sliced by index in Step9Review to interleave the Ring Groups section at the
// right wizard position, and every entry there needs a real `step` for its Edit button — neither
// of which applies here, since these fields don't exist yet on the form's own review-before-submit screen.
// Survives the audit log's own retention pruning (see backend/utils/auditLog.js) — kept in sync
// with every logged action against this submission, so "who last touched this, and when" is
// never lost even once the detailed log entry that produced it has aged out.
function lastActivitySummary(d) {
  if (!d.lastActivityAt) return ''
  const when = new Date(d.lastActivityAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  return `${d.lastActivityBy || 'Unknown'} · ${when}`
}

export const STATUS_SECTION = {
  title: 'Status',
  fields: [
    { label: 'Configuration Status', get: (d) => d.configurationStatus },
    { label: 'Account Onboarded', get: (d) => d.accountOnboarded },
    { label: 'Implementation Specialist', get: (d) => d.implementationSpecialist },
    { label: 'QA Agent', get: (d) => d.qaAgent },
    // Only relevant when this location actually has a PMS integration ticket (see
    // submissionController.js's needsIntegration) — blank for everything else, including every
    // CS Voicestack account, which is always already wired to CareStack directly.
    { label: 'Integration Status', get: (d) => d.integrationStatus },
    { label: 'Integration Agent', get: (d) => d.integrationAgent },
    { label: 'Last Activity', get: lastActivitySummary },
  ],
}

export const REVIEW_SECTIONS = [
  {
    title: 'Account & Location',
    step: 0,
    fields: [
      { label: 'Client / Account Name', get: (d) => d.clientName },
      { label: 'Location Name', get: (d) => d.locationName },
      { label: 'Billable Location?', get: (d) => d.locationBillable },
      { label: 'Market', get: (d) => d.market },
      { label: 'Environment', get: (d) => d.environment },
      { label: 'Billing Plan', get: (d) => d.billingPlan },
      { label: 'Implementation POC', get: (d) => d.poc },
      { label: 'Timezone', get: (d) => d.timezone },
      { label: 'Desired Go-Live Date', get: (d) => d.goLiveDate },
    ],
  },
  {
    title: 'Phone Numbers & Hours',
    step: 1,
    fields: [
      { label: 'Phone Numbers', get: (d) => d.phoneNumbers },
      { label: 'Business Days', get: (d) => list(d.businessDays) },
      { label: 'Business Hours', get: (d) => d.businessHours },
      { label: 'After-Hours Days', get: (d) => list(d.afterHoursDays) },
      { label: 'After-Hours Timing', get: (d) => d.afterHoursTiming },
      { label: 'Custom Holidays', get: (d) => d.customHolidays },
    ],
  },
  {
    title: 'Phone Tree & Call Flow',
    step: 2,
    fields: [
      { label: 'Business Hours Phone Tree', get: (d) => d.phoneTree },
      { label: 'Call Flow Detail', get: (d) => d.callFlow },
      { label: 'After-Hours Phone Tree', get: (d) => d.afterHoursPhoneTree },
      { label: 'After-Hours Condition', get: (d) => d.afterHoursCondition },
    ],
  },
  {
    title: 'Audio & Voicemail Scripts',
    step: 3,
    fields: [
      { label: 'Audio Language', get: (d) => d.audioLanguage },
      { label: 'Welcome Audio', get: (d) => audioToggleSummary(d.welcomeType, d.welcomeScript, d.welcomeFile) },
      { label: 'After-Hours Voicemail Audio', get: (d) => audioToggleSummary(d.ahvmType, d.ahvmScript, d.ahvmFile) },
      { label: 'Busy Hours Voicemail Audio', get: (d) => audioToggleSummary(d.bhvmType, d.bhvmScript, d.bhvmFile) },
    ],
  },
  {
    title: 'Devices, Agents & Access',
    step: 5,
    fields: [
      { label: 'Device Line Keys', get: (d) => d.lineKeys },
      { label: 'Hot Desking Users', get: (d) => d.hotDesking },
      { label: 'Admin Users', get: (d) => d.adminUsers },
      { label: 'AI Usage Limit', get: (d) => d.aiLimit },
      { label: 'Card Assignment Rules', get: (d) => d.cardAssignment },
      { label: 'Card Visibility (Agent Names)', get: (d) => d.cardVisibility },
    ],
  },
  {
    title: 'Workflows, DNI & SMS/Fax',
    step: 6,
    fields: [
      { label: 'Automated Workflow', get: (d) => d.workflow },
      { label: 'Workflow Condition', get: (d) => d.workflowCondition },
      { label: 'Workflow Actions', get: (d) => list(d.workflowAction) },
      { label: 'SMS Content per Workflow', get: (d) => d.smsContent },
      { label: 'DNI Campaigns', get: (d) => d.dni },
      { label: 'Campaign Details & Google Ads Credentials', get: (d) => d.dniCampaigns },
      { label: 'SMS Numbers', get: (d) => d.smsNumbers },
      { label: 'Users with SMS Access', get: (d) => d.smsUsers },
      { label: 'Text Unification', get: (d) => d.textUnification },
      { label: 'Fax Numbers', get: (d) => d.faxNumbers },
      { label: 'Users with Fax Access', get: (d) => d.faxUsers },
    ],
  },
  {
    title: 'Links, Attachments & PMS',
    step: 7,
    fields: [
      { label: 'Phone Information Sheet Link', get: (d) => d.phoneSheetLink },
      { label: 'Questionnaire Link', get: (d) => d.questionnaireLink },
      { label: 'Additional Notes', get: (d) => d.additionalNotes },
      { label: 'PMS System', get: (d) => d.pms },
      { label: 'Integration Notes', get: (d) => d.serverAccess },
    ],
  },
]
