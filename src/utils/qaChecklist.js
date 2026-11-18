// A checklist row saved before error and clarification could both apply to the same item carried
// a single `status` ('error' or 'clarification') and one `note`. Normalizing here means every
// other file only ever deals with the new independent-flag shape (hasError/errorNote,
// hasClarification/clarificationNote, status now only ever 'ok'/'na'/''); the next save rewrites
// any old row into that shape for good, no upfront data migration needed.
export function normalizeChecklistRow(row) {
  if (!row) return { item: '', status: '', hasError: false, errorNote: '', hasClarification: false, clarificationNote: '' }
  const hasError = Boolean(row.hasError) || row.status === 'error'
  const hasClarification = Boolean(row.hasClarification) || row.status === 'clarification'
  return {
    item: row.item,
    status: row.status === 'error' || row.status === 'clarification' ? '' : row.status || '',
    hasError,
    errorNote: row.errorNote || (row.status === 'error' ? row.note : '') || '',
    hasClarification,
    clarificationNote: row.clarificationNote || (row.status === 'clarification' ? row.note : '') || '',
  }
}
