import { BudgetWithSpending } from '../types'
import api from './client'

export async function fetchBudgetsWithSpending(month: string): Promise<BudgetWithSpending[]> {
  const res = await api.get<BudgetWithSpending[]>(`/budgets/spending?month=${month}`)
  return res.data
}

export async function createBudget(data: Record<string, unknown>): Promise<BudgetWithSpending> {
  const res = await api.post<BudgetWithSpending>('/budgets', data)
  return res.data
}

export async function updateBudget(
  id: string,
  data: Record<string, unknown>,
): Promise<BudgetWithSpending> {
  const res = await api.patch<BudgetWithSpending>(`/budgets/${id}`, data)
  return res.data
}

export async function deleteBudget(id: string): Promise<void> {
  await api.delete(`/budgets/${id}`)
}
