import { useCurrency } from '../../contexts/CurrencyContext'
import { AmortizationRow } from '../../types'

interface AmortizationTableProps {
  schedule: AmortizationRow[]
}

export default function AmortizationTable({ schedule }: AmortizationTableProps) {
  const { formatCurrency } = useCurrency()

  return (
    <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-navy-750">
      <table className="w-full text-xs">
        <thead className="bg-navy-850 sticky top-0">
          <tr>
            <th className="text-left px-3 py-2 text-slate-400 font-medium">Month</th>
            <th className="text-right px-3 py-2 text-slate-400 font-medium">Payment</th>
            <th className="text-right px-3 py-2 text-slate-400 font-medium">Principal</th>
            <th className="text-right px-3 py-2 text-slate-400 font-medium">Interest</th>
            <th className="text-right px-3 py-2 text-slate-400 font-medium">Balance</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((row) => (
            <tr key={row.month} className="border-t border-navy-800 hover:bg-navy-850/50">
              <td className="px-3 py-1.5 text-slate-300 font-mono">{row.month}</td>
              <td className="px-3 py-1.5 text-right text-slate-300 font-mono">
                {formatCurrency(row.payment)}
              </td>
              <td className="px-3 py-1.5 text-right text-green-400 font-mono">
                {formatCurrency(row.principal)}
              </td>
              <td className="px-3 py-1.5 text-right text-red-400 font-mono">
                {formatCurrency(row.interest)}
              </td>
              <td className="px-3 py-1.5 text-right text-slate-300 font-mono">
                {formatCurrency(row.balance)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
