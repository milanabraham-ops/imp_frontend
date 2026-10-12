export default function SuccessScreen({
  title = 'Submitted Successfully!',
  buttonLabel = 'Submit another',
  buttonIcon = 'ti-plus',
  onAction,
  children,
}) {
  return (
    <div className="success-screen">
      <div className="success-icon">
        <i className="ti ti-check"></i>
      </div>
      <h2>{title}</h2>
      <p>
        {children || (
          <>
            The implementation team will review your details and reach out to confirm next steps.
            <br />
            Your response has been recorded.
          </>
        )}
      </p>
      <button type="button" className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={onAction}>
        <i className={`ti ${buttonIcon}`}></i> {buttonLabel}
      </button>
    </div>
  )
}
