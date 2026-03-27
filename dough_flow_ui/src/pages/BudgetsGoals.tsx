import { format, startOfMonth, addMonths, subMonths } from 'date-fns'
import { useState } from 'react'
import { deleteBudget, createBudget, updateBudget, fetchBudgetsWithSpending } from '../api/budgets'
import { fetchCategories } from '../api/categories'
import { createGoal, deleteGoal, fetchGoals, updateGoal } from '../api/goals'
import ConfirmDialog from '../components/ConfirmDialog'
import ErrorAlert from '../components/ErrorAlert'
import Modal from '../components/Modal'
import { inputClass } from '../constants/styles'
import { useCurrency } from '../contexts/CurrencyContext'
import useFetch from '../hooks/useFetch'
import { BudgetWithSpending, Goal } from '../types'

function budgetProgressColor(pct: number): string {
  if (pct > 100) return 'bg-red-500'
  if (pct >= 80) return 'bg-yellow-500'
  return 'bg-green-500'
}

export default function BudgetsGoals() {
  const { formatCurrency } = useCurrency()
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()))

  const monthStr = format(selectedMonth, 'yyyy-MM-dd')

  // Budgets (re-fetches when month changes)
  const {
    data: budgetsData,
    loading: budgetLoading,
    error: budgetFetchError,
    refetch: refetchBudgets,
  } = useFetch(() => fetchBudgetsWithSpending(monthStr), [monthStr])

  // Categories (fetched once, used by both budget and goal forms)
  const { data: categoriesData } = useFetch(fetchCategories)

  // Goals
  const {
    data: goalsData,
    loading: goalsLoading,
    error: goalsFetchError,
    refetch: refetchGoals,
  } = useFetch(fetchGoals)

  const budgets: BudgetWithSpending[] = budgetsData ?? []
  const categories = categoriesData ?? []
  const goals: Goal[] = goalsData ?? []

  // ---- budget modal state ----
  const [budgetModalOpen, setBudgetModalOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<BudgetWithSpending | null>(null)
  const [budgetForm, setBudgetForm] = useState({ category_id: '', amount: '' })
  const [budgetFormError, setBudgetFormError] = useState('')
  const [confirmBudgetTarget, setConfirmBudgetTarget] = useState<string | null>(null)

  // ---- goal modal state ----
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [goalForm, setGoalForm] = useState({
    name: '',
    target_amount: '',
    current_amount: '0',
    target_date: '',
    icon: '',
  })
  const [goalFormError, setGoalFormError] = useState('')
  const [confirmGoalTarget, setConfirmGoalTarget] = useState<string | null>(null)

  // ---- budget handlers ----
  const expenseCategories = categories.filter((c) => c.type === 'expense')

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

  // ---- goal handlers ----
  const openCreateGoal = () => {
    setEditingGoal(null)
    setGoalForm({ name: '', target_amount: '', current_amount: '0', target_date: '', icon: '' })
    setGoalFormError('')
    setGoalModalOpen(true)
  }

  const openEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setGoalForm({
      name: goal.name,
      target_amount: String(goal.target_amount),
      current_amount: String(goal.current_amount),
      target_date: goal.target_date ? goal.target_date.slice(0, 10) : '',
      icon: goal.icon ?? '',
    })
    setGoalFormError('')
    setGoalModalOpen(true)
  }

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGoalFormError('')
    const targetAmount = parseFloat(goalForm.target_amount)
    const currentAmount = parseFloat(goalForm.current_amount)
    if (isNaN(targetAmount) || targetAmount <= 0) {
      setGoalFormError('Target amount must be a positive number')
      return
    }
    if (isNaN(currentAmount) || currentAmount < 0) {
      setGoalFormError('Current amount must be zero or greater')
      return
    }
    const payload: Record<string, string | number | null> = {
      name: goalForm.name,
      target_amount: targetAmount,
      current_amount: currentAmount,
      target_date: goalForm.target_date || null,
      icon: goalForm.icon || '',
    }
    try {
      if (editingGoal) {
        await updateGoal(editingGoal.id, payload)
      } else {
        await createGoal(payload)
      }
      setGoalModalOpen(false)
      refetchGoals()
    } catch {
      setGoalFormError(editingGoal ? 'Failed to update goal' : 'Failed to create goal')
    }
  }

  const handleDeleteGoal = async (id: string) => {
    await deleteGoal(id)
    refetchGoals()
  }

  return (
    <div className="space-y-10">
      {/* ===== BUDGETS SECTION ===== */}
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
      </section>

      {/* ===== GOALS SECTION ===== */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold font-display">Savings Goals</h1>
          <button
            onClick={openCreateGoal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            Add Goal
          </button>
        </div>

        <ErrorAlert message={goalsFetchError} />

        {goalsLoading ? (
          <div className="text-slate-400">Loading goals...</div>
        ) : goals.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-lg mb-1">No savings goals yet</p>
            <p className="text-sm">Add a goal to start tracking your progress.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal) => {
              const pct =
                goal.target_amount > 0
                  ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
                  : 0
              const formattedDate = goal.target_date
                ? format(new Date(goal.target_date + 'T00:00:00'), 'MMM d, yyyy')
                : null
              return (
                <div
                  key={goal.id}
                  className="bg-navy-900 border border-navy-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {goal.icon && <span className="text-xl">{goal.icon}</span>}
                      <span className="font-medium text-slate-100">{goal.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEditGoal(goal)}
                        className="text-slate-400 hover:text-white text-sm transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmGoalTarget(goal.id)}
                        className="text-slate-400 hover:text-red-400 text-sm transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span className="font-mono">
                      {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                    </span>
                    <span className="text-slate-400">
                      {Math.round(pct)}%{formattedDate && ` · ${formattedDate}`}
                    </span>
                  </div>
                  <div className="w-full bg-navy-850 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ===== CONFIRM DIALOGS ===== */}
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

      <ConfirmDialog
        open={!!confirmGoalTarget}
        title="Delete Goal"
        message="Delete this goal? This cannot be undone."
        onConfirm={async () => {
          if (confirmGoalTarget) await handleDeleteGoal(confirmGoalTarget)
          setConfirmGoalTarget(null)
        }}
        onCancel={() => setConfirmGoalTarget(null)}
      />

      {/* ===== BUDGET MODAL ===== */}
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

      {/* ===== GOAL MODAL ===== */}
      <Modal
        open={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        title={editingGoal ? 'Edit Goal' : 'Add Goal'}
      >
        <ErrorAlert message={goalFormError} />
        <form onSubmit={handleGoalSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Goal name"
            value={goalForm.name}
            onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
            className={inputClass}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Target amount"
            value={goalForm.target_amount}
            onChange={(e) => setGoalForm({ ...goalForm, target_amount: e.target.value })}
            className={inputClass}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Current amount"
            value={goalForm.current_amount}
            onChange={(e) => setGoalForm({ ...goalForm, current_amount: e.target.value })}
            className={inputClass}
          />
          <input
            type="date"
            placeholder="Target date (optional)"
            value={goalForm.target_date}
            onChange={(e) => setGoalForm({ ...goalForm, target_date: e.target.value })}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Icon emoji (optional)"
            value={goalForm.icon}
            onChange={(e) => setGoalForm({ ...goalForm, icon: e.target.value })}
            className={inputClass}
          />
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            {editingGoal ? 'Save Changes' : 'Add Goal'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
