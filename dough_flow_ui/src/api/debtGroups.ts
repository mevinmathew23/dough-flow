import { DebtGroup } from '../types'
import api from './client'

export async function fetchDebtGroups(): Promise<DebtGroup[]> {
  const res = await api.get<DebtGroup[]>('/debt-groups')
  return res.data
}

export async function createDebtGroup(name: string): Promise<DebtGroup> {
  const res = await api.post<DebtGroup>('/debt-groups', { name })
  return res.data
}

export async function updateDebtGroup(id: string, name: string): Promise<DebtGroup> {
  const res = await api.patch<DebtGroup>(`/debt-groups/${id}`, { name })
  return res.data
}

export async function deleteDebtGroup(id: string): Promise<void> {
  await api.delete(`/debt-groups/${id}`)
}

export async function updateDebtGroupMembers(id: string, debtIds: string[]): Promise<DebtGroup> {
  const res = await api.put<DebtGroup>(`/debt-groups/${id}/debts`, { debt_ids: debtIds })
  return res.data
}
