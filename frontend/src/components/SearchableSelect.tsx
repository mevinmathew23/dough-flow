import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'

interface Option {
  value: string
  label: string
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Search...',
}: {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        o.value.toLowerCase().includes(query.toLowerCase()),
      )
    : options

  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  const handleSelect = (val: string) => {
    onChange(val)
    setOpen(false)
    setQuery('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
    if (e.key === 'Enter' && filtered.length === 1) {
      handleSelect(filtered[0].value)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-2 bg-navy-850 border border-navy-750 rounded-lg px-3 py-2 text-sm w-64 text-left cursor-pointer hover:border-navy-700 transition-colors focus:outline-none focus:border-emerald-500"
      >
        <span className={selected ? 'text-slate-100' : 'text-slate-500'}>
          {selected ? selected.label : 'Select...'}
        </span>
        <ChevronDown size={14} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-72 bg-navy-900 border border-navy-800 rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden">
          <div className="p-2 border-b border-navy-800">
            <div className="flex items-center gap-2 bg-navy-850 rounded-lg px-3 py-2">
              <Search size={14} className="text-slate-500 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none w-full"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500">No results</div>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full text-left px-3 py-2 text-sm cursor-pointer transition-colors ${
                    option.value === value
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'text-slate-300 hover:bg-navy-850'
                  }`}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
