export const STEP_LABELS = [
  'Account',
  'Phone',
  'Call flow',
  'Audio',
  'Ring/Queue',
  'Devices',
  'Workflows',
  'Files & PMS',
  'Review',
]

export const TOTAL_STEPS = STEP_LABELS.length

// Suggestions only, not a locked enum — the field stays a free-text input (a timezone we haven't
// listed yet should never be blocked from being typed in).
export const TIMEZONES = [
  'India Standard Time',
  'UTC',
  'Canada Central Standard Time',
  'US Mountain Standard Time',
  'Eastern Standard Time',
  'Central Standard Time',
  'Hawaiian Standard Time',
  'Mountain Standard Time',
  'Pacific Standard Time',
  'Alaskan Standard Time',
]

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
export const ALL_DAYS = [...WEEKDAYS, 'Saturday', 'Sunday']

export const MARKETS = ['Dental', 'Ophthalmology', 'Physiotherapy', 'Veterinary']

// Fallback seed list, mirrored on the backend (QaChecklistTemplate) — what QA verifies for every
// account before marking it Completed. The backend's shared, growable template is the real
// source of truth; this is only used if that hasn't loaded yet.
export const QA_CHECKLIST_ITEMS = [
  'Configuration',
  'Token Ticket',
  'Click to Call',
  'Team Login',
  'Account Onboarding',
  'BS Permissions',
  'Purchase Numbers',
  'Phone Number',
  'Fax Number',
  'Location',
  'Location Mapping',
  'IVR + VM Audios',
  'Extensions',
  'Agents',
  'IP Address(es)',
  'Devices',
  'Ring Groups',
  'Call Queue',
  'Phone Tree(s)',
  'Offline Phone Tree(s)',
  'Provisioning Profile',
  'Message Group',
  'Fax Permissions',
  'Admin Users',
  'Potential Opportunities',
  'VoiceBot',
]

export const PHONE_TREE_OPTIONS = [
  'Gather Extension',
  'Dial',
  'Contact Type',
  'Gather Digits (IVR)',
  'Voicemail',
]

export const RING_TYPES = ['Simultaneous', 'Round Robin', 'Priority', 'Longest Waiting Time']

export const QUEUE_TYPES = [
  { key: 'exit', label: 'Dial & exit', value: 'Dial & Exit' },
  { key: 'dq', label: 'Dial & queue', value: 'Dial & Queue' },
  { key: 'qo', label: 'Queue only', value: 'Queue only' },
]

export const QUEUE_ANNOUNCEMENTS = ['Position', 'Wait time']
export const QUEUE_EXIT_TYPES = ['Voicemail', 'Call back']

export const WORKFLOW_ACTIONS = [
  'Send text message',
  'Create to-do',
  'Trigger voicemail playback',
  'None',
]

export const CARD_ASSIGNMENT_OPTIONS = ['Answered Agent', 'Round Robin', 'Enable All']

// Suggestions only, not a locked enum — the field stays a free-text input (a new PMS we haven't
// worked with yet should never be blocked from being typed in).
export const PMS_OPTIONS = [
  'Bitwerx',
  'CareStack',
  'CurveDental',
  'Dentally',
  'Denticon',
  'DenticonProxy',
  'DentrixAscend',
  'DentrixCore',
  'EagleSoft',
  'EmpowerEMR',
  'EyeCloudPro',
  'NexHealth',
  'OpenDental',
  'PromptEMR',
  'RevolutionEHR',
  'Rhapsody',
  'Vetspire',
  'Zavy360',
]

const emptyQueueDetail = () => ({
  onholdType: '',
  onholdScript: '',
  onholdFile: null,
  maxDuration: '',
  maxCallers: '',
  announcement: [],
  exitType: '',
  exitKey: '',
  exitScript: '',
  exitFile: null,
})

// A location can have several independent ring groups, each with its own SVM/voicemail/queue
// setup — this is one entry in the repeatable list Step5RingQueue renders.
export const emptyRingGroup = () => ({
  sameConfigAsPrevious: false,
  ringType: '',
  ringDuration: '',
  ringGroupUsers: '',
  sameSvmAsPrevious: false,
  svmUsers: '',
  vmEmail: '',
  vmEmailAddresses: '',
  queueType: '',
  queue: {
    exit: emptyQueueDetail(),
    dq: emptyQueueDetail(),
    qo: emptyQueueDetail(),
  },
  autoDial: '',
})

export const initialFormData = {
  // Step 1
  clientName: '',
  locationName: '',
  locationBillable: '',
  market: '',
  environment: 'Voicestack',
  billingPlan: '',
  poc: '',
  timezone: '',
  goLiveDate: '',
  // Step 2
  phoneNumbers: '',
  businessDays: [],
  businessHours: '',
  afterHoursDays: [],
  afterHoursTiming: '',
  customHolidays: '',
  // Step 3
  phoneTree: '',
  callFlow: '',
  afterHoursPhoneTree: '',
  afterHoursCondition: '',
  // Step 4
  audioLanguage: '',
  welcomeType: '',
  welcomeScript: '',
  welcomeFile: null,
  ahvmType: '',
  ahvmScript: '',
  ahvmFile: null,
  bhvmType: '',
  bhvmScript: '',
  bhvmFile: null,
  // Step 5
  ringGroups: [emptyRingGroup()],
  // Step 6
  lineKeys: '',
  hotDesking: '',
  adminUsers: '',
  aiLimit: '',
  cardAssignment: '',
  cardVisibility: '',
  // Step 7
  workflow: '',
  workflowCondition: '',
  workflowAction: [],
  smsContent: '',
  dni: '',
  dniCampaigns: '',
  smsNumbers: '',
  smsUsers: '',
  textUnification: '',
  faxNumbers: '',
  faxUsers: '',
  // Step 8
  phoneSheetLink: '',
  questionnaireLink: '',
  additionalNotes: '',
  pms: '',
  serverAccess: '',
  // Step 9 — message posted to the POC's own Chat space on submit, editable before sending.
  // Not a Submission schema field; the backend reads it once off the create request and discards it.
  pocMessage: '',
}
