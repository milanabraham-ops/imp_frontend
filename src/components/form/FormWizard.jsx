import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import './form.css'
import { initialFormData, TOTAL_STEPS } from '../../data/options'
import { useAuth, API_URL } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../context/ToastContext'
import { useFormDraft } from '../../hooks/useFormDraft'
import Sidebar from '../common/Sidebar'
import TopUserBar from '../common/TopUserBar'
import CustomScrollbar from '../common/CustomScrollbar'
import ProgressBar from './ProgressBar'
import SuccessScreen from './SuccessScreen'
import Step1Account from './steps/Step1Account'
import Step2PhoneHours from './steps/Step2PhoneHours'
import Step3CallFlow from './steps/Step3CallFlow'
import Step4Audio from './steps/Step4Audio'
import Step5RingQueue from './steps/Step5RingQueue'
import Step6Devices from './steps/Step6Devices'
import Step7Workflows from './steps/Step7Workflows'
import Step8LinksPms from './steps/Step8LinksPms'
import Step9Review from './steps/Step9Review'

export default function FormWizard({ mode = 'create' }) {
  const isEditMode = mode === 'edit'
  const { id, groupId } = useParams()
  const [searchParams] = useSearchParams()
  const cloneFromId = searchParams.get('cloneFrom')
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const { theme } = useTheme()
  const { showToast } = useToast()

  const [data, setData] = useState(initialFormData)
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [done, setDone] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(isEditMode || !!groupId)
  const [loadError, setLoadError] = useState('')
  const [groupInfo, setGroupInfo] = useState(null)
  const scrollRef = useRef(null)
  const scrollToTop = () => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })

  // Autosave only applies to a brand-new submission being drafted in this browser — an edit-mode
  // load of a real, already-saved submission must never be shadowed by a stale localStorage draft.
  const { pendingDraft, restoreDraft, discardDraft, clearDraft } = useFormDraft({
    enabled: !isEditMode,
    data,
    step,
    blankData: initialFormData,
  })

  const handleRestoreDraft = () => {
    const draft = restoreDraft()
    if (!draft) return
    setData((prev) => ({ ...prev, ...draft.data }))
    if (typeof draft.step === 'number') {
      setStep(Math.max(0, Math.min(TOTAL_STEPS - 1, draft.step)))
    }
  }

  const loadExisting = useCallback(async () => {
    setLoadingExisting(true)
    setLoadError('')
    try {
      const res = await apiFetch(`${API_URL}/submissions/${id}`)
      if (!res.ok) throw new Error('Could not load this submission')
      const body = await res.json()
      setData((prev) => ({ ...prev, ...body }))
    } catch (err) {
      setLoadError(err.message || 'Could not load this submission')
    } finally {
      setLoadingExisting(false)
    }
  }, [id])

  const loadGroupContext = useCallback(async () => {
    setLoadingExisting(true)
    setLoadError('')
    try {
      const groupRes = await apiFetch(`${API_URL}/groups/${groupId}`)
      if (!groupRes.ok) throw new Error('Could not load this group')
      const group = await groupRes.json()
      setGroupInfo(group)

      let patch = { clientName: group.clientName }
      if (cloneFromId) {
        const cloneRes = await apiFetch(`${API_URL}/submissions/${cloneFromId}`)
        if (cloneRes.ok) {
          const src = await cloneRes.json()
          const {
            _id,
            owner: _owner,
            group: _srcGroup,
            createdAt: _createdAt,
            updatedAt: _updatedAt,
            accountOnboarded: _accountOnboarded,
            configurationStatus: _configurationStatus,
            implementationSpecialist: _implementationSpecialist,
            locationName: _locationName,
            ...rest
          } = src
          patch = { ...rest, clientName: group.clientName }
        }
      }
      setData((prev) => ({ ...prev, ...patch }))
    } catch (err) {
      setLoadError(err.message || 'Could not load this group')
    } finally {
      setLoadingExisting(false)
    }
  }, [groupId, cloneFromId])

  const retryLoad = isEditMode ? loadExisting : loadGroupContext

  useEffect(() => {
    if (isEditMode) {
      loadExisting()
    } else if (groupId) {
      loadGroupContext()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, id, groupId, cloneFromId, token])

  useEffect(() => {
    if (isEditMode || !user?.name) return
    setData((prev) => (prev.poc ? prev : { ...prev, poc: user.name }))
  }, [isEditMode, user])

  useEffect(() => {
    if (data.environment !== 'CS Voicestack') return
    setData((prev) => (prev.textUnification ? prev : { ...prev, textUnification: 'Yes' }))
  }, [data.environment])

  // CS Voicestack accounts are, by definition, connected to the CareStack PMS (that's what the
  // "CS" prefix means). Unlike Text Unification above, this one also clears back to blank when
  // switching away from CS Voicestack — otherwise toggling Environment back and forth leaves a
  // stale "CareStack" sitting in the field. Only clears a value that matches exactly what this
  // effect itself would have set, and only while creating — never touches a real saved value
  // while editing an existing submission.
  useEffect(() => {
    if (isEditMode) return
    if (data.environment === 'CS Voicestack') {
      setData((prev) => (prev.pms ? prev : { ...prev, pms: 'CareStack' }))
    } else {
      setData((prev) => (prev.pms === 'CareStack' ? { ...prev, pms: '' } : prev))
    }
  }, [isEditMode, data.environment])

  const update = (keyOrPatch, value) => {
    if (typeof keyOrPatch === 'object') {
      setData((prev) => ({ ...prev, ...keyOrPatch }))
    } else {
      setData((prev) => ({ ...prev, [keyOrPatch]: value }))
    }
  }

  const goStep = (dir) => {
    if (dir === 1 && step === TOTAL_STEPS - 1) {
      submitForm()
      return
    }
    setStep((s) => Math.max(0, Math.min(TOTAL_STEPS, s + dir)))
    scrollToTop()
  }

  const goToStep = (index) => {
    setStep(index)
    scrollToTop()
  }

  const submitForm = async () => {
    setSubmitError('')
    setSubmitting(true)
    try {
      const url = isEditMode ? `${API_URL}/submissions/${id}` : `${API_URL}/submissions`
      const payload = !isEditMode && groupId ? { ...data, group: groupId } : data
      const res = await apiFetch(url, {
        method: isEditMode ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Submission failed')
      }
      if (!isEditMode) clearDraft()
      setDone(true)
      setStep(TOTAL_STEPS)
      scrollToTop()
      showToast(isEditMode ? 'Changes saved.' : 'Submitted.')
    } catch (err) {
      const message = err.message || 'Something went wrong submitting the form. Please try again.'
      setSubmitError(message)
      showToast(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setData({ ...initialFormData, poc: user?.name || '' })
    setStep(0)
    setDone(false)
  }

  // locationName is only passed for locations that belong to a multi-location group — driveUpload
  // uses its absence as the signal to skip the extra location-level folder nesting for a plain
  // single-location submission (client folder only).
  const isGrouped = Boolean(groupId || data.group)
  const stepProps = { data, update }
  // Only Step4Audio and Step5RingQueue actually upload audio, so only they need these.
  const audioStepProps = {
    ...stepProps,
    apiUrl: API_URL,
    practiceName: data.clientName,
    locationName: isGrouped ? data.locationName : undefined,
  }
  const isLast = step === TOTAL_STEPS - 1

  if ((isEditMode || groupId) && loadingExisting) {
    return (
      <div className="voicestack-form dash-shell" data-theme={theme}>
        <Sidebar />
        <main className="dash-main">
          <CustomScrollbar vertical className="dash-main-scroll" ref={scrollRef}>
            <TopUserBar />
            <div className="page-wrap">
              <div className="card">
                <div className="card-body">
                  <div className="dash-empty">Loading submission…</div>
                </div>
              </div>
            </div>
          </CustomScrollbar>
        </main>
      </div>
    )
  }

  if ((isEditMode || groupId) && loadError) {
    return (
      <div className="voicestack-form dash-shell" data-theme={theme}>
        <Sidebar />
        <main className="dash-main">
          <CustomScrollbar vertical className="dash-main-scroll" ref={scrollRef}>
            <TopUserBar />
            <div className="page-wrap">
              <div className="card">
                <div className="card-body">
                  <div className="info-box error">
                    <i className="ti ti-alert-circle"></i>
                    {loadError}
                    <button type="button" className="btn-sm" style={{ marginLeft: 'auto' }} onClick={() => retryLoad()}>
                      <i className="ti ti-refresh"></i> Retry
                    </button>
                  </div>
                  <button type="button" className="btn" onClick={() => navigate('/')}>
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </CustomScrollbar>
        </main>
      </div>
    )
  }

  return (
    <div className="voicestack-form dash-shell" data-theme={theme}>
      <Sidebar />
      {submitting && (
        <div className="submitting-overlay">
          <div className="spinner"></div>
          <div className="submitting-text">Submitting…</div>
        </div>
      )}

      <main className="dash-main">
        <CustomScrollbar vertical className="dash-main-scroll" ref={scrollRef}>
        <TopUserBar />
        <div className="page-wrap">
          <div className="card">
            <div className="card-header">
              <h1>Implementation Setup</h1>
              <p>{groupId ? `Adding a location to ${groupInfo?.clientName || '…'}` : 'Location-level requirement gathering'}</p>
            </div>
            <div className="card-body">
              {done ? (
                isEditMode ? (
                  <SuccessScreen
                    title="Changes Saved!"
                    buttonLabel={data.group ? 'Back to Group' : 'Back to Dashboard'}
                    buttonIcon="ti-arrow-left"
                    onAction={() => navigate(data.group ? `/groups/${data.group}` : '/')}
                  >
                    Your changes to this submission have been saved.
                  </SuccessScreen>
                ) : groupId ? (
                  <SuccessScreen
                    title="Location Added!"
                    buttonLabel="Back to Group"
                    buttonIcon="ti-arrow-left"
                    onAction={() => navigate(`/groups/${groupId}`)}
                  >
                    This location has been added to {groupInfo?.clientName || 'the group'}.
                  </SuccessScreen>
                ) : (
                  <SuccessScreen onAction={resetForm} />
                )
              ) : (
                <>
                  {pendingDraft && (
                    <div className="info-box">
                      <i className="ti ti-info-circle"></i>
                      <span>
                        You have an unsaved draft{pendingDraft.savedAt ? ` from ${new Date(pendingDraft.savedAt).toLocaleString()}` : ''} — restore
                        it, or discard it and start fresh?
                      </span>
                      <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexShrink: 0 }}>
                        <button type="button" className="btn-sm" onClick={handleRestoreDraft}>
                          Restore
                        </button>
                        <button type="button" className="btn-sm" onClick={discardDraft}>
                          Discard
                        </button>
                      </div>
                    </div>
                  )}
                  <ProgressBar current={step} onStepClick={goToStep} />

                  {step === 0 && <Step1Account {...stepProps} />}
                  {step === 1 && <Step2PhoneHours {...stepProps} />}
                  {step === 2 && <Step3CallFlow {...stepProps} />}
                  {step === 3 && <Step4Audio {...audioStepProps} />}
                  {step === 4 && <Step5RingQueue {...audioStepProps} />}
                  {step === 5 && <Step6Devices {...stepProps} />}
                  {step === 6 && <Step7Workflows {...stepProps} />}
                  {step === 7 && <Step8LinksPms {...stepProps} />}
                  {step === 8 && <Step9Review data={data} update={update} goToStep={goToStep} isEditMode={isEditMode} />}

                  {submitError && (
                    <div className="info-box error">
                      <i className="ti ti-alert-circle"></i>
                      {submitError}
                    </div>
                  )}

                  <div className="nav-row">
                    <button type="button" className="btn" onClick={() => goStep(-1)} disabled={step === 0}>
                      <i className="ti ti-arrow-left"></i> Back
                    </button>
                    <span className="step-counter">
                      Step {step + 1} of {TOTAL_STEPS}
                    </span>
                    <button type="button" className="btn btn-primary" onClick={() => goStep(1)} disabled={submitting}>
                      {isLast ? (
                        <>
                          <i className="ti ti-send"></i> {isEditMode ? 'Save Changes' : 'Submit'}
                        </>
                      ) : (
                        <>
                          Next <i className="ti ti-arrow-right"></i>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        </CustomScrollbar>
      </main>
    </div>
  )
}
