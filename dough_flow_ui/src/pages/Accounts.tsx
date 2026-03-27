import { useEffect, useState } from 'react'
import api from '../api/client'
import Modal from '../components/Modal'
import MoneyInput from '../components/MoneyInput'
import { useCurrency } from '../contexts/CurrencyContext'
import { Account, AccountType, CompoundingFrequency } from '../types'

const ACCOUNT_TYPES: AccountType[] = [
  'checking',
  'savings',
  'credit',
  'investment',
  'loan',
  'retirement',
]

const COMPOUNDING_OPTIONS: CompoundingFrequency[] = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'bimonthly',
  'quarterly',
  'semiannually',
  'annually',
]

const COMPOUNDING_LABELS: Record<CompoundingFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  bimonthly: 'Bimonthly',
  quarterly: 'Quarterly',
  semiannually: 'Semiannually',
  annually: 'Annually',
}

const TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit: 'Credit',
  investment: 'Investment',
  loan: 'Loan',
  retirement: 'Retirement',
}

const TYPE_COLORS: Record<AccountType, string> = {
  checking: 'bg-blue-500/10 text-blue-400',
  savings: 'bg-green-500/10 text-green-400',
  credit: 'bg-red-500/10 text-red-400',
  investment: 'bg-purple-500/10 text-purple-400',
  loan: 'bg-orange-500/10 text-orange-400',
  retirement: 'bg-teal-500/10 text-teal-400',
}

function isDebtType(type: AccountType): boolean {
  return type === 'credit' || type === 'loan'
}

function formatInterestDisplay(rate: number): string {
  return (rate * 100).toFixed(1)
}

export default function Accounts() {
  const { formatCurrency } = useCurrency()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [form, setForm] = useState({
    name: '',
    type: 'checking' as AccountType,
    institution: '',
    balance: '',
    interest_rate: '',
    minimumPayment: '',
    compoundingFrequency: '' as CompoundingFrequency | '',
  })
  const [error, setError] = useState('')

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounts')
      setAccounts(res.data)
      setError('')
    } catch {
      setError('Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({
      name: '',
      type: 'checking',
      institution: '',
      balance: '',
      interest_rate: '',
      minimumPayment: '',
      compoundingFrequency: '',
    })
    setError('')
    setModalOpen(true)
  }

  const openEdit = (account: Account) => {
    setEditing(account)
    setForm({
      name: account.name,
      type: account.type,
      institution: account.institution,
      balance: String(account.balance),
      interest_rate: account.interest_rate != null ? String(account.interest_rate * 100) : '',
      minimumPayment: '',
      compoundingFrequency: '',
    })
    setError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const interestRateDecimal = form.interest_rate ? parseFloat(form.interest_rate) / 100 : null

    const basePayload = {
      name: form.name,
      type: form.type,
      institution: form.institution,
      balance: parseFloat(form.balance) || 0,
      interest_rate: interestRateDecimal,
    }

    try {
      if (editing) {
        await api.patch(`/accounts/${editing.id}`, {
          name: basePayload.name,
          institution: basePayload.institution,
          balance: basePayload.balance,
          interest_rate: basePayload.interest_rate,
        })
      } else {
        const createPayload: Record<string, unknown> = { ...basePayload }
        if (isDebtType(form.type)) {
          if (form.minimumPayment) {
            createPayload.minimum_payment = parseFloat(form.minimumPayment)
          }
          if (form.compoundingFrequency) {
            createPayload.compounding_frequency = form.compoundingFrequency
          }
        }
        await api.post('/accounts', createPayload)
      }
      setModalOpen(false)
      await fetchAccounts()
    } catch {
      setError(editing ? 'Failed to update account' : 'Failed to create account')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this account? This cannot be undone.')) return
    try {
      await api.delete(`/accounts/${id}`)
      await fetchAccounts()
    } catch {
      setError('Failed to delete account')
    }
  }

  const grouped = ACCOUNT_TYPES.map((type) => ({
    type,
    accounts: accounts.filter((a) => a.type === type),
  })).filter((g) => g.accounts.length > 0)

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0)

  if (loading) {
    return <div className="text-slate-400">Loading accounts...</div>
  }

  const inputClass =
    'bg-navy-850 border border-navy-750 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 w-full'

  const interestLabel = isDebtType(form.type) ? 'APR (Interest Charged)' : 'APY (Interest Earned)'
  const interestColor = isDebtType(form.type) ? 'text-red-400' : 'text-green-400'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display">Accounts</h1>
          <p className="text-slate-400 text-sm mt-1">
            Total balance: <span className="font-mono">{formatCurrency(totalBalance)}</span>
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          Add Account
        </button>
      </div>

      {error && !modalOpen && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {accounts.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg mb-2">No accounts yet</p>
          <p className="text-sm">Add your first account to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ type, accounts: groupAccounts }) => (
            <div key={type}>
              <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3 font-display">
                {TYPE_LABELS[type]}
              </h2>
              <div className="space-y-2">
                {groupAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between bg-navy-900 border border-navy-800 rounded-lg px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="text-sm font-medium">{account.name}</div>
                        <div className="text-xs text-slate-400">
                          {account.institution}
                          {account.interest_rate != null && account.interest_rate > 0 && (
                            <span
                              className={`ml-2 ${isDebtType(account.type) ? 'text-red-400' : 'text-green-400'}`}
                            >
                              {formatInterestDisplay(account.interest_rate)}%{' '}
                              {isDebtType(account.type) ? 'APR' : 'APY'}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`${TYPE_COLORS[account.type]} px-2 py-0.5 rounded-full text-xs`}
                      >
                        {TYPE_LABELS[account.type]}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`text-sm font-medium font-mono ${account.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}
                      >
                        {formatCurrency(account.balance)}
                      </span>
                      <button
                        onClick={() => openEdit(account)}
                        className="text-slate-400 hover:text-white text-sm cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        className="text-slate-400 hover:text-red-400 text-sm cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Account' : 'Add Account'}
      >
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Account name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
            required
          />
          {!editing && (
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}
              className={inputClass}
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          )}
          <input
            type="text"
            placeholder="Institution (e.g. Chase)"
            value={form.institution}
            onChange={(e) => setForm({ ...form, institution: e.target.value })}
            className={inputClass}
            required
          />
          <MoneyInput
            placeholder="Balance"
            value={form.balance}
            onChange={(val) => setForm({ ...form, balance: val })}
            className={inputClass}
            required
            allowNegative
          />
          <div>
            <label className={`text-xs font-medium mb-1 block ${interestColor}`}>
              {interestLabel}
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 4.9"
                value={form.interest_rate}
                onChange={(e) => setForm({ ...form, interest_rate: e.target.value })}
                className={`${inputClass} pr-8`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                %
              </span>
            </div>
          </div>
          {!editing && isDebtType(form.type) && (
            <>
              <MoneyInput
                placeholder="Minimum payment (optional)"
                value={form.minimumPayment}
                onChange={(val) => setForm({ ...form, minimumPayment: val })}
                className={inputClass}
              />
              <div>
                <label className="text-xs font-medium mb-1 block text-slate-400">
                  Compounding Frequency
                </label>
                <select
                  value={form.compoundingFrequency}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      compoundingFrequency: e.target.value as CompoundingFrequency,
                    })
                  }
                  className={inputClass}
                >
                  <option value="" disabled>
                    Select frequency
                  </option>
                  {COMPOUNDING_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {COMPOUNDING_LABELS[opt]}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            {editing ? 'Save Changes' : 'Add Account'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
