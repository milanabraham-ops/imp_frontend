import { useRef, useState } from 'react'
import { API_URL } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'
import { useToast } from '../../context/ToastContext'

// Test feature (see checkpoint tag `checkpoint-before-phone-sheet-v2`) — upload-only, never typed
// directly into the app: download the template (phone-info-sheet-template.xlsx, a two-tab
// workbook — Devices sheet, Agents sheet), fill it in, upload it back here. A .csv with the same
// two tables stacked (blank line between) also still parses, for anyone who'd rather hand-edit
// plain text. Works both before this location has been submitted yet (parsed statelessly, staged
// like any other Step 6 field — see submissionController's parsePhoneSheet) and after (parsed
// AND saved in one step, via submissionId). Either way the result is shown read-only below.
export default function PhoneInfoSheetSection({ submissionId, devices, agents, onDevicesChange, onAgentsChange }) {
  const { showToast } = useToast()
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const upload = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const url = submissionId ? `${API_URL}/submissions/${submissionId}/phone-sheet/upload` : `${API_URL}/submissions/phone-sheet/parse`
      const res = await apiFetch(url, { method: 'POST', body: formData })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to upload CSV')

      const newDevices = submissionId ? body.phoneSheetDevices : body.devices
      const newAgents = submissionId ? body.phoneSheetAgents : body.agents
      onDevicesChange(newDevices || [])
      onAgentsChange(newAgents || [])
      showToast(`Uploaded (${newDevices?.length || 0} device row(s), ${newAgents?.length || 0} agent row(s)).`)
    } catch (err) {
      showToast(err.message || 'Failed to upload CSV', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="hint" style={{ marginBottom: 10 }}>
        {devices.length} device{devices.length === 1 ? '' : 's'} · {agents.length} agent{agents.length === 1 ? '' : 's'} captured so far. Fill in the
        template (Devices and Agents are separate tabs) and upload it back — .xlsx or .csv both work.
      </div>

      <div className="dash-table-toolbar" style={{ marginBottom: 10 }}>
        <a className="btn-sm" href="/phone-info-sheet-template.xlsx" download>
          <i className="ti ti-download"></i> Download Template
        </a>
        <button type="button" className="btn-sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
          <i className="ti ti-upload"></i> {uploading ? 'Uploading…' : 'Upload Phone Info Sheet'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          hidden
          onChange={(e) => {
            upload(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      {devices.length > 0 && (
        <div className="dash-table-scroll" style={{ marginBottom: 10 }}>
          <table className="dash-table">
            <thead>
              <tr>
                <th>Make</th>
                <th>Model</th>
                <th>MAC</th>
                <th>Serial</th>
                <th>IPUI</th>
                <th>Assignment</th>
                <th>Extension</th>
                <th>Hot Desking</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d, idx) => (
                // eslint-disable-next-line react/no-array-index-key
                <tr key={d._id || idx}>
                  <td>{d.deviceMake}</td>
                  <td>{d.deviceModel}</td>
                  <td>{d.mac}</td>
                  <td>{d.serial}</td>
                  <td>{d.ipuiCode}</td>
                  <td>{d.assignment}</td>
                  <td>{d.extension}</td>
                  <td>{d.hotDesking ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {agents.length > 0 && (
        <div className="dash-table-scroll">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Admin User</th>
                <th>Extension</th>
                <th>Hot Desking User</th>
                <th>Fax Access</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a, idx) => (
                // eslint-disable-next-line react/no-array-index-key
                <tr key={a._id || idx}>
                  <td>{a.name}</td>
                  <td>{a.email}</td>
                  <td>{a.isAdminUser ? 'Yes' : 'No'}</td>
                  <td>{a.extension}</td>
                  <td>{a.hotDeskingUser ? 'Yes' : 'No'}</td>
                  <td>{a.faxAccess ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
