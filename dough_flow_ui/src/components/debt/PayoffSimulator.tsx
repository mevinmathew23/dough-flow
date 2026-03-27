import { format } from 'date-fns'
import { useCurrency } from '../../contexts/CurrencyContext'
import { PayoffSummary } from '../../types'

interface PayoffSimulatorProps {
  extraMonthly: number
  setExtraMonthly: (value: number) => void
  payoffSummary: PayoffSummary | null
  simulatorLoading: boolean
  handleExtraChange: (value: number) => void
}

export default function PayoffSimulator({
  extraMonthly,
  setExtraMonthly,
  payoffSummary,
  simulatorLoading,
  handleExtraChange,
}: PayoffSimulatorProps) {
  const { formatCurrency } = useCurrency()

  return (
    <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 mb-6">
      <h2 className="text-base font-semibold font-display mb-4">Payoff Simulator</h2>
      <div className="mb-4">
        <label className="text-sm text-slate-300 block mb-3">
          Extra Monthly Payment:{' '}
          <span className="font-semibold text-white font-mono">{formatCurrency(extraMonthly)}</span>
        </label>
        <input
          type="range"
          min={0}
          max={2000}
          step={50}
          value={extraMonthly}
          onChange={(e) => setExtraMonthly(parseInt(e.target.value))}
          onPointerUp={(e) => handleExtraChange(parseInt((e.target as HTMLInputElement).value))}
          className="w-full cursor-pointer"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span className="font-mono">$0</span>
          <span className="font-mono">$2,000</span>
        </div>
      </div>

      {simulatorLoading ? (
        <p className="text-slate-400 text-sm">Calculating...</p>
      ) : payoffSummary ? (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-navy-850 rounded-lg p-3">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Debt-Free Date</p>
            <p className="text-sm font-semibold font-mono">
              {format(new Date(payoffSummary.debt_free_date), 'MMM yyyy')}
            </p>
          </div>
          <div className="bg-navy-850 rounded-lg p-3">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total Interest</p>
            <p className="text-sm font-semibold text-red-400 font-mono">
              {formatCurrency(payoffSummary.total_interest)}
            </p>
          </div>
          <div className="bg-navy-850 rounded-lg p-3">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Interest Saved</p>
            <p className="text-sm font-semibold text-green-400 font-mono">
              {formatCurrency(payoffSummary.interest_saved_vs_minimum)}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
