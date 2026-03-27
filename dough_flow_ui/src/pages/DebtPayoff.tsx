import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { fetchAccounts } from '../api/accounts'
import {
  createDebt,
  deleteDebt,
  fetchDebts,
  fetchDebtGroupSummary,
  fetchPayoffSummary,
  updateDebt,
} from '../api/debts'
import {
  createDebtGroup,
  deleteDebtGroup,
  fetchDebtGroups,
  updateDebtGroup,
  updateDebtGroupMembers,
} from '../api/debtGroups'
import ConfirmDialog from '../components/ConfirmDialog'
import ErrorAlert from '../components/ErrorAlert'
import Modal from '../components/Modal'
import PageLoader from '../components/PageLoader'
import { COMPOUNDING_LABELS, COMPOUNDING_OPTIONS } from '../constants/finance'
import { inputClass } from '../constants/styles'
import { useCurrency } from '../contexts/CurrencyContext'
import useFetch from '../hooks/useFetch'
import {
  Account,
  CompoundingFrequency,
  Debt,
  DebtGroup,
  DebtGroupSummary,
  PayoffSummary,
} from '../types'

const STORAGE_KEY = 'doughflow:payoff-selection'

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

  // Data fetching
  const {
    data: debtsData,
    loading,
    error: fetchError,
    refetch: refetchDebts,
  } = useFetch(fetchDebts)
  const { data: accountsData, refetch: refetchAccounts } = useFetch(fetchAccounts)
  const { data: groupSummaryData, refetch: refetchGroupSummary } = useFetch(fetchDebtGroupSummary)
  const { data: groupsData, refetch: refetchGroups } = useFetch(fetchDebtGroups)

  const debts: Debt[] = debtsData ?? []
  const accounts: Account[] = accountsData ?? []
  const groupSummary: DebtGroupSummary | null = groupSummaryData ?? null
  const groups: DebtGroup[] = groupsData ?? []

  const [error, setError] = useState('')

  const refetchAll = () => {
    refetchDebts()
    refetchAccounts()
    refetchGroupSummary()
    refetchGroups()
  }

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Debt | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')

  // Simulator
  const [extraMonthly, setExtraMonthly] = useState(0)
  const [payoffSummary, setPayoffSummary] = useState<PayoffSummary | null>(null)
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null)
  const [simulatorLoading, setSimulatorLoading] = useState(false)

  // Debt groups modals
  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<DebtGroup | null>(null)
  const [groupName, setGroupName] = useState('')
  const [managingGroup, setManagingGroup] = useState<DebtGroup | null>(null)
  const [memberSelection, setMemberSelection] = useState<Set<string>>(new Set())

  // Debt selection for simulator
  const [selectedDebtIds, setSelectedDebtIds] = useState<Set<string>>(new Set())
  const [selectionInitialized, setSelectionInitialized] = useState(false)

  // Confirm dialogs
  const [confirmDebtTarget, setConfirmDebtTarget] = useState<string | null>(null)
  const [confirmGroupTarget, setConfirmGroupTarget] = useState<string | null>(null)

  // -------------------------------------------------------------------------
  // Selection initialization & persistence
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (debts.length === 0 || selectionInitialized) return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const ids: string[] = JSON.parse(saved)
        const validIds = ids.filter((id) => debts.some((d) => d.id === id))
        if (validIds.length > 0) {
          setSelectedDebtIds(new Set(validIds))
          setSelectionInitialized(true)
          return
        }
      }
    } catch {
      // ignore parse errors
    }
    setSelectedDebtIds(new Set(debts.map((d) => d.id)))
    setSelectionInitialized(true)
  }, [debts, selectionInitialized])

  useEffect(() => {
    if (!selectionInitialized) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(selectedDebtIds)))
  }, [selectedDebtIds, selectionInitialized])

  useEffect(() => {
    if (!selectionInitialized || selectedDebtIds.size === 0) {
      setPayoffSummary(null)
      return
    }
    runFetchPayoff(extraMonthly)
  }, [selectionInitialized, selectedDebtIds]) // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Payoff simulation
  // -------------------------------------------------------------------------

  const runFetchPayoff = async (extra: number) => {
    if (selectedDebtIds.size === 0) {
      setPayoffSummary(null)
      return
    }
    setSimulatorLoading(true)
    try {
      const result = await fetchPayoffSummary(Array.from(selectedDebtIds), extra)
      setPayoffSummary(result)
    } catch {
      // non-critical
    } finally {
      setSimulatorLoading(false)
    }
  }

  const handleExtraChange = (value: number) => {
    runFetchPayoff(value)
  }

  // -------------------------------------------------------------------------
  // Debt selection helpers
  // -------------------------------------------------------------------------

  const toggleDebt = (debtId: string) => {
    setSelectedDebtIds((prev) => {
      const next = new Set(prev)
      if (next.has(debtId)) next.delete(debtId)
      else next.add(debtId)
      return next
    })
  }

  const toggleGroup = (group: DebtGroup) => {
    const allSelected = group.debt_ids.every((id) => selectedDebtIds.has(id))
    setSelectedDebtIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        group.debt_ids.forEach((id) => next.delete(id))
      } else {
        group.debt_ids.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const selectAll = () => setSelectedDebtIds(new Set(debts.map((d) => d.id)))
  const selectNone = () => setSelectedDebtIds(new Set())

  const getGroupCheckState = (group: DebtGroup): 'all' | 'some' | 'none' => {
    if (group.debt_ids.length === 0) return 'none'
    const selectedCount = group.debt_ids.filter((id) => selectedDebtIds.has(id)).length
    if (selectedCount === group.debt_ids.length) return 'all'
    if (selectedCount > 0) return 'some'
    return 'none'
  }

  // -------------------------------------------------------------------------
  // Group management
  // -------------------------------------------------------------------------

  const openCreateGroup = () => {
    setEditingGroup(null)
    setGroupName('')
    setGroupModalOpen(true)
  }

  const openEditGroup = (group: DebtGroup) => {
    setEditingGroup(group)
    setGroupName(group.name)
    setGroupModalOpen(true)
  }

  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim()) return
    try {
      if (editingGroup) {
        await updateDebtGroup(editingGroup.id, groupName.trim())
      } else {
        await createDebtGroup(groupName.trim())
      }
      setGroupModalOpen(false)
      refetchGroups()
    } catch {
      setError('Failed to save group')
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteDebtGroup(groupId)
      refetchGroups()
    } catch {
      setError('Failed to delete group')
    }
  }

  const openManageMembers = (group: DebtGroup) => {
    setManagingGroup(group)
    setMemberSelection(new Set(group.debt_ids))
  }

  const toggleMember = (debtId: string) => {
    setMemberSelection((prev) => {
      const next = new Set(prev)
      if (next.has(debtId)) next.delete(debtId)
      else next.add(debtId)
      return next
    })
  }

  const saveMembers = async () => {
    if (!managingGroup) return
    try {
      await updateDebtGroupMembers(managingGroup.id, Array.from(memberSelection))
      setManagingGroup(null)
      refetchGroups()
    } catch {
      setError('Failed to update group members')
    }
  }

  // -------------------------------------------------------------------------
  // Debt CRUD
  // -------------------------------------------------------------------------

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
      interest_rate: String(debt.interest_rate * 100),
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
    if (isNaN(interestRate) || interestRate < 0 || interestRate >= 100) {
      setFormError('Interest rate must be between 0 and 100')
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
        await updateDebt(editing.id, {
          current_balance: currentBalance,
          interest_rate: interestRate / 100,
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
        await createDebt({
          account_id: form.account_id,
          principal_amount: principalAmount,
          current_balance: currentBalance,
          interest_rate: interestRate / 100,
          minimum_payment: minimumPayment,
          compounding_frequency: form.compounding_frequency,
          priority_order: priorityOrder || 1,
          target_payoff_date: form.target_payoff_date || null,
        })
      }
      setModalOpen(false)
      refetchAll()
    } catch {
      setFormError(editing ? 'Failed to update debt' : 'Failed to create debt')
    }
  }

  const handleDeleteDebt = async (id: string) => {
    try {
      await deleteDebt(id)
      refetchAll()
    } catch {
      setError('Failed to delete debt')
    }
  }

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const sortedDebts = [...debts].sort((a, b) => a.priority_order - b.priority_order)

  const getGroupSubtotal = (group: DebtGroup) => {
    const selectedGroupDebts = debts.filter(
      (d) => group.debt_ids.includes(d.id) && selectedDebtIds.has(d.id),
    )
    if (selectedGroupDebts.length === 0) return null
    const totalBalance = selectedGroupDebts.reduce((s, d) => s + d.current_balance, 0)
    const totalInterest = selectedGroupDebts.reduce((s, d) => {
      const proj = getProjection(d.id)
      return s + (proj?.total_interest ?? 0)
    }, 0)
    const maxMonths = Math.max(
      ...selectedGroupDebts.map((d) => {
        const proj = getProjection(d.id)
        return proj?.months_to_payoff ?? 0
      }),
    )
    return { totalBalance, totalInterest, maxMonths, count: selectedGroupDebts.length }
  }

  if (loading) return <PageLoader label="Loading debts..." />

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

      {(error || fetchError) && !modalOpen && !groupModalOpen && (
        <ErrorAlert message={error || fetchError} />
      )}

      {debts.length > 0 && groupSummary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total Debt</p>
            <p className="text-xl font-bold text-red-400 font-mono">
              {formatCurrency(groupSummary.total_current_balance)}
            </p>
          </div>
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">
              Original Principal
            </p>
            <p className="text-xl font-bold font-mono">
              {formatCurrency(groupSummary.total_principal)}
            </p>
          </div>
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Weighted Rate</p>
            <p className="text-xl font-bold text-orange-400 font-mono">
              {formatPercent(groupSummary.weighted_interest_rate)}
            </p>
          </div>
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Monthly Minimum</p>
            <p className="text-xl font-bold font-mono">
              {formatCurrency(groupSummary.total_minimum_payment)}
            </p>
          </div>
        </div>
      )}

      {/* Debt Selection & Groups */}
      {debts.length > 0 && (
        <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold font-display">Debt Selection</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-600">|</span>
              <button
                onClick={selectNone}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Select None
              </button>
            </div>
          </div>

          {groups.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Groups</p>
              {groups.map((group) => {
                const checkState = getGroupCheckState(group)
                return (
                  <div
                    key={group.id}
                    className="bg-navy-850 border border-navy-750 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={checkState === 'all'}
                          ref={(el) => {
                            if (el) el.indeterminate = checkState === 'some'
                          }}
                          onChange={() => toggleGroup(group)}
                          className="w-4 h-4 accent-emerald-500"
                        />
                        <span className="text-sm font-medium text-slate-200">{group.name}</span>
                        <span className="text-xs text-slate-500">
                          ({group.debt_ids.length} debt{group.debt_ids.length !== 1 ? 's' : ''})
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openManageMembers(group)}
                          className="text-xs text-slate-400 hover:text-white cursor-pointer"
                        >
                          Members
                        </button>
                        <button
                          onClick={() => openEditGroup(group)}
                          className="text-xs text-slate-400 hover:text-white cursor-pointer"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => setConfirmGroupTarget(group.id)}
                          className="text-xs text-slate-400 hover:text-red-400 cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Individual Debts</p>
            {sortedDebts.map((debt) => (
              <label
                key={debt.id}
                className="flex items-center gap-2 py-1 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={selectedDebtIds.has(debt.id)}
                  onChange={() => toggleDebt(debt.id)}
                  className="w-4 h-4 accent-emerald-500"
                />
                <span className="text-sm text-slate-300">{getAccountName(debt.account_id)}</span>
                {debt.interest_rate > 0 && (
                  <span className="text-xs text-orange-400 font-mono">
                    {formatPercent(debt.interest_rate)}
                  </span>
                )}
                <span className="text-xs text-slate-500 font-mono ml-auto">
                  {formatCurrency(debt.current_balance)}
                </span>
              </label>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={openCreateGroup}
              className="text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer"
            >
              + New Group
            </button>
            <span className="text-xs text-slate-500">
              {selectedDebtIds.size} of {debts.length} selected
            </span>
          </div>
        </div>
      )}

      {/* Group Subtotals */}
      {payoffSummary &&
        groups.length > 0 &&
        groups.map((group) => {
          const subtotal = getGroupSubtotal(group)
          if (!subtotal) return null
          return (
            <div
              key={group.id}
              className="bg-navy-850 border border-navy-750 rounded-lg px-4 py-3 mb-3"
            >
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">
                {group.name} Subtotal
              </p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Balance: </span>
                  <span className="text-white font-mono">
                    {formatCurrency(subtotal.totalBalance)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Interest: </span>
                  <span className="text-red-400 font-mono">
                    {formatCurrency(subtotal.totalInterest)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Payoff: </span>
                  <span className="text-white font-mono">
                    {subtotal.maxMonths} month{subtotal.maxMonths !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          )
        })}

      {/* Payoff Simulator */}
      {debts.length > 0 && selectedDebtIds.size > 0 && (
        <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 mb-6">
          <h2 className="text-base font-semibold font-display mb-4">Payoff Simulator</h2>
          <div className="mb-4">
            <label className="text-sm text-slate-300 block mb-3">
              Extra Monthly Payment:{' '}
              <span className="font-semibold text-white font-mono">
                {formatCurrency(extraMonthly)}
              </span>
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
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">
                  Debt-Free Date
                </p>
                <p className="text-sm font-semibold font-mono">
                  {format(new Date(payoffSummary.debt_free_date), 'MMM yyyy')}
                </p>
              </div>
              <div className="bg-navy-850 rounded-lg p-3">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">
                  Total Interest
                </p>
                <p className="text-sm font-semibold text-red-400 font-mono">
                  {formatCurrency(payoffSummary.total_interest)}
                </p>
              </div>
              <div className="bg-navy-850 rounded-lg p-3">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">
                  Interest Saved
                </p>
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
          {sortedDebts
            .filter((d) => selectedDebtIds.has(d.id))
            .map((debt) => {
              const paidOff =
                debt.principal_amount > 0
                  ? Math.max(
                      0,
                      ((debt.principal_amount - debt.current_balance) / debt.principal_amount) *
                        100,
                    )
                  : 0
              const progressCapped = Math.min(100, paidOff)
              const projection = getProjection(debt.id)
              const isExpanded = expandedDebtId === debt.id

              return (
                <div key={debt.id} className="bg-navy-900 border border-navy-800 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">
                          #{debt.priority_order}
                        </span>
                        <span className="text-sm font-semibold">
                          {getAccountName(debt.account_id)}
                        </span>
                        {debt.interest_rate > 0 && (
                          <span className="bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full text-xs font-mono">
                            {formatPercent(debt.interest_rate)} APR
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {debt.interest_rate > 0 && (
                          <>{COMPOUNDING_LABELS[debt.compounding_frequency]} compounding</>
                        )}
                        {debt.target_payoff_date && (
                          <span className={debt.interest_rate > 0 ? 'ml-2' : ''}>
                            {debt.interest_rate > 0 && '· '}Target:{' '}
                            {format(new Date(debt.target_payoff_date + 'T00:00:00'), 'MMM d, yyyy')}
                          </span>
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
                        onClick={() => setConfirmDebtTarget(debt.id)}
                        className="text-slate-400 hover:text-red-400 text-sm cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-400">
                      Balance:{' '}
                      <span className="text-white font-medium font-mono">
                        {formatCurrency(debt.current_balance)}
                      </span>
                    </span>
                    <span className="text-slate-400">
                      Principal:{' '}
                      <span className="text-slate-300 font-mono">
                        {formatCurrency(debt.principal_amount)}
                      </span>
                    </span>
                    <span className="text-slate-400">
                      Min payment:{' '}
                      <span className="text-slate-300 font-mono">
                        {formatCurrency(debt.minimum_payment)}
                      </span>
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
                                <th className="text-left px-3 py-2 text-slate-400 font-medium">
                                  Month
                                </th>
                                <th className="text-right px-3 py-2 text-slate-400 font-medium">
                                  Payment
                                </th>
                                <th className="text-right px-3 py-2 text-slate-400 font-medium">
                                  Principal
                                </th>
                                <th className="text-right px-3 py-2 text-slate-400 font-medium">
                                  Interest
                                </th>
                                <th className="text-right px-3 py-2 text-slate-400 font-medium">
                                  Balance
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {projection.schedule.map((row) => (
                                <tr
                                  key={row.month}
                                  className="border-t border-navy-800 hover:bg-navy-850/50"
                                >
                                  <td className="px-3 py-1.5 text-slate-300 font-mono">
                                    {row.month}
                                  </td>
                                  <td className="px-3 py-1.5 text-right text-slate-300 font-mono">
                                    {formatCurrency(row.payment)}
                                  </td>
                                  <td className="px-3 py-1.5 text-right text-green-400 font-mono">
                                    {formatCurrency(row.principal)}
                                  </td>
                                  <td className="px-3 py-1.5 text-right text-red-400 font-mono">
                                    {formatCurrency(row.interest)}
                                  </td>
                                  <td className="px-3 py-1.5 text-right text-slate-300 font-mono">
                                    {formatCurrency(row.balance)}
                                  </td>
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

      {/* Confirm delete debt */}
      <ConfirmDialog
        open={!!confirmDebtTarget}
        title="Delete Debt"
        message="Delete this debt? This cannot be undone."
        onConfirm={async () => {
          if (confirmDebtTarget) await handleDeleteDebt(confirmDebtTarget)
          setConfirmDebtTarget(null)
        }}
        onCancel={() => setConfirmDebtTarget(null)}
      />

      {/* Confirm delete group */}
      <ConfirmDialog
        open={!!confirmGroupTarget}
        title="Delete Group"
        message="Delete this group? The debts themselves will not be deleted."
        onConfirm={async () => {
          if (confirmGroupTarget) await handleDeleteGroup(confirmGroupTarget)
          setConfirmGroupTarget(null)
        }}
        onCancel={() => setConfirmGroupTarget(null)}
      />

      {/* Add/Edit Debt Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Debt' : 'Add Debt'}
      >
        <ErrorAlert message={formError} />
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

      {/* Group Create/Rename Modal */}
      <Modal
        open={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        title={editingGroup ? 'Rename Group' : 'New Group'}
      >
        <form onSubmit={handleGroupSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className={inputClass}
            required
            maxLength={100}
          />
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            {editingGroup ? 'Rename' : 'Create Group'}
          </button>
        </form>
      </Modal>

      {/* Manage Group Members Modal */}
      <Modal
        open={!!managingGroup}
        onClose={() => setManagingGroup(null)}
        title={managingGroup ? `Manage: ${managingGroup.name}` : 'Manage Members'}
      >
        <div className="space-y-2 mb-4">
          {sortedDebts.map((debt) => (
            <label
              key={debt.id}
              className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-navy-850 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={memberSelection.has(debt.id)}
                onChange={() => toggleMember(debt.id)}
                className="w-4 h-4 accent-emerald-500"
              />
              <span className="text-sm text-slate-300">{getAccountName(debt.account_id)}</span>
              <span className="text-xs text-slate-500 font-mono ml-auto">
                {formatCurrency(debt.current_balance)}
              </span>
            </label>
          ))}
        </div>
        <button
          onClick={saveMembers}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          Save Members
        </button>
      </Modal>
    </div>
  )
}
