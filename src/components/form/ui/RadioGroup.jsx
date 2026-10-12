export default function RadioGroup({ name, options, value, onChange, row = false, disabled = false }) {
  return (
    <div className={row ? 'radio-group row' : 'radio-group'}>
      {options.map((opt) => {
        const optValue = typeof opt === 'string' ? opt : opt.value
        const optLabel = typeof opt === 'string' ? opt : opt.label
        const checked = value === optValue
        return (
          <label key={optValue} className={`${checked ? 'sel' : ''}${disabled ? ' disabled' : ''}`}>
            <input
              type="radio"
              name={name}
              value={optValue}
              checked={checked}
              disabled={disabled}
              onChange={() => onChange(optValue)}
            />
            {optLabel}
          </label>
        )
      })}
    </div>
  )
}
