export function isMine(name, userName) {
  return (name || '').trim().toLowerCase() === (userName || '').trim().toLowerCase()
}
