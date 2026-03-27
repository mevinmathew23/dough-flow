import { Debt, DebtGroup } from '../../types'
import { useCurrency } from '../../contexts/CurrencyContext'

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`
}

interface DebtSelectorProps {
  sortedDebts: Debt[]
  groups: DebtGroup[]
  selectedDebtIds: Set<string>
  getAccountName: (accountId: string) => string
  getGroupCheckState: (group: DebtGroup) => 'all' | 'some' | 'none'
  toggleDebt: (debtId: string) => void
  toggleGroup: (group: DebtGroup) => void
  selectAll: () => void
  selectNone: () => void
  openCreateGroup: () => void
  openEditGroup: (group: DebtGroup) => void
  openManageMembers: (group: DebtGroup) => void
  setConfirmGroupTarget: (id: string) => void
}

export default function DebtSelector({
  sortedDebts,
  groups,
  selectedDebtIds,
  getAccountName,
  getGroupCheckState,
  toggleDebt,
  toggleGroup,
  selectAll,
  selectNone,
  openCreateGroup,
  openEditGroup,
  openManageMembers,
  setConfirmGroupTarget,
}: DebtSelectorProps) {
  const { formatCurrency } = useCurrency()

  return (
    <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold font-display">Debt Selection</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={selectAll}
            className="text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer"
          >
            Select All
          </button>
          <span className="text-slate-600">|</span>
          <button
            onClick={selectNone}
            className="text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            Select None
          </button>
        </div>
      </div>

      {groups.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Groups</p>
          {groups.map((group) => {
            const checkState = getGroupCheckState(group)
            return (
              <div
                key={group.id}
                className="bg-navy-850 border border-navy-750 rounded-lg px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={checkState === 'all'}
                      ref={(el) => {
                        if (el) el.indeterminate = checkState === 'some'
                      }}
                      onChange={() => toggleGroup(group)}
                      className="w-4 h-4 accent-emerald-500"
                    />
                    <span className="text-sm font-medium text-slate-200">{group.name}</span>
                    <span className="text-xs text-slate-500">
                      ({group.debt_ids.length} debt{group.debt_ids.length !== 1 ? 's' : ''})
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openManageMembers(group)}
                      className="text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      Members
                    </button>
                    <button
                      onClick={() => openEditGroup(group)}
                      className="text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => setConfirmGroupTarget(group.id)}
                      className="text-xs text-slate-400 hover:text-red-400 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="space-y-1">
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Individual Debts</p>
        {sortedDebts.map((debt) => (
          <label key={debt.id} className="flex items-center gap-2 py-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selectedDebtIds.has(debt.id)}
              onChange={() => toggleDebt(debt.id)}
              className="w-4 h-4 accent-emerald-500"
            />
            <span className="text-sm text-slate-300">{getAccountName(debt.account_id)}</span>
            {debt.interest_rate > 0 && (
              <span className="text-xs text-orange-400 font-mono">
                {formatPercent(debt.interest_rate)}
              </span>
            )}
            <span className="text-xs text-slate-500 font-mono ml-auto">
              {formatCurrency(debt.current_balance)}
            </span>
          </label>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={openCreateGroup}
          className="text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer"
        >
          + New Group
        </button>
        <span className="text-xs text-slate-500">
          {selectedDebtIds.size} of {sortedDebts.length} selected
        </span>
      </div>
    </div>
  )
}
