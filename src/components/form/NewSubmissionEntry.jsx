import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './form.css'
import { API_URL } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../context/ToastContext'
import Sidebar from '../common/Sidebar'
import TopUserBar from '../common/TopUserBar'
import CustomScrollbar from '../common/CustomScrollbar'
import FormWizard from './FormWizard'

export default function NewSubmissionEntry() {
  const [choice, setChoice] = useState(null)
  const [clientName, setClientName] = useState('')
  const [expectedLocationCount, setExpectedLocationCount] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { showToast } = useToast()
  const scrollRef = useRef(null)

  if (choice === 'single') return <FormWizard mode="create" />

  const createGroup = async (e) => {
    e.preventDefault()
    const trimmed = clientName.trim()
    if (!trimmed) return
    setCreating(true)
    setError('')
    try {
      const res = await apiFetch(`${API_URL}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: trimmed,
          expectedLocationCount: expectedLocationCount.trim() === '' ? null : Number(expectedLocationCount),
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Could not create group')
      }
      const group = await res.json()
      showToast('Group created.')
      navigate(`/groups/${group._id}`)
    } catch (err) {
      const message = err.message || 'Could not create group'
      setError(message)
      showToast(message, 'error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="voicestack-form dash-shell" data-theme={theme}>
      <Sidebar />
      <main className="dash-main">
        <CustomScrollbar vertical className="dash-main-scroll" ref={scrollRef}>
          <TopUserBar />
          <div className="page-wrap">
            <div className="card">
              <div className="card-header">
                <h1>New Submission</h1>
                <p>Is this a single-location practice, or a group with multiple locations?</p>
              </div>
              <div className="card-body">
                {choice !== 'multi' ? (
                  <div className="entry-choice-row">
                    <button type="button" className="entry-choice-card" onClick={() => setChoice('single')}>
                      <i className="ti ti-building-store"></i>
                      <h3>Single Practice</h3>
                      <p>One location for this client. Fill out the setup form directly.</p>
                    </button>
                    <button type="button" className="entry-choice-card" onClick={() => setChoice('multi')}>
                      <i className="ti ti-building-community"></i>
                      <h3>Multi-Location Group</h3>
                      <p>This client has several locations. Create a group, then add each location inside it.</p>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={createGroup} className="entry-group-form">
                    <div className="field">
                      <label htmlFor="group-client-name">Client / Account Name</label>
                      <input
                        id="group-client-name"
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="e.g. Bright Smiles Dental"
                        autoFocus
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="group-location-count">Expected Number of Locations (optional)</label>
                      <input
                        id="group-location-count"
                        type="number"
                        min="1"
                        value={expectedLocationCount}
                        onChange={(e) => setExpectedLocationCount(e.target.value)}
                        placeholder="e.g. 5"
                      />
                      <div className="hint">Just for tracking progress. You can add locations one at a time regardless, and this is editable later.</div>
                    </div>
                    {error && (
                      <div className="info-box error">
                        <i className="ti ti-alert-circle"></i>
                        {error}
                      </div>
                    )}
                    <div className="nav-row">
                      <button type="button" className="btn" onClick={() => setChoice(null)} disabled={creating}>
                        <i className="ti ti-arrow-left"></i> Back
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={creating || !clientName.trim()}>
                        {creating ? 'Creating…' : 'Create Group'} <i className="ti ti-arrow-right"></i>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </CustomScrollbar>
      </main>
    </div>
  )
}
