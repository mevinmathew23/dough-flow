import { Goal } from '../types'
import api from './client'

export async function fetchGoals(): Promise<Goal[]> {
  const res = await api.get<Goal[]>('/goals')
  return res.data
}

export async function createGoal(data: Record<string, unknown>): Promise<Goal> {
  const res = await api.post<Goal>('/goals', data)
  return res.data
}

export async function updateGoal(id: string, data: Record<string, unknown>): Promise<Goal> {
  const res = await api.patch<Goal>(`/goals/${id}`, data)
  return res.data
}

export async function deleteGoal(id: string): Promise<void> {
  await api.delete(`/goals/${id}`)
}
