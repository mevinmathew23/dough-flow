import { addMonths, format, startOfMonth, subMonths } from 'date-fns'
import { useState } from 'react'
import {
  createBudget,
  deleteBudget,
  fetchBudgetsWithSpending,
  updateBudget,
} from '../../api/budgets'
import { fetchCategories } from '../../api/categories'
import ConfirmDialog from '../ConfirmDialog'
import ErrorAlert from '../ErrorAlert'
import Modal from '../Modal'
import { inputClass } from '../../constants/styles'
import { useCurrency } from '../../contexts/CurrencyContext'
import useFetch from '../../hooks/useFetch'
import { BudgetWithSpending } from '../../types'

function budgetProgressColor(pct: number): string {
  if (pct > 100) return 'bg-red-500'
  if (pct >= 80) return 'bg-yellow-500'
  return 'bg-green-500'
}

export default function BudgetSection() {
  const { formatCurrency } = useCurrency()
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()))

  const monthStr = format(selectedMonth, 'yyyy-MM-dd')

  const {
    data: budgetsData,
    loading: budgetLoading,
    error: budgetFetchError,
    refetch: refetchBudgets,
  } = useFetch(() => fetchBudgetsWithSpending(monthStr), [monthStr])

  const { data: categoriesData } = useFetch(fetchCategories)

  const budgets: BudgetWithSpending[] = budgetsData ?? []
  const categories = categoriesData ?? []
  const expenseCategories = categories.filter((c) => c.type === 'expense')

  const [budgetModalOpen, setBudgetModalOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<BudgetWithSpending | null>(null)
  const [budgetForm, setBudgetForm] = useState({ category_id: '', amount: '' })
  const [budgetFormError, setBudgetFormError] = useState('')
  const [confirmBudgetTarget, setConfirmBudgetTarget] = useState<string | null>(null)

  const openCreateBudget = () => {
    setEditingBudget(null)
    setBudgetForm({ category_id: expenseCategories[0]?.id ?? '', amount: '' })
    setBudgetFormError('')
    setBudgetModalOpen(true)
  }

  const openEditBudget = (budget: BudgetWithSpending) => {
    setEditingBudget(budget)
    setBudgetForm({ category_id: budget.category_id, amount: String(budget.amount) })
    setBudgetFormError('')
    setBudgetModalOpen(true)
  }

  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBudgetFormError('')
    const amount = parseFloat(budgetForm.amount)
    if (isNaN(amount) || amount <= 0) {
      setBudgetFormError('Amount must be a positive number')
      return
    }
    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, { amount })
      } else {
        await createBudget({
          category_id: budgetForm.category_id,
          amount,
          month: format(selectedMonth, 'yyyy-MM-dd'),
        })
      }
      setBudgetModalOpen(false)
      refetchBudgets()
    } catch {
      setBudgetFormError(editingBudget ? 'Failed to update budget' : 'Failed to create budget')
    }
  }

  const handleDeleteBudget = async (id: string) => {
    await deleteBudget(id)
    refetchBudgets()
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-display">Budgets</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedMonth((m) => subMonths(m, 1))}
              className="text-slate-400 hover:text-white px-2 py-1 rounded transition-colors cursor-pointer"
              aria-label="Previous month"
            >
              ←
            </button>
            <span className="w-28 text-center text-sm font-medium text-slate-200">
              {format(selectedMonth, 'MMMM yyyy')}
            </span>
            <button
              onClick={() => setSelectedMonth((m) => addMonths(m, 1))}
              className="text-slate-400 hover:text-white px-2 py-1 rounded transition-colors cursor-pointer"
              aria-label="Next month"
            >
              →
            </button>
          </div>
          <button
            onClick={openCreateBudget}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            Add Budget
          </button>
        </div>
      </div>

      <ErrorAlert message={budgetFetchError} />

      {budgetLoading ? (
        <div className="text-slate-400">Loading budgets...</div>
      ) : budgets.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="text-lg mb-1">No budgets for {format(selectedMonth, 'MMMM')}</p>
          <p className="text-sm">Add a budget to start tracking your spending.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((budget) => {
            const pct = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0
            const barWidth = Math.min(pct, 100)
            const isOver = pct > 100
            return (
              <div
                key={budget.id}
                className="bg-navy-900 border border-navy-800 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{budget.category_icon}</span>
                    <span className="font-medium text-slate-100">{budget.category_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openEditBudget(budget)}
                      className="text-slate-400 hover:text-white text-sm transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmBudgetTarget(budget.id)}
                      className="text-slate-400 hover:text-red-400 text-sm transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span className="font-mono">
                    {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                  </span>
                  <span className={isOver ? 'text-red-400' : 'text-slate-400'}>
                    {isOver
                      ? `${Math.round(pct - 100)}% over budget`
                      : `${Math.round(100 - pct)}% remaining`}
                  </span>
                </div>
                <div className="w-full bg-navy-850 rounded-full h-2">
                  <div
                    className={`${budgetProgressColor(pct)} h-2 rounded-full transition-all`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmBudgetTarget}
        title="Delete Budget"
        message="Delete this budget? This cannot be undone."
        onConfirm={async () => {
          if (confirmBudgetTarget) await handleDeleteBudget(confirmBudgetTarget)
          setConfirmBudgetTarget(null)
        }}
        onCancel={() => setConfirmBudgetTarget(null)}
      />

      <Modal
        open={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        title={editingBudget ? 'Edit Budget' : 'Add Budget'}
      >
        <ErrorAlert message={budgetFormError} />
        <form onSubmit={handleBudgetSubmit} className="flex flex-col gap-4">
          {!editingBudget && (
            <select
              value={budgetForm.category_id}
              onChange={(e) => setBudgetForm({ ...budgetForm, category_id: e.target.value })}
              className={inputClass}
              required
            >
              {expenseCategories.length === 0 && (
                <option value="">No expense categories available</option>
              )}
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          )}
          <input
            type="number"
            step="0.01"
            placeholder="Amount"
            value={budgetForm.amount}
            onChange={(e) => setBudgetForm({ ...budgetForm, amount: e.target.value })}
            className={inputClass}
            required
          />
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            {editingBudget ? 'Save Changes' : 'Add Budget'}
          </button>
        </form>
      </Modal>
    </section>
  )
}
