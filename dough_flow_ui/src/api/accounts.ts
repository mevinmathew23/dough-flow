import { Account } from '../types'
import api from './client'

export async function fetchAccounts(): Promise<Account[]> {
  const res = await api.get<Account[]>('/accounts')
  return res.data
}

export async function createAccount(data: Record<string, unknown>): Promise<Account> {
  const res = await api.post<Account>('/accounts', data)
  return res.data
}

export async function updateAccount(id: string, data: Record<string, unknown>): Promise<Account> {
  const res = await api.patch<Account>(`/accounts/${id}`, data)
  return res.data
}

export async function deleteAccount(id: string): Promise<void> {
  await api.delete(`/accounts/${id}`)
}
