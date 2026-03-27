import { format } from 'date-fns'
import { useState } from 'react'
import { createGoal, deleteGoal, fetchGoals, updateGoal } from '../../api/goals'
import ConfirmDialog from '../ConfirmDialog'
import ErrorAlert from '../ErrorAlert'
import Modal from '../Modal'
import { inputClass } from '../../constants/styles'
import { useCurrency } from '../../contexts/CurrencyContext'
import useFetch from '../../hooks/useFetch'
import { Goal } from '../../types'

export default function GoalSection() {
  const { formatCurrency } = useCurrency()

  const {
    data: goalsData,
    loading: goalsLoading,
    error: goalsFetchError,
    refetch: refetchGoals,
  } = useFetch(fetchGoals)

  const goals: Goal[] = goalsData ?? []

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
    </section>
  )
}
