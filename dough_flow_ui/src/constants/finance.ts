import { AccountType, CompoundingFrequency } from '../types'

export const ACCOUNT_TYPES: AccountType[] = [
  'checking',
  'savings',
  'credit',
  'investment',
  'loan',
  'retirement',
]

export const TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit: 'Credit',
  investment: 'Investment',
  loan: 'Loan',
  retirement: 'Retirement',
}

export const COMPOUNDING_OPTIONS: CompoundingFrequency[] = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'bimonthly',
  'quarterly',
  'semiannually',
  'annually',
]

export const COMPOUNDING_LABELS: Record<CompoundingFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  monthly: 'Monthly',
  bimonthly: 'Bi-Monthly',
  quarterly: 'Quarterly',
  semiannually: 'Semi-Annually',
  annually: 'Annually',
}

export const DEBT_ACCOUNT_TYPES: AccountType[] = ['credit', 'loan']
