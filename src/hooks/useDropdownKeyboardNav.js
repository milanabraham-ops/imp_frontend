import { useEffect, useState } from 'react'

// Arrow-key navigation + Enter-to-select + Escape-to-close for the app's custom dropdown menus
// (SelectInput/ComboBoxInput) — a native <select> gets all of this for free from the browser;
// these hand-built replacements (real HTML/CSS so they can actually be positioned/styled, see
// useDropdown.js) need it wired up explicitly, or a keyboard-only user can open the menu but never
// move through or choose an option in it. Wrapping navigation (past the last option jumps to the
// first, and vice versa) — standard listbox behavior.
export function useDropdownKeyboardNav({ open, setOpen, optionCount, onSelect }) {
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  // Starts fresh (nothing highlighted) every time the menu opens, rather than remembering
  // wherever it was left last time — the currently-selected option is already visually marked
  // `.active` independent of this, so there's no need to also land the keyboard highlight there.
  useEffect(() => {
    if (open) setHighlightedIndex(-1)
  }, [open])

  const onKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((i) => (i + 1 >= optionCount ? 0 : i + 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((i) => (i - 1 < 0 ? optionCount - 1 : i - 1))
        break
      case 'Home':
        e.preventDefault()
        setHighlightedIndex(0)
        break
      case 'End':
        e.preventDefault()
        setHighlightedIndex(optionCount - 1)
        break
      case 'Enter':
        if (highlightedIndex >= 0 && highlightedIndex < optionCount) {
          e.preventDefault()
          onSelect(highlightedIndex)
          setOpen(false)
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
      default:
        break
    }
  }

  return { highlightedIndex, onKeyDown }
}
