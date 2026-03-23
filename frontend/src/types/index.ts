export interface User {
  id: string
  email: string
  name: string
  currency: string
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
  user_id: string
  date: string
  amount: number
  description: string
  category_id: string | null
  type: TransactionType
  source: TransactionSource
  transfer_id: string | null
  created_at: string
}

export type CompoundingFrequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'bimonthly'
  | 'quarterly'
  | 'semiannually'
  | 'annually'

export interface Debt {
  id: string
  account_id: string
  user_id: string
  principal_amount: number
  current_balance: number
  interest_rate: number
  minimum_payment: number
  compounding_frequency: CompoundingFrequency
  priority_order: number
  target_payoff_date: string | null
}

export interface AmortizationRow {
  month: number
  payment: number
  principal: number
  interest: number
  balance: number
}

export interface GrowthRow {
  month: number
  interest_accrued: number
  balance: number
}

export interface PayoffProjection {
  debt_id: string
  months_to_payoff: number
  total_interest: number
  total_paid: number
  payoff_date: string
  schedule: AmortizationRow[]
}

export interface PayoffSummary {
  projections: PayoffProjection[]
  total_debt: number
  total_interest: number
  debt_free_date: string
  interest_saved_vs_minimum: number
}

export interface GrowthProjection {
  debt_id: string
  principal_amount: number
  interest_rate: number
  compounding_frequency: CompoundingFrequency
  schedule: GrowthRow[]
  total_interest_accrued: number
  final_balance: number
}

export interface DebtGroupSummary {
  debt_ids: string[]
  total_principal: number
  total_current_balance: number
  weighted_interest_rate: number
  total_minimum_payment: number
  debt_count: number
}

export interface Budget {
  id: string
  user_id: string
  category_id: string
  amount: number
  month: string
}

export interface BudgetWithSpending extends Budget {
  category_name: string
  category_icon: string
  spent: number
}

export interface Goal {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  icon: string
}

export interface CSVMapping {
  id: string
  user_id: string
  institution_name: string
  column_mapping: Record<string, string>
  date_format: string
  created_at: string
}

export interface CSVPreviewRow {
  date: string
  description: string
  amount: number
  category_name: string | null
  is_duplicate: boolean
}

export interface CSVPreviewResponse {
  columns: string[]
  rows: CSVPreviewRow[]
  total_rows: number
  duplicate_count: number
}

export interface MonthlySummary {
  month: string
  income: number
  expenses: number
  savings: number
  savings_rate: number
}

export interface CategorySpending {
  category_id: string
  category_name: string
  category_icon: string
  total: number
}

export interface CategoryComparison extends CategorySpending {
  prior_total: number
  pct_change: number
}

export interface NetWorth {
  net_worth: number
}
