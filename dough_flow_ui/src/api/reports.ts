import { CategoryComparison, CategorySpending, MonthlySummary, NetWorth } from '../types'
import api from './client'

export async function fetchMonthlySummary(month: string): Promise<MonthlySummary> {
  const res = await api.get<MonthlySummary>(`/reports/monthly?month=${month}`)
  return res.data
}

export async function fetchNetWorth(): Promise<NetWorth> {
  const res = await api.get<NetWorth>('/reports/net-worth')
  return res.data
}

export async function fetchTrend(months: number): Promise<MonthlySummary[]> {
  const res = await api.get<MonthlySummary[]>(`/reports/trend?months=${months}`)
  return res.data
}

export async function fetchCategorySpending(month: string): Promise<CategorySpending[]> {
  const res = await api.get<CategorySpending[]>(`/reports/categories?month=${month}`)
  return res.data
}

export async function fetchCategoryComparison(month: string): Promise<CategoryComparison[]> {
  const res = await api.get<CategoryComparison[]>(`/reports/categories/comparison?month=${month}`)
  return res.data
}
