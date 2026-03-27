import { Account, Category, CSVMapping, CSVPreviewResponse } from '../types'
import api from './client'

export interface CsvInitialData {
  accounts: Account[]
  mappings: CSVMapping[]
  categories: Category[]
}

export interface CsvConfirmPayload {
  account_id: string | null
  rows: unknown[]
  save_mapping: boolean
  institution_name: string | null
  column_mapping: Record<string, string>
  date_format: string
  mapping_id: string | null
}

export interface CsvConfirmResult {
  imported_count: number
  skipped_duplicates: number
}

export async function fetchCsvInitialData(): Promise<CsvInitialData> {
  const [accountsRes, mappingsRes, categoriesRes] = await Promise.all([
    api.get<Account[]>('/accounts'),
    api.get<CSVMapping[]>('/csv/mappings'),
    api.get<Category[]>('/categories'),
  ])
  return {
    accounts: accountsRes.data,
    mappings: mappingsRes.data,
    categories: categoriesRes.data,
  }
}

export async function detectCsvColumns(file: File): Promise<{ columns: string[] }> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await api.post<{ columns: string[] }>('/csv/detect-columns', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function previewCsvImport(
  file: File,
  columnMapping: Record<string, string>,
  dateFormat: string,
  accountId: string,
  dateTolerance: number,
  mappingId: string | null,
): Promise<CSVPreviewResponse> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('column_mapping', JSON.stringify(columnMapping))
  formData.append('date_format', dateFormat)
  if (accountId) formData.append('account_id', accountId)
  formData.append('date_tolerance_days', String(dateTolerance))
  if (mappingId) formData.append('mapping_id', mappingId)
  const res = await api.post<CSVPreviewResponse>('/csv/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function confirmCsvImport(payload: CsvConfirmPayload): Promise<CsvConfirmResult> {
  const res = await api.post<CsvConfirmResult>('/csv/confirm', payload)
  return res.data
}

export async function deleteCsvMapping(mappingId: string): Promise<void> {
  await api.delete(`/csv/mappings/${mappingId}`)
}
