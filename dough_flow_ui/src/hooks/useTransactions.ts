import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  bulkCategorizeTransactions,
  bulkDeleteTransactions,
  bulkUpdateTransactionType,
  createTransaction,
  deleteTransaction,
  fetchTransactions,
  TransactionFilters,
  updateTransaction,
} from '../api/transactions'
import { fetchAccounts } from '../api/accounts'
import { fetchCategories } from '../api/categories'
import useFetch from './useFetch'
import { Account, Category, Transaction, TransactionType } from '../types'

const TYPE_LABELS: Record<TransactionType, string> = {
  income: 'Income',
  expense: 'Expense',
  transfer: 'Transfer',
  payment: 'Payment',
  adjustment: 'Adjustment',
}

interface TransactionFormState {
  account_id: string
  date: string
  amount: string
  description: string
  category_id: string
  type: TransactionType
}

export interface UseTransactionsReturn {
  // Data
  transactions: Transaction[]
  accounts: Account[]
  categories: Category[]
  loading: boolean
  error: string
  formatCurrency: (amount: number) => string

  // Filters
  filterAccount: string
  filterCategory: string
  filterType: string
  filterStartDate: string
  filterEndDate: string
  search: string
  hasActiveFilters: boolean
  setFilterAccount: (val: string) => void
  setFilterCategory: (val: string) => void
  setFilterType: (val: string) => void
  setFilterStartDate: (val: string) => void
  setFilterEndDate: (val: string) => void
  setSearch: (val: string) => void
  clearFilters: () => void

  // Form modal
  modalOpen: boolean
  editing: Transaction | null
  form: TransactionFormState
  formError: string
  setForm: (form: TransactionFormState) => void
  openCreate: () => void
  openEdit: (txn: Transaction) => void
  closeModal: () => void
  handleSubmit: (e: React.FormEvent) => Promise<void>

  // Single delete
  confirmSingleTarget: string | null
  setConfirmSingleTarget: (id: string | null) => void
  handleDelete: (id: string) => Promise<void>

  // Bulk actions
  selected: Set<string>
  bulkCategoryId: string
  setBulkCategoryId: (id: string) => void
  bulkTypeId: TransactionType | ''
  setBulkTypeId: (type: TransactionType | '') => void
  deleteConfirmOpen: boolean
  setDeleteConfirmOpen: (open: boolean) => void
  successMessage: string
  selectedTotal: number
  toggleSelect: (id: string) => void
  toggleSelectAll: () => void
  clearSelection: () => void
  handleBulkCategorize: () => Promise<void>
  handleBulkDelete: () => Promise<void>
  handleBulkUpdateType: () => Promise<void>

  // Helpers
  getCategoryName: (categoryId: string | null) => string
  getAccountName: (accountId: string) => string
}

export default function useTransactions(
  formatCurrencyFn: (amount: number) => string,
): UseTransactionsReturn {
  const formatCurrency = (amount: number) => formatCurrencyFn(Math.abs(amount))

  // Filters
  const [filterAccount, setFilterAccount] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [search, setSearch] = useState('')

  const { data: accountsData } = useFetch(fetchAccounts)
  const { data: categoriesData } = useFetch(fetchCategories)
  const accounts: Account[] = accountsData ?? []
  const categories: Category[] = categoriesData ?? []

  const buildFilters = useCallback(
    (): TransactionFilters => ({
      account_id: filterAccount || undefined,
      category_id: filterCategory || undefined,
      type: filterType || undefined,
      start_date: filterStartDate || undefined,
      end_date: filterEndDate || undefined,
      search: search || undefined,
    }),
    [filterAccount, filterCategory, filterType, filterStartDate, filterEndDate, search],
  )

  const {
    data: txnData,
    loading,
    error,
    refetch,
  } = useFetch(
    () => fetchTransactions(buildFilters()),
    [filterAccount, filterCategory, filterType, filterStartDate, filterEndDate, search],
  )
  const transactions: Transaction[] = txnData ?? []

  // Form modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [form, setForm] = useState<TransactionFormState>({
    account_id: '',
    date: '',
    amount: '',
    description: '',
    category_id: '',
    type: 'expense',
  })
  const [formError, setFormError] = useState('')

  // Bulk actions
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkCategoryId, setBulkCategoryId] = useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [confirmSingleTarget, setConfirmSingleTarget] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [bulkTypeId, setBulkTypeId] = useState<TransactionType | ''>('')

  const getCategoryName = (categoryId: string | null): string => {
    if (!categoryId) return '—'
    const cat = categories.find((c) => c.id === categoryId)
    return cat ? `${cat.icon} ${cat.name}` : '—'
  }

  const getAccountName = (accountId: string): string => {
    const acct = accounts.find((a) => a.id === accountId)
    return acct ? acct.name : '—'
  }

  const openCreate = () => {
    setEditing(null)
    setForm({
      account_id: accounts.length > 0 ? accounts[0].id : '',
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: '',
      description: '',
      category_id: '',
      type: 'expense',
    })
    setFormError('')
    setModalOpen(true)
  }

  useEffect(() => {
    if (editing) return
    if (!form.account_id) return
    const account = accounts.find((a) => a.id === form.account_id)
    if (account?.type === 'credit') {
      const paymentCategory = categories.find((c) => c.name.toLowerCase() === 'payment')
      setForm((prev) => ({
        ...prev,
        type: 'payment',
        category_id: paymentCategory?.id ?? prev.category_id,
      }))
    }
  }, [form.account_id, editing, accounts, categories])

  const openEdit = (txn: Transaction) => {
    setEditing(txn)
    setForm({
      account_id: txn.account_id,
      date: txn.date,
      amount: String(Math.abs(txn.amount)),
      description: txn.description,
      category_id: txn.category_id || '',
      type: txn.type,
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) {
      setFormError('Amount must be a positive number')
      return
    }
    const payload = {
      account_id: form.account_id,
      date: form.date,
      amount: form.type === 'expense' || form.type === 'payment' ? -amount : amount,
      description: form.description,
      category_id: form.category_id || null,
      type: form.type,
    }
    try {
      if (editing) {
        await updateTransaction(editing.id, {
          date: payload.date,
          amount: payload.amount,
          description: payload.description,
          category_id: payload.category_id,
          type: payload.type,
        })
      } else {
        await createTransaction(payload)
      }
      setModalOpen(false)
      refetch()
    } catch {
      setFormError(editing ? 'Failed to update transaction' : 'Failed to create transaction')
    }
  }

  const handleDelete = async (id: string) => {
    await deleteTransaction(id)
    refetch()
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === transactions.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(transactions.map((t) => t.id)))
    }
  }

  const handleBulkCategorize = async () => {
    if (selected.size === 0 || !bulkCategoryId) return
    try {
      await bulkCategorizeTransactions(Array.from(selected), bulkCategoryId)
      setSelected(new Set())
      setBulkCategoryId('')
      refetch()
    } catch {
      // non-critical
    }
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    try {
      const result = await bulkDeleteTransactions(Array.from(selected))
      const count = result.deleted_count
      setSelected(new Set())
      setDeleteConfirmOpen(false)
      setSuccessMessage(`Successfully deleted ${count} transaction${count !== 1 ? 's' : ''}`)
      setTimeout(() => setSuccessMessage(''), 4000)
      refetch()
    } catch {
      setDeleteConfirmOpen(false)
    }
  }

  const handleBulkUpdateType = async () => {
    if (selected.size === 0 || !bulkTypeId) return
    try {
      const result = await bulkUpdateTransactionType(Array.from(selected), bulkTypeId)
      const count = result.updated_count
      setSelected(new Set())
      setBulkTypeId('')
      setSuccessMessage(
        `Successfully updated ${count} transaction${count !== 1 ? 's' : ''} to ${TYPE_LABELS[bulkTypeId]}`,
      )
      setTimeout(() => setSuccessMessage(''), 4000)
      refetch()
    } catch {
      // non-critical
    }
  }

  const selectedTotal = transactions
    .filter((t) => selected.has(t.id))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const clearFilters = () => {
    setFilterAccount('')
    setFilterCategory('')
    setFilterType('')
    setFilterStartDate('')
    setFilterEndDate('')
    setSearch('')
  }

  const hasActiveFilters = !!(
    filterAccount ||
    filterCategory ||
    filterType ||
    filterStartDate ||
    filterEndDate ||
    search
  )

  return {
    transactions,
    accounts,
    categories,
    loading,
    error,
    formatCurrency,

    filterAccount,
    filterCategory,
    filterType,
    filterStartDate,
    filterEndDate,
    search,
    hasActiveFilters,
    setFilterAccount,
    setFilterCategory,
    setFilterType,
    setFilterStartDate,
    setFilterEndDate,
    setSearch,
    clearFilters,

    modalOpen,
    editing,
    form,
    formError,
    setForm,
    openCreate,
    openEdit,
    closeModal: () => setModalOpen(false),
    handleSubmit,

    confirmSingleTarget,
    setConfirmSingleTarget,
    handleDelete,

    selected,
    bulkCategoryId,
    setBulkCategoryId,
    bulkTypeId,
    setBulkTypeId,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    successMessage,
    selectedTotal,
    toggleSelect,
    toggleSelectAll,
    clearSelection: () => setSelected(new Set()),
    handleBulkCategorize,
    handleBulkDelete,
    handleBulkUpdateType,

    getCategoryName,
    getAccountName,
  }
}
