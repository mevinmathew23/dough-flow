import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import api from '../api/client'
import Modal from '../components/Modal'
import { useCurrency } from '../contexts/CurrencyContext'
import { Account, Category, Transaction, TransactionType } from '../types'

const TYPE_LABELS: Record<TransactionType, string> = {
  income: 'Income',
  expense: 'Expense',
  transfer: 'Transfer',
}

const TYPE_COLORS: Record<TransactionType, string> = {
  income: 'bg-green-500/10 text-green-400',
  expense: 'bg-red-500/10 text-red-400',
  transfer: 'bg-blue-500/10 text-blue-400',
}

export default function Transactions() {
  const { formatCurrency: baseFmtCurrency } = useCurrency()
  const formatCurrency = (amount: number) => baseFmtCurrency(Math.abs(amount))
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [filterAccount, setFilterAccount] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [search, setSearch] = useState('')

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [form, setForm] = useState({
    account_id: '',
    date: '',
    amount: '',
    description: '',
    category_id: '',
    type: 'expense' as TransactionType,
  })
  const [formError, setFormError] = useState('')

  // Bulk categorize
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkCategoryId, setBulkCategoryId] = useState('')

  const fetchTransactions = async () => {
    const params = new URLSearchParams()
    if (filterAccount) params.append('account_id', filterAccount)
    if (filterCategory) params.append('category_id', filterCategory)
    if (filterType) params.append('type', filterType)
    if (filterStartDate) params.append('start_date', filterStartDate)
    if (filterEndDate) params.append('end_date', filterEndDate)
    if (search) params.append('search', search)
    try {
      const res = await api.get(`/transactions?${params.toString()}`)
      setTransactions(res.data)
      setError('')
    } catch {
      setError('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

  const fetchReferenceData = async () => {
    try {
      const [accountsRes, categoriesRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/categories'),
      ])
      setAccounts(accountsRes.data)
      setCategories(categoriesRes.data)
    } catch {
      setError('Failed to load accounts and categories')
    }
  }

  useEffect(() => {
    fetchReferenceData()
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [filterAccount, filterCategory, filterType, filterStartDate, filterEndDate, search])

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
      amount: form.type === 'expense' ? -amount : amount,
      description: form.description,
      category_id: form.category_id || null,
      type: form.type,
    }
    try {
      if (editing) {
        await api.patch(`/transactions/${editing.id}`, {
          date: payload.date,
          amount: payload.amount,
          description: payload.description,
          category_id: payload.category_id,
          type: payload.type,
        })
      } else {
        await api.post('/transactions', payload)
      }
      setModalOpen(false)
      await fetchTransactions()
    } catch {
      setFormError(editing ? 'Failed to update transaction' : 'Failed to create transaction')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return
    try {
      await api.delete(`/transactions/${id}`)
      await fetchTransactions()
    } catch {
      setError('Failed to delete transaction')
    }
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
      await api.post('/transactions/bulk-categorize', {
        transaction_ids: Array.from(selected),
        category_id: bulkCategoryId,
      })
      setSelected(new Set())
      setBulkCategoryId('')
      await fetchTransactions()
    } catch {
      setError('Failed to categorize transactions')
    }
  }

  const clearFilters = () => {
    setFilterAccount('')
    setFilterCategory('')
    setFilterType('')
    setFilterStartDate('')
    setFilterEndDate('')
    setSearch('')
  }

  const hasActiveFilters =
    filterAccount || filterCategory || filterType || filterStartDate || filterEndDate || search

  const selectClass =
    'bg-navy-850 border border-navy-750 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500 cursor-pointer'
  const inputClass =
    'bg-navy-850 border border-navy-750 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 w-full'

  if (loading) {
    return <div className="text-slate-400">Loading transactions...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-display">Transactions</h1>
        <button
          onClick={openCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          Add Transaction
        </button>
      </div>

      {/* Error display */}
      {error && !modalOpen && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${selectClass} w-48`}
        />
        <select
          value={filterAccount}
          onChange={(e) => setFilterAccount(e.target.value)}
          className={selectClass}
        >
          <option value="">All Accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className={selectClass}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className={selectClass}
        >
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="transfer">Transfer</option>
        </select>
        <input
          type="date"
          value={filterStartDate}
          onChange={(e) => setFilterStartDate(e.target.value)}
          className={selectClass}
          placeholder="From"
        />
        <input
          type="date"
          value={filterEndDate}
          onChange={(e) => setFilterEndDate(e.target.value)}
          className={selectClass}
          placeholder="To"
        />
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-slate-400 hover:text-white text-sm cursor-pointer">
            Clear filters
          </button>
        )}
      </div>

      {/* Bulk categorize bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 bg-navy-900 border border-navy-800 rounded-lg px-4 py-2">
          <span className="text-sm text-slate-300">{selected.size} selected</span>
          <select
            value={bulkCategoryId}
            onChange={(e) => setBulkCategoryId(e.target.value)}
            className={selectClass}
          >
            <option value="">Assign category...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleBulkCategorize}
            disabled={!bulkCategoryId}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1 rounded-lg text-sm transition-colors cursor-pointer"
          >
            Apply
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-slate-400 hover:text-white text-sm cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Transaction list */}
      {transactions.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg mb-2">No transactions found</p>
          <p className="text-sm">
            {hasActiveFilters
              ? 'Try adjusting your filters.'
              : 'Add your first transaction to get started.'}
          </p>
        </div>
      ) : (
        <div>
          {/* Header row */}
          <div className="flex items-center gap-3 px-4 py-2 text-xs text-slate-400 uppercase tracking-wider border-b border-navy-800">
            <input
              type="checkbox"
              checked={selected.size === transactions.length}
              onChange={toggleSelectAll}
              className="rounded cursor-pointer"
            />
            <span className="w-24">Date</span>
            <span className="flex-1">Description</span>
            <span className="w-36">Category</span>
            <span className="w-24">Account</span>
            <span className="w-20">Type</span>
            <span className="w-28 text-right">Amount</span>
            <span className="w-20"></span>
          </div>

          {transactions.map((txn) => (
            <div
              key={txn.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-navy-800 hover:bg-navy-850/50"
            >
              <input
                type="checkbox"
                checked={selected.has(txn.id)}
                onChange={() => toggleSelect(txn.id)}
                className="rounded cursor-pointer"
              />
              <span className="w-24 text-sm text-slate-300">
                {format(new Date(txn.date + 'T00:00:00'), 'MMM d, yyyy')}
              </span>
              <span className="flex-1 text-sm truncate">{txn.description}</span>
              <span className="w-36 text-sm text-slate-400 truncate">
                {getCategoryName(txn.category_id)}
              </span>
              <span className="w-24 text-sm text-slate-400 truncate">
                {getAccountName(txn.account_id)}
              </span>
              <span className="w-20">
                <span className={`${TYPE_COLORS[txn.type]} px-2 py-0.5 rounded-full text-xs`}>
                  {TYPE_LABELS[txn.type]}
                </span>
              </span>
              <span
                className={`w-28 text-right text-sm font-medium font-mono ${txn.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}
              >
                {txn.amount >= 0 ? '+' : '-'}
                {formatCurrency(txn.amount)}
              </span>
              <span className="w-20 flex gap-2 justify-end">
                <button
                  onClick={() => openEdit(txn)}
                  className="text-slate-400 hover:text-white text-sm cursor-pointer"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(txn.id)}
                  className="text-slate-400 hover:text-red-400 text-sm cursor-pointer"
                >
                  Delete
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Transaction' : 'Add Transaction'}
      >
        {formError && <p className="text-red-400 text-sm mb-4">{formError}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!editing && (
            <select
              value={form.account_id}
              onChange={(e) => setForm({ ...form, account_id: e.target.value })}
              className={inputClass}
              required
            >
              <option value="" disabled>
                Select account
              </option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className={inputClass}
            required
          />
          <input
            type="text"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass}
            required
          />
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className={inputClass}
            required
          />
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as TransactionType, category_id: '' })}
            className={inputClass}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
          </select>
          <select
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className={inputClass}
          >
            <option value="">No category</option>
            {categories
              .filter((c) => c.type === form.type || form.type === 'transfer')
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
          </select>
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            {editing ? 'Save Changes' : 'Add Transaction'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
