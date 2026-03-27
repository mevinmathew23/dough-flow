import BudgetSection from '../components/budgets/BudgetSection'
import GoalSection from '../components/goals/GoalSection'

export default function BudgetsGoals() {
  return (
    <div className="space-y-10">
      <BudgetSection />
      <GoalSection />
    </div>
  )
}
