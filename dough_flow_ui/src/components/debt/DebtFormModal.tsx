import { Account, CompoundingFrequency, Debt } from '../../types'
import { COMPOUNDING_LABELS, COMPOUNDING_OPTIONS } from '../../constants/finance'
import { inputClass } from '../../constants/styles'
import { DebtFormState } from '../../hooks/useDebtData'
import ErrorAlert from '../ErrorAlert'
import Modal from '../Modal'

interface DebtFormModalProps {
  open: boolean
  editing: Debt | null
  form: DebtFormState
  formError: string
  accounts: Account[]
  onClose: () => void
  setForm: (form: DebtFormState) => void
  onSubmit: (e: React.FormEvent) => Promise<void>
}

export default function DebtFormModal({
  open,
  editing,
  form,
  formError,
  accounts,
  onClose,
  setForm,
  onSubmit,
}: DebtFormModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Debt' : 'Add Debt'}>
      <ErrorAlert message={formError} />
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {!editing && (
          <select
            value={form.account_id}
            onChange={(e) => setForm({ ...form, account_id: e.target.value })}
            className={inputClass}
            required
          >
            <option value="" disabled>
              Select account
            </option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        )}
        {!editing && (
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Principal amount (original loan)"
            value={form.principal_amount}
            onChange={(e) => setForm({ ...form, principal_amount: e.target.value })}
            className={inputClass}
            required
          />
        )}
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="Current balance"
          value={form.current_balance}
          onChange={(e) => setForm({ ...form, current_balance: e.target.value })}
          className={inputClass}
          required
        />
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="Interest rate % (e.g. 4.99)"
          value={form.interest_rate}
          onChange={(e) => setForm({ ...form, interest_rate: e.target.value })}
          className={inputClass}
          required
        />
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="Minimum monthly payment"
          value={form.minimum_payment}
          onChange={(e) => setForm({ ...form, minimum_payment: e.target.value })}
          className={inputClass}
          required
        />
        <select
          value={form.compounding_frequency}
          onChange={(e) =>
            setForm({ ...form, compounding_frequency: e.target.value as CompoundingFrequency })
          }
          className={inputClass}
        >
          {COMPOUNDING_OPTIONS.map((freq) => (
            <option key={freq} value={freq}>
              {COMPOUNDING_LABELS[freq]}
            </option>
          ))}
        </select>
        <input
          type="number"
          step="1"
          min="1"
          placeholder="Priority order (1 = highest)"
          value={form.priority_order}
          onChange={(e) => setForm({ ...form, priority_order: e.target.value })}
          className={inputClass}
          required
        />
        <input
          type="date"
          placeholder="Target payoff date (optional)"
          value={form.target_payoff_date}
          onChange={(e) => setForm({ ...form, target_payoff_date: e.target.value })}
          className={inputClass}
        />
        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          {editing ? 'Save Changes' : 'Add Debt'}
        </button>
      </form>
    </Modal>
  )
}
