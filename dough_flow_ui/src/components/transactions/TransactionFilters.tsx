import { Account, Category } from '../../types'
import { selectClass } from '../../constants/styles'

interface TransactionFiltersProps {
  accounts: Account[]
  categories: Category[]
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
}

export default function TransactionFilters({
  accounts,
  categories,
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
}: TransactionFiltersProps) {
  return (
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
        <option value="payment">Payment</option>
        <option value="adjustment">Adjustment</option>
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
        <button
          onClick={clearFilters}
          className="text-slate-400 hover:text-white text-sm cursor-pointer"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
