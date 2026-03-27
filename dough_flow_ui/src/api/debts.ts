import { Debt, DebtGroupSummary, PayoffSummary } from '../types'
import api from './client'

export async function fetchDebts(): Promise<Debt[]> {
  const res = await api.get<Debt[]>('/debts')
  return res.data
}

export async function fetchDebtGroupSummary(): Promise<DebtGroupSummary> {
  const res = await api.get<DebtGroupSummary>('/debts/grouped')
  return res.data
}

export async function fetchPayoffSummary(
  debtIds: string[],
  extraMonthly: number,
): Promise<PayoffSummary> {
  const params = new URLSearchParams()
  params.append('extra_monthly', String(extraMonthly))
  debtIds.forEach((id) => params.append('debt_ids', id))
  const res = await api.get<PayoffSummary>(`/debts/payoff?${params.toString()}`)
  return res.data
}

export async function createDebt(data: Record<string, unknown>): Promise<Debt> {
  const res = await api.post<Debt>('/debts', data)
  return res.data
}

export async function updateDebt(id: string, data: Record<string, unknown>): Promise<Debt> {
  const res = await api.patch<Debt>(`/debts/${id}`, data)
  return res.data
}

export async function deleteDebt(id: string): Promise<void> {
  await api.delete(`/debts/${id}`)
}
