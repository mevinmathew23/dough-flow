import { Category } from '../types'
import api from './client'

export async function fetchCategories(): Promise<Category[]> {
  const res = await api.get<Category[]>('/categories')
  return res.data
}

export async function createCategory(data: Record<string, unknown>): Promise<Category> {
  const res = await api.post<Category>('/categories', data)
  return res.data
}

export async function deleteCategory(id: string): Promise<void> {
  await api.delete(`/categories/${id}`)
}
