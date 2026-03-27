import { Category, TransactionType } from '../../types'
import { selectClass } from '../../constants/styles'

interface BulkActionBarProps {
  selectedCount: number
  categories: Category[]
  bulkCategoryId: string
  setBulkCategoryId: (id: string) => void
  bulkTypeId: TransactionType | ''
  setBulkTypeId: (type: TransactionType | '') => void
  onBulkCategorize: () => Promise<void>
  onBulkUpdateType: () => Promise<void>
  onBulkDeleteClick: () => void
  onCancel: () => void
}

export default function BulkActionBar({
  selectedCount,
  categories,
  bulkCategoryId,
  setBulkCategoryId,
  bulkTypeId,
  setBulkTypeId,
  onBulkCategorize,
  onBulkUpdateType,
  onBulkDeleteClick,
  onCancel,
}: BulkActionBarProps) {
  return (
    <div className="flex items-center gap-3 mb-4 bg-navy-900 border border-navy-800 rounded-lg px-4 py-2">
      <span className="text-sm text-slate-300">{selectedCount} selected</span>
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
        onClick={onBulkCategorize}
        disabled={!bulkCategoryId}
        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1 rounded-lg text-sm transition-colors cursor-pointer"
      >
        Apply
      </button>
      <div className="w-px h-6 bg-navy-700" />
      <select
        value={bulkTypeId}
        onChange={(e) => setBulkTypeId(e.target.value as TransactionType | '')}
        className={selectClass}
      >
        <option value="">Change type...</option>
        <option value="income">Income</option>
        <option value="expense">Expense</option>
        <option value="payment">Payment</option>
        <option value="adjustment">Adjustment</option>
      </select>
      <button
        onClick={onBulkUpdateType}
        disabled={!bulkTypeId}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1 rounded-lg text-sm transition-colors cursor-pointer"
      >
        Apply
      </button>
      <div className="w-px h-6 bg-navy-700" />
      <button
        onClick={onBulkDeleteClick}
        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm transition-colors cursor-pointer"
      >
        Delete ({selectedCount})
      </button>
      <button onClick={onCancel} className="text-slate-400 hover:text-white text-sm cursor-pointer">
        Cancel
      </button>
    </div>
  )
}
