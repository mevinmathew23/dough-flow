import { buttonDangerClass, buttonOutlineClass, buttonPrimaryClass } from '../constants/styles'

const variantClasses = {
  primary: buttonPrimaryClass,
  danger: buttonDangerClass,
  outline: buttonOutlineClass,
}

export default function Button({
  variant = 'primary',
  loading = false,
  children,
  ...props
}: {
  variant?: 'primary' | 'danger' | 'outline'
  loading?: boolean
  children: React.ReactNode
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'>) {
  return (
    <button
      className={`${variantClasses[variant]} ${loading || props.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? 'Saving...' : children}
    </button>
  )
}
