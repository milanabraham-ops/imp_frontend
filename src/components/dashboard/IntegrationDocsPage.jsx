import { useMemo, useState } from 'react'
import { useTheme } from '../../context/ThemeContext'
import Sidebar from '../common/Sidebar'
import TopUserBar from '../common/TopUserBar'
import CustomScrollbar from '../common/CustomScrollbar'
import { usePmsDocs } from '../../hooks/usePmsDocs'
import '../form/form.css'

// Google Docs/Sheets/Slides/Drive's own "edit"/"view" URLs (what sharing normally hands you)
// refuse to be framed, only their dedicated /preview form is actually embeddable. Rewriting to
// that when the link is recognizably one of these (by file id, regardless of exact suffix/query
// string) is what makes the thumbnail below work for the common case without the admin needing to
// know to paste the "right" URL; anything else is framed as-is, best effort.
function toEmbeddableUrl(url) {
  const docMatch = url.match(/^https:\/\/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([^/?#]+)/)
  if (docMatch) return `https://docs.google.com/${docMatch[1]}/d/${docMatch[2]}/preview`
  const driveMatch = url.match(/^https:\/\/drive\.google\.com\/file\/d\/([^/?#]+)/)
  if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`
  return url
}

// A plain reference list, not a workflow board: every PMS an admin has registered in Settings
// (see AdminSettings' PMS Integration Docs panel), each card a small purely-decorative preview of
// its guide's first page (not an interactive embed, the real thing opens in a new tab on click).
// The preview shows the FULL page, not a cropped sliver: the iframe renders at a generous natural
// size (see .pms-doc-card-frame in form.css), large enough that the embedded viewer doesn't need
// its own scrollbars to show one page, and is then shrunk as a whole via CSS transform: scale()
// to fit the small card, with the wrapper clipping anything beyond it. pointer-events: none keeps
// it inert either way. Visible to every role: anyone filling in or reviewing a submission's PMS
// Integration section may need to check what a given PMS requires, not just whoever's actively
// editing one.
export default function IntegrationDocsPage() {
  const { theme } = useTheme()
  const { docs } = usePmsDocs()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return docs
    return docs.filter((d) => d.name.toLowerCase().includes(q))
  }, [docs, search])

  return (
    <div className="voicestack-form dash-shell" data-theme={theme}>
      <Sidebar />

      <main className="dash-main">
        <CustomScrollbar vertical className="dash-main-scroll">
          <TopUserBar />
          <div className="dash-main-header">
            <div>
              <h1>Integration Docs</h1>
              <p>Every PMS's integration guide, added by an admin. Check here any time you need to know what's required for one.</p>
            </div>
          </div>

          <div className="dash-table-card">
            <div className="dash-table-toolbar">
              <div className="dash-search">
                <i className="ti ti-search"></i>
                <input type="text" placeholder="Search by PMS name…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="dash-count-label">
                {filtered.length} of {docs.length} PMS{docs.length === 1 ? '' : 'es'}
              </div>
            </div>

            {docs.length === 0 ? (
              <div className="dash-empty">
                <i className="ti ti-file-text" style={{ fontSize: 28 }}></i>
                <p>No PMS integrations have been added yet. An admin can add one in Settings.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="dash-empty">
                <p>No PMS matches &quot;{search}&quot;.</p>
              </div>
            ) : (
              <div className="pms-doc-grid">
                {filtered.map((doc) =>
                  doc.url ? (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pms-doc-card"
                      key={doc.name}
                      title={`Open the ${doc.name} integration guide in a new tab`}
                    >
                      <div className="pms-doc-card-title">
                        <i className="ti ti-file-text"></i> {doc.name}
                      </div>
                      <div className="pms-doc-card-frame-wrap">
                        <iframe
                          className="pms-doc-card-frame"
                          src={toEmbeddableUrl(doc.url)}
                          title={`${doc.name} integration guide preview`}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          scrolling="no"
                          tabIndex={-1}
                        />
                      </div>
                    </a>
                  ) : (
                    <div className="pms-doc-card" key={doc.name}>
                      <div className="pms-doc-card-title">
                        <i className="ti ti-file-text"></i> {doc.name}
                      </div>
                      <span className="hint">No guide added yet</span>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </CustomScrollbar>
      </main>
    </div>
  )
}
