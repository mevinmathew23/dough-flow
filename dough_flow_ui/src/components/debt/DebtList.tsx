import { format } from 'date-fns'
import { Debt, PayoffProjection, PayoffSummary } from '../../types'
import { COMPOUNDING_LABELS } from '../../constants/finance'
import { useCurrency } from '../../contexts/CurrencyContext'
import AmortizationTable from './AmortizationTable'

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`
}

interface DebtListProps {
  sortedDebts: Debt[]
  selectedDebtIds: Set<string>
  payoffSummary: PayoffSummary | null
  expandedDebtId: string | null
  setExpandedDebtId: (id: string | null) => void
  getAccountName: (accountId: string) => string
  getProjection: (debtId: string) => PayoffProjection | null
  openEdit: (debt: Debt) => void
  setConfirmDebtTarget: (id: string) => void
}

export default function DebtList({
  sortedDebts,
  selectedDebtIds,
  payoffSummary,
  expandedDebtId,
  setExpandedDebtId,
  getAccountName,
  getProjection,
  openEdit,
  setConfirmDebtTarget,
}: DebtListProps) {
  const { formatCurrency } = useCurrency()

  const visibleDebts = sortedDebts.filter((d) => selectedDebtIds.has(d.id))

  if (visibleDebts.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p className="text-lg mb-2">No debts tracked</p>
        <p className="text-sm">Add a debt to start tracking your payoff progress.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {visibleDebts.map((debt) => {
        const paidOff =
          debt.principal_amount > 0
            ? Math.max(
                0,
                ((debt.principal_amount - debt.current_balance) / debt.principal_amount) * 100,
              )
            : 0
        const progressCapped = Math.min(100, paidOff)
        const projection = getProjection(debt.id)
        const isExpanded = expandedDebtId === debt.id

        return (
          <div key={debt.id} className="bg-navy-900 border border-navy-800 rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">#{debt.priority_order}</span>
                  <span className="text-sm font-semibold">{getAccountName(debt.account_id)}</span>
                  {debt.interest_rate > 0 && (
                    <span className="bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full text-xs font-mono">
                      {formatPercent(debt.interest_rate)} APR
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {debt.interest_rate > 0 && (
                    <>{COMPOUNDING_LABELS[debt.compounding_frequency]} compounding</>
                  )}
                  {debt.target_payoff_date && (
                    <span className={debt.interest_rate > 0 ? 'ml-2' : ''}>
                      {debt.interest_rate > 0 && '· '}Target:{' '}
                      {format(new Date(debt.target_payoff_date + 'T00:00:00'), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => openEdit(debt)}
                  className="text-slate-400 hover:text-white text-sm cursor-pointer"
                >
                  Edit
                </button>
                <button
                  onClick={() => setConfirmDebtTarget(debt.id)}
                  className="text-slate-400 hover:text-red-400 text-sm cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-400">
                Balance:{' '}
                <span className="text-white font-medium font-mono">
                  {formatCurrency(debt.current_balance)}
                </span>
              </span>
              <span className="text-slate-400">
                Principal:{' '}
                <span className="text-slate-300 font-mono">
                  {formatCurrency(debt.principal_amount)}
                </span>
              </span>
              <span className="text-slate-400">
                Min payment:{' '}
                <span className="text-slate-300 font-mono">
                  {formatCurrency(debt.minimum_payment)}
                </span>
              </span>
            </div>

            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Paid off</span>
                <span className="font-mono">{progressCapped.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-navy-850 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${progressCapped}%` }}
                />
              </div>
            </div>

            {payoffSummary && (
              <div className="mt-3">
                <button
                  onClick={() => setExpandedDebtId(isExpanded ? null : debt.id)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  {isExpanded ? 'Hide Schedule' : 'Show Amortization'}
                </button>

                {isExpanded && projection && <AmortizationTable schedule={projection.schedule} />}

                {isExpanded && !projection && (
                  <p className="mt-2 text-xs text-slate-500">No projection data available.</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
