import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// Shared positioning + dismissal logic for SelectInput/ComboBoxInput's popup menus. The menu is
// rendered via a portal into document.body (see both components) so it can visually escape an
// ancestor with overflow:auto/hidden — e.g. a horizontally-scrolling table wrapper — which a
// plain position:absolute child never can, since it's still clipped by that ancestor regardless.
// position:fixed + getBoundingClientRect() coordinates place it correctly without that problem;
// scrolling while open just closes it rather than trying to track the anchor in real time.
export function useDropdown() {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef(null)
  const menuRef = useRef(null)
  const [style, setStyle] = useState(null)

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return

    const measure = () => {
      const rect = anchorRef.current.getBoundingClientRect()
      const width = Math.max(rect.width, 160)
      const margin = 8
      // The forced 160px minimum can be wider than a narrow table cell's own trigger — without
      // clamping, that extra width (or a trigger sitting near the edge of the viewport/scroll
      // wrapper) pushes the menu past the viewport edge, where it visually bleeds into whatever's
      // next to it instead of sitting cleanly under the field.
      let left = rect.left
      if (left + width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - margin - width)

      const next = { position: 'fixed', left, minWidth: width }
      // Same idea vertically: if there isn't reasonable room below the trigger (and there's more
      // room above), open upward from the trigger's top instead of downward off the bottom edge.
      const spaceBelow = window.innerHeight - rect.bottom
      if (spaceBelow < 160 && rect.top > spaceBelow) next.bottom = window.innerHeight - rect.top + 4
      else next.top = rect.bottom + 4
      setStyle(next)
    }

    measure()
    // A field opened for the first time on a freshly-loaded page can still have layout settling
    // underneath it right after this runs (an icon font swapping in, the browser auto-scrolling a
    // just-focused field into view) — this one's measured before that happens, so it lands off.
    // Re-measuring a frame later catches that without affecting the (already-correct) second open.
    const raf = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(raf)
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onClickAway = (e) => {
      if (anchorRef.current?.contains(e.target)) return
      if (menuRef.current?.contains(e.target)) return
      setOpen(false)
    }
    // Scrolling the menu's own option list (it's internally scrollable — see .combobox-menu's
    // max-height/overflow-y) fires a real scroll event too, and since scroll events don't bubble,
    // this capture-phase listener hears it just like it hears an ancestor scrolling. Without
    // excluding it, trying to scroll the open menu closed it on the very first scroll tick,
    // before any more options could come into view — so this only closes for a scroll that
    // happened somewhere else (an ancestor, e.g. the table's own horizontal scroller), where the
    // menu's fixed position has actually gone stale.
    const onScroll = (e) => {
      if (menuRef.current?.contains(e.target)) return
      close()
    }
    document.addEventListener('mousedown', onClickAway)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', onClickAway)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return { open, setOpen, anchorRef, menuRef, style }
}
