import { selectClass } from '../constants/styles'

export default function FormSelect({
  label,
  id,
  children,
  ...props
}: {
  label: string
  id: string
  children: React.ReactNode
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-slate-400 mb-1">
        {label}
      </label>
      <select id={id} className={selectClass} {...props}>
        {children}
      </select>
    </div>
  )
}
