import { Transaction, TransactionType } from '../types'
import api from './client'

export interface TransactionFilters {
  account_id?: string
  category_id?: string
  type?: string
  start_date?: string
  end_date?: string
  search?: string
}

export interface BulkCategorizeResult {
  updated_count: number
}

export interface BulkDeleteResult {
  deleted_count: number
}

export interface BulkUpdateTypeResult {
  updated_count: number
}

export async function fetchTransactions(filters: TransactionFilters = {}): Promise<Transaction[]> {
  const params = new URLSearchParams()
  if (filters.account_id) params.append('account_id', filters.account_id)
  if (filters.category_id) params.append('category_id', filters.category_id)
  if (filters.type) params.append('type', filters.type)
  if (filters.start_date) params.append('start_date', filters.start_date)
  if (filters.end_date) params.append('end_date', filters.end_date)
  if (filters.search) params.append('search', filters.search)
  const res = await api.get<Transaction[]>(`/transactions?${params.toString()}`)
  return res.data
}

export async function createTransaction(data: Record<string, unknown>): Promise<Transaction> {
  const res = await api.post<Transaction>('/transactions', data)
  return res.data
}

export async function updateTransaction(
  id: string,
  data: Record<string, unknown>,
): Promise<Transaction> {
  const res = await api.patch<Transaction>(`/transactions/${id}`, data)
  return res.data
}

export async function deleteTransaction(id: string): Promise<void> {
  await api.delete(`/transactions/${id}`)
}

export async function bulkCategorizeTransactions(
  transactionIds: string[],
  categoryId: string,
): Promise<BulkCategorizeResult> {
  const res = await api.post<BulkCategorizeResult>('/transactions/bulk-categorize', {
    transaction_ids: transactionIds,
    category_id: categoryId,
  })
  return res.data
}

export async function bulkDeleteTransactions(transactionIds: string[]): Promise<BulkDeleteResult> {
  const res = await api.post<BulkDeleteResult>('/transactions/bulk-delete', {
    transaction_ids: transactionIds,
  })
  return res.data
}

export async function bulkUpdateTransactionType(
  transactionIds: string[],
  type: TransactionType,
): Promise<BulkUpdateTypeResult> {
  const res = await api.post<BulkUpdateTypeResult>('/transactions/bulk-update-type', {
    transaction_ids: transactionIds,
    type,
  })
  return res.data
}
