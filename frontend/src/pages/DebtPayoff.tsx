import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import api from '../api/client'
import Modal from '../components/Modal'
import { useCurrency } from '../contexts/CurrencyContext'
import { Account, CompoundingFrequency, Debt, DebtGroupSummary, PayoffSummary } from '../types'

const COMPOUNDING_FREQUENCIES: CompoundingFrequency[] = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'bimonthly',
  'quarterly',
  'semiannually',
  'annually',
]

const FREQUENCY_LABELS: Record<CompoundingFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  monthly: 'Monthly',
  bimonthly: 'Bi-Monthly',
  quarterly: 'Quarterly',
  semiannually: 'Semi-Annually',
  annually: 'Annually',
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`
}

const emptyForm = {
  account_id: '',
  principal_amount: '',
  current_balance: '',
  interest_rate: '',
  minimum_payment: '',
  compounding_frequency: 'monthly' as CompoundingFrequency,
  priority_order: '1',
  target_payoff_date: '',
}

export default function DebtPayoff() {
  const { formatCurrency } = useCurrency()
  const [debts, setDebts] = useState<Debt[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [groupSummary, setGroupSummary] = useState<DebtGroupSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Debt | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')

  const [extraMonthly, setExtraMonthly] = useState(0)
  const [payoffSummary, setPayoffSummary] = useState<PayoffSummary | null>(null)
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null)
  const [simulatorLoading, setSimulatorLoading] = useState(false)

  const fetchAll = async () => {
    try {
      const [debtsRes, accountsRes, groupRes] = await Promise.all([
        api.get('/debts'),
        api.get('/accounts'),
        api.get('/debts/grouped'),
      ])
      setDebts(debtsRes.data)
      setAccounts(accountsRes.data)
      setGroupSummary(groupRes.data)
      setError('')
    } catch {
      setError('Failed to load debt data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    if (debts.length > 0) {
      const fetchInitialPayoff = async () => {
        setSimulatorLoading(true)
        try {
          const res = await api.get(`/debts/payoff?extra_monthly=${extraMonthly}`)
          setPayoffSummary(res.data)
        } catch {
          // non-critical
        } finally {
          setSimulatorLoading(false)
        }
      }
      fetchInitialPayoff()
    }
  }, [debts.length])

  const fetchPayoff = async (extra: number) => {
    if (debts.length === 0) return
    setSimulatorLoading(true)
    try {
      const res = await api.get(`/debts/payoff?extra_monthly=${extra}`)
      setPayoffSummary(res.data)
    } catch {
      // non-critical
    } finally {
      setSimulatorLoading(false)
    }
  }

  const handleExtraChange = (value: number) => {
    fetchPayoff(value)
  }

  const getProjection = (debtId: string) =>
    payoffSummary?.projections.find((p) => p.debt_id === debtId) ?? null

  const getAccountName = (accountId: string): string => {
    const acct = accounts.find((a) => a.id === accountId)
    return acct ? acct.name : '—'
  }

  const openCreate = () => {
    setEditing(null)
    setForm({
      ...emptyForm,
      account_id: accounts.length > 0 ? accounts[0].id : '',
      priority_order: String(debts.length + 1),
    })
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (debt: Debt) => {
    setEditing(debt)
    setForm({
      account_id: debt.account_id,
      principal_amount: String(debt.principal_amount),
      current_balance: String(debt.current_balance),
      interest_rate: String(debt.interest_rate),
      minimum_payment: String(debt.minimum_payment),
      compounding_frequency: debt.compounding_frequency,
      priority_order: String(debt.priority_order),
      target_payoff_date: debt.target_payoff_date ?? '',
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const currentBalance = parseFloat(form.current_balance)
    const interestRate = parseFloat(form.interest_rate)
    const minimumPayment = parseFloat(form.minimum_payment)
    const priorityOrder = parseInt(form.priority_order)

    if (isNaN(currentBalance) || currentBalance < 0) {
      setFormError('Current balance must be a valid number')
      return
    }
    if (isNaN(interestRate) || interestRate < 0) {
      setFormError('Interest rate must be a valid number')
      return
    }
    if (isNaN(minimumPayment) || minimumPayment < 0) {
      setFormError('Minimum payment must be a valid number')
      return
    }
    if (isNaN(priorityOrder)) {
      setFormError('Priority order must be a valid number')
      return
    }

    try {
      if (editing) {
        await api.patch(`/debts/${editing.id}`, {
          current_balance: currentBalance,
          interest_rate: interestRate,
          minimum_payment: minimumPayment,
          compounding_frequency: form.compounding_frequency,
          priority_order: priorityOrder || 0,
          target_payoff_date: form.target_payoff_date || null,
        })
      } else {
        const principalAmount = parseFloat(form.principal_amount)
        if (isNaN(principalAmount) || principalAmount <= 0) {
          setFormError('Principal amount must be a positive number')
          return
        }
        await api.post('/debts', {
          account_id: form.account_id,
          principal_amount: principalAmount,
          current_balance: currentBalance,
          interest_rate: interestRate,
          minimum_payment: minimumPayment,
          compounding_frequency: form.compounding_frequency,
          priority_order: priorityOrder || 1,
          target_payoff_date: form.target_payoff_date || null,
        })
      }
      setModalOpen(false)
      await fetchAll()
    } catch {
      setFormError(editing ? 'Failed to update debt' : 'Failed to create debt')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this debt? This cannot be undone.')) return
    try {
      await api.delete(`/debts/${id}`)
      await fetchAll()
    } catch {
      setError('Failed to delete debt')
    }
  }

  const sortedDebts = [...debts].sort((a, b) => a.priority_order - b.priority_order)

  const inputClass =
    'bg-navy-850 border border-navy-750 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 w-full'

  if (loading) {
    return <div className="text-slate-400">Loading debts...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display">Debt Payoff</h1>
          <p className="text-slate-400 text-sm mt-1">
            Track and prioritize your debts to pay them off faster
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          Add Debt
        </button>
      </div>

      {error && !modalOpen && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {debts.length > 0 && groupSummary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total Debt</p>
            <p className="text-xl font-bold text-red-400 font-mono">
              {formatCurrency(groupSummary.total_current_balance)}
            </p>
          </div>
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Original Principal</p>
            <p className="text-xl font-bold font-mono">{formatCurrency(groupSummary.total_principal)}</p>
          </div>
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Weighted Rate</p>
            <p className="text-xl font-bold text-orange-400 font-mono">
              {formatPercent(groupSummary.weighted_interest_rate)}
            </p>
          </div>
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Monthly Minimum</p>
            <p className="text-xl font-bold font-mono">{formatCurrency(groupSummary.total_minimum_payment)}</p>
          </div>
        </div>
      )}

      {debts.length > 0 && (
        <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 mb-6">
          <h2 className="text-base font-semibold font-display mb-4">Payoff Simulator</h2>
          <div className="mb-4">
            <label className="text-sm text-slate-300 block mb-3">
              Extra Monthly Payment: <span className="font-semibold text-white font-mono">{formatCurrency(extraMonthly)}</span>
            </label>
            <input
              type="range"
              min={0}
              max={2000}
              step={50}
              value={extraMonthly}
              onChange={(e) => setExtraMonthly(parseInt(e.target.value))}
              onPointerUp={(e) => handleExtraChange(parseInt((e.target as HTMLInputElement).value))}
              className="w-full cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span className="font-mono">$0</span>
              <span className="font-mono">$2,000</span>
            </div>
          </div>

          {simulatorLoading ? (
            <p className="text-slate-400 text-sm">Calculating...</p>
          ) : payoffSummary ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-navy-850 rounded-lg p-3">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Debt-Free Date</p>
                <p className="text-sm font-semibold font-mono">
                  {format(new Date(payoffSummary.debt_free_date), 'MMM yyyy')}
                </p>
              </div>
              <div className="bg-navy-850 rounded-lg p-3">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total Interest</p>
                <p className="text-sm font-semibold text-red-400 font-mono">
                  {formatCurrency(payoffSummary.total_interest)}
                </p>
              </div>
              <div className="bg-navy-850 rounded-lg p-3">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Interest Saved</p>
                <p className="text-sm font-semibold text-green-400 font-mono">
                  {formatCurrency(payoffSummary.interest_saved_vs_minimum)}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {debts.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg mb-2">No debts tracked</p>
          <p className="text-sm">Add a debt to start tracking your payoff progress.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedDebts.map((debt) => {
            const paidOff = debt.principal_amount > 0
              ? Math.max(0, ((debt.principal_amount - debt.current_balance) / debt.principal_amount) * 100)
              : 0
            const progressCapped = Math.min(100, paidOff)
            const projection = getProjection(debt.id)
            const isExpanded = expandedDebtId === debt.id

            return (
              <div
                key={debt.id}
                className="bg-navy-900 border border-navy-800 rounded-xl p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">
                        #{debt.priority_order}
                      </span>
                      <span className="text-sm font-semibold">{getAccountName(debt.account_id)}</span>
                      <span className="bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full text-xs font-mono">
                        {formatPercent(debt.interest_rate)} APR
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {FREQUENCY_LABELS[debt.compounding_frequency]} compounding
                      {debt.target_payoff_date && (
                        <span className="ml-2">· Target: {format(new Date(debt.target_payoff_date + 'T00:00:00'), 'MMM d, yyyy')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openEdit(debt)}
                      className="text-slate-400 hover:text-white text-sm cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(debt.id)}
                      className="text-slate-400 hover:text-red-400 text-sm cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-400">
                    Balance: <span className="text-white font-medium font-mono">{formatCurrency(debt.current_balance)}</span>
                  </span>
                  <span className="text-slate-400">
                    Principal: <span className="text-slate-300 font-mono">{formatCurrency(debt.principal_amount)}</span>
                  </span>
                  <span className="text-slate-400">
                    Min payment: <span className="text-slate-300 font-mono">{formatCurrency(debt.minimum_payment)}</span>
                  </span>
                </div>

                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Paid off</span>
                    <span className="font-mono">{progressCapped.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-navy-850 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${progressCapped}%` }}
                    />
                  </div>
                </div>

                {payoffSummary && (
                  <div className="mt-3">
                    <button
                      onClick={() => setExpandedDebtId(isExpanded ? null : debt.id)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                    >
                      {isExpanded ? 'Hide Schedule' : 'Show Amortization'}
                    </button>

                    {isExpanded && projection && (
                      <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-navy-750">
                        <table className="w-full text-xs">
                          <thead className="bg-navy-850 sticky top-0">
                            <tr>
                              <th className="text-left px-3 py-2 text-slate-400 font-medium">Month</th>
                              <th className="text-right px-3 py-2 text-slate-400 font-medium">Payment</th>
                              <th className="text-right px-3 py-2 text-slate-400 font-medium">Principal</th>
                              <th className="text-right px-3 py-2 text-slate-400 font-medium">Interest</th>
                              <th className="text-right px-3 py-2 text-slate-400 font-medium">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {projection.schedule.map((row) => (
                              <tr key={row.month} className="border-t border-navy-800 hover:bg-navy-850/50">
                                <td className="px-3 py-1.5 text-slate-300 font-mono">{row.month}</td>
                                <td className="px-3 py-1.5 text-right text-slate-300 font-mono">{formatCurrency(row.payment)}</td>
                                <td className="px-3 py-1.5 text-right text-green-400 font-mono">{formatCurrency(row.principal)}</td>
                                <td className="px-3 py-1.5 text-right text-red-400 font-mono">{formatCurrency(row.interest)}</td>
                                <td className="px-3 py-1.5 text-right text-slate-300 font-mono">{formatCurrency(row.balance)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {isExpanded && !projection && (
                      <p className="mt-2 text-xs text-slate-500">No projection data available.</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Debt' : 'Add Debt'}
      >
        {formError && <p className="text-red-400 text-sm mb-4">{formError}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            step="0.0001"
            min="0"
            placeholder="Interest rate (e.g. 0.0499 for 4.99%)"
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
            {COMPOUNDING_FREQUENCIES.map((freq) => (
              <option key={freq} value={freq}>
                {FREQUENCY_LABELS[freq]}
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
    </div>
  )
}
