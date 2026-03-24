import { useEffect, useRef, useState } from 'react'
import { useCurrency } from '../contexts/CurrencyContext'

function getCurrencySymbol(currency: string): string {
  return (
    new Intl.NumberFormat('en-US', { style: 'currency', currency })
      .formatToParts(0)
      .find((p) => p.type === 'currency')?.value ?? '$'
  )
}

function formatWithCommas(value: string): string {
  if (!value) return ''
  const negative = value.startsWith('-')
  const stripped = value.replace(/[^0-9.]/g, '')
  const parts = stripped.split('.')
  const intPart = parts[0].replace(/^0+(?=\d)/, '') || '0'
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const result = parts.length > 1 ? `${formatted}.${parts[1].slice(0, 2)}` : formatted
  return negative ? `-${result}` : result
}

function stripFormatting(value: string): string {
  return value.replace(/,/g, '')
}

export default function MoneyInput({
  value,
  onChange,
  placeholder,
  className,
  required,
  allowNegative = false,
}: {
  value: string
  onChange: (rawValue: string) => void
  placeholder?: string
  className?: string
  required?: boolean
  allowNegative?: boolean
}) {
  const { currency } = useCurrency()
  const symbol = getCurrencySymbol(currency)
  const [display, setDisplay] = useState(() => formatWithCommas(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDisplay(formatWithCommas(value))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const allowed = allowNegative ? /[^0-9.,-]/g : /[^0-9.,]/g
    const cleaned = raw.replace(allowed, '')
    const unformatted = stripFormatting(cleaned)

    // Prevent multiple dots
    const dotCount = (unformatted.match(/\./g) || []).length
    if (dotCount > 1) return

    const formatted = formatWithCommas(unformatted)
    setDisplay(formatted)
    onChange(unformatted)
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
        {symbol}
      </span>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={display}
        onChange={handleChange}
        className={`${className} pl-8`}
        required={required}
      />
    </div>
  )
}
