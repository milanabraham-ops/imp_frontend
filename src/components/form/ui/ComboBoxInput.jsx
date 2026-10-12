import { createPortal } from 'react-dom'
import { useDropdown } from '../../../hooks/useDropdown'
import { useDropdownKeyboardNav } from '../../../hooks/useDropdownKeyboardNav'

// A free-text input with a suggestion menu — unlike a native <datalist>, this always shows every
// option when opened (browsers filter datalist suggestions against whatever's already typed,
// which makes picking a different option require clearing the field first), is positioned with
// plain CSS below the input instead of the browser's own unpredictable popup placement, and is
// portaled to document.body so it isn't clipped if ever used inside a scrolling container.
export default function ComboBoxInput({ value, onChange, options, placeholder, disabled = false }) {
  const { open, setOpen, anchorRef, menuRef, style } = useDropdown()

  const { highlightedIndex, onKeyDown } = useDropdownKeyboardNav({
    open,
    setOpen,
    optionCount: options.length,
    onSelect: (index) => onChange(options[index]),
  })

  const activeId = highlightedIndex >= 0 ? `combobox-option-${highlightedIndex}` : undefined

  return (
    <div className="combobox">
      <input
        ref={anchorRef}
        type="text"
        className="combobox-input"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => !disabled && setOpen(true)}
        onClick={() => !disabled && setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-activedescendant={activeId}
        aria-autocomplete="list"
      />
      {open &&
        createPortal(
          <div className="combobox-menu" ref={menuRef} style={style} role="listbox">
            {options.map((option, index) => (
              <button
                type="button"
                id={`combobox-option-${index}`}
                key={option}
                role="option"
                aria-selected={option === value}
                className={`combobox-option${option === value ? ' active' : ''}${index === highlightedIndex ? ' highlighted' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(option)
                  setOpen(false)
                }}
              >
                {option}
              </button>
            ))}
          </div>,
          // See SelectInput.jsx for why this portals into .voicestack-form rather than
          // document.body — that's where the theme's CSS variables are actually defined.
          anchorRef.current?.closest('.voicestack-form') || document.body,
        )}
    </div>
  )
}
