import { inputClass } from '../constants/styles'

export default function FormInput({
  label,
  id,
  ...props
}: {
  label: string
  id: string
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-slate-400 mb-1">
        {label}
      </label>
      <input id={id} className={inputClass} {...props} />
    </div>
  )
}
