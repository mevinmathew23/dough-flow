import { Account, Category, Transaction, TransactionType } from '../../types'
import { inputClass } from '../../constants/styles'
import ErrorAlert from '../ErrorAlert'
import Modal from '../Modal'

interface TransactionFormState {
  account_id: string
  date: string
  amount: string
  description: string
  category_id: string
  type: TransactionType
}

interface TransactionFormModalProps {
  open: boolean
  editing: Transaction | null
  form: TransactionFormState
  formError: string
  accounts: Account[]
  categories: Category[]
  onClose: () => void
  setForm: (form: TransactionFormState) => void
  onSubmit: (e: React.FormEvent) => Promise<void>
}

export default function TransactionFormModal({
  open,
  editing,
  form,
  formError,
  accounts,
  categories,
  onClose,
  setForm,
  onSubmit,
}: TransactionFormModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Transaction' : 'Add Transaction'}>
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
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className={inputClass}
          required
        />
        <input
          type="text"
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className={inputClass}
          required
        />
        <input
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Amount"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          className={inputClass}
          required
        />
        <select
          value={form.type}
          onChange={(e) =>
            setForm({ ...form, type: e.target.value as TransactionType, category_id: '' })
          }
          className={inputClass}
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="transfer">Transfer</option>
          <option value="payment">Payment</option>
          <option value="adjustment">Adjustment</option>
        </select>
        <select
          value={form.category_id}
          onChange={(e) => setForm({ ...form, category_id: e.target.value })}
          className={inputClass}
        >
          <option value="">No category</option>
          {categories
            .filter(
              (c) =>
                c.type === form.type ||
                form.type === 'transfer' ||
                form.type === 'payment' ||
                form.type === 'adjustment',
            )
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
        </select>
        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          {editing ? 'Save Changes' : 'Add Transaction'}
        </button>
      </form>
    </Modal>
  )
}
