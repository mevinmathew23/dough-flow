export interface User {
  id: string
  email: string
  name: string
  created_at: string
}

export type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'loan'

export interface Account {
  id: string
  name: string
  type: AccountType
  institution: string
  balance: number
  interest_rate: number | null
  external_id: string | null
  created_at: string
}

export type CategoryType = 'income' | 'expense'

export interface Category {
  id: string
  name: string
  type: CategoryType
  icon: string
  is_default: boolean
}

export type TransactionType = 'income' | 'expense' | 'transfer'
export type TransactionSource = 'manual' | 'csv_import' | 'plaid'

export interface Transaction {
  id: string
  account_id: string
  date: string
  amount: number
  description: string
  category_id: string | null
  type: TransactionType
  source: TransactionSource
  created_at: string
}
