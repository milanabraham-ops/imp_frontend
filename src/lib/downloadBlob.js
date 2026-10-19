// Triggers a browser "save as" for an in-memory blob (an exported file response), there's no
// direct "download this blob" browser API, a temporary anchor click is the standard workaround.
export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}
