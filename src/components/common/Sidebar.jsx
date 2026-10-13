import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import logoLight from '../../assets/voicestack-logo.svg'
import logoDark from '../../assets/voicestack-logo-dark.svg'

// badge = red dot (new request/handoff/handover); commentBadge = green dot (unread comment) —
// a nav item can show either, both, or neither at once, since they mean different things.
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'ti-chart-bar', roles: ['poc', 'specialist', 'qa', 'admin'] },
  {
    to: '/',
    label: 'Accounts',
    icon: 'ti-layout-dashboard',
    roles: ['poc', 'admin'],
    badge: (b) => b.pocHandover,
    commentBadge: (b) => b.sectionComment,
  },
  { to: '/new', label: 'New Submission', icon: 'ti-plus', roles: ['poc', 'admin'] },
  {
    // Replaced the separate Configuration Requests / QA Requests table pages — one drag-and-drop
    // board covering the whole specialist -> QA flow, permissions enforced per card/column.
    to: '/pipeline',
    label: 'Pipeline',
    icon: 'ti-layout-kanban',
    roles: ['specialist', 'qa', 'admin'],
    badge: (b) => b.newRequest || b.qaHandoff || b.pocEdit,
    commentBadge: (b) => b.sectionComment,
  },
  {
    // Its own separate board from Pipeline — PMS integration work, visible to every role (a POC
    // needs to see status even though only staff can act on it) since it's a distinct workflow
    // from configuration/QA, not a stage within it.
    to: '/integrations',
    label: 'Integrations',
    icon: 'ti-plug-connected',
    roles: ['poc', 'specialist', 'qa', 'admin'],
    badge: (b) => b.newIntegration || b.integrationComplete,
    commentBadge: (b) => b.comment,
  },
  {
    // A plain searchable log, not a workflow board — every account's forwarded numbers, visible
    // to everyone (POC scoped to their own accounts) since anyone can add or fix one.
    to: '/forwarding-numbers',
    label: 'Forwarding Numbers',
    icon: 'ti-phone-outgoing',
    roles: ['poc', 'specialist', 'qa', 'admin'],
  },
  {
    // A plain reference list, not a workflow board — every PMS integration guide an admin has
    // added (see AdminSettings), visible to everyone since anyone filling in or reviewing the PMS
    // Integration section of a submission may need to check what a given PMS requires.
    to: '/integration-docs',
    label: 'Integration Docs',
    icon: 'ti-file-text',
    roles: ['poc', 'specialist', 'qa', 'admin'],
  },
  { to: '/admin', label: 'Manage Access', icon: 'ti-users', roles: ['admin'] },
  { to: '/admin/settings', label: 'Settings', icon: 'ti-settings', roles: ['admin'] },
  { to: '/activity', label: 'Activity Log', icon: 'ti-history', roles: ['poc', 'specialist', 'qa', 'admin'] },
]

export default function Sidebar() {
  const location = useLocation()
  const { user } = useAuth()
  const { badges } = useNotifications()
  const items = NAV_ITEMS.filter((item) => item.roles.includes(user?.role))

  return (
    <aside className="dash-sidebar">
      <div className="brand dash-sidebar-brand">
        <img className="brand-logo-dark" src={logoDark} alt="Voicestack" height="26" />
        <img className="brand-logo-light" src={logoLight} alt="Voicestack" height="26" />
      </div>
      <nav className="dash-nav">
        {items.map((item) => (
          <Link key={item.to} to={item.to} className={`dash-nav-item ${location.pathname === item.to ? 'active' : ''}`}>
            <i className={`ti ${item.icon}`}></i> {item.label}
            {(item.badge?.(badges) || item.commentBadge?.(badges)) && (
              <span className="dash-nav-badges">
                {item.badge?.(badges) && <span className="dash-nav-badge" aria-label="New activity" />}
                {item.commentBadge?.(badges) && <span className="dash-nav-badge comment" aria-label="New comment" />}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
