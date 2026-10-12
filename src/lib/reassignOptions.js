// Shared by the QA Agent / Specialist reassignment dropdowns — the current holder's own name is
// always included even if they've since left the agent list (role changed, account removed), so
// their own selection never silently disappears out from under them.
export function reassignOptions(agentNames, current) {
  const names = Array.from(new Set([...(agentNames || []), current].filter(Boolean)))
  return [{ value: '', label: 'Unassigned (release)' }, ...names.map((name) => ({ value: name, label: name }))]
}
