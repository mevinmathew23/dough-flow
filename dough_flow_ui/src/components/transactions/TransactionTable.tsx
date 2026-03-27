import { format } from 'date-fns'
import { Transaction, TransactionType } from '../../types'

const TYPE_LABELS: Record<TransactionType, string> = {
  income: 'Income',
  expense: 'Expense',
  transfer: 'Transfer',
  payment: 'Payment',
  adjustment: 'Adjustment',
}

const TYPE_COLORS: Record<TransactionType, string> = {
  income: 'bg-green-500/10 text-green-400',
  expense: 'bg-red-500/10 text-red-400',
  transfer: 'bg-blue-500/10 text-blue-400',
  payment: 'bg-amber-500/10 text-amber-400',
  adjustment: 'bg-gray-500/10 text-gray-400',
}

interface TransactionTableProps {
  transactions: Transaction[]
  selected: Set<string>
  hasActiveFilters: boolean
  getCategoryName: (categoryId: string | null) => string
  getAccountName: (accountId: string) => string
  formatCurrency: (amount: number) => string
  toggleSelect: (id: string) => void
  toggleSelectAll: () => void
  openEdit: (txn: Transaction) => void
  setConfirmSingleTarget: (id: string) => void
}

export default function TransactionTable({
  transactions,
  selected,
  hasActiveFilters,
  getCategoryName,
  getAccountName,
  formatCurrency,
  toggleSelect,
  toggleSelectAll,
  openEdit,
  setConfirmSingleTarget,
}: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p className="text-lg mb-2">No transactions found</p>
        <p className="text-sm">
          {hasActiveFilters
            ? 'Try adjusting your filters.'
            : 'Add your first transaction to get started.'}
        </p>
      </div>
    )
  }

  return (
    <div>
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
              {txn.type === 'transfer' ? '\u21C4 Transfer' : TYPE_LABELS[txn.type]}
            </span>
          </span>
          <span
            className={`w-28 text-right text-sm font-medium font-mono ${
              txn.type === 'transfer'
                ? 'text-blue-400'
                : txn.type === 'payment'
                  ? 'text-amber-400'
                  : txn.type === 'adjustment'
                    ? 'text-gray-400'
                    : txn.amount >= 0
                      ? 'text-green-400'
                      : 'text-red-400'
            }`}
          >
            {txn.type === 'transfer' || txn.type === 'adjustment'
              ? ''
              : txn.type === 'payment'
                ? '-'
                : txn.amount >= 0
                  ? '+'
                  : '-'}
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
              onClick={() => setConfirmSingleTarget(txn.id)}
              className="text-slate-400 hover:text-red-400 text-sm cursor-pointer"
            >
              Delete
            </button>
          </span>
        </div>
      ))}
    </div>
  )
}
