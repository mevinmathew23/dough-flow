import { format, startOfMonth } from 'date-fns'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fetchCategoryComparison, fetchMonthlySummary, fetchTrend } from '../api/reports'
import ErrorAlert from '../components/ErrorAlert'
import PageLoader from '../components/PageLoader'
import { selectClass } from '../constants/styles'
import { useCurrency } from '../contexts/CurrencyContext'
import useFetch from '../hooks/useFetch'
import { useState } from 'react'

export default function Reports() {
  const { formatCurrency, formatCompact } = useCurrency()
  const [month, setMonth] = useState(format(startOfMonth(new Date()), 'yyyy-MM'))
  const [monthRange, setMonthRange] = useState(6)

  const monthParam = `${month}-01`

  const {
    data: summary,
    loading,
    error: summaryError,
  } = useFetch(() => fetchMonthlySummary(monthParam), [monthParam])
  const { data: trend, error: trendError } = useFetch(() => fetchTrend(monthRange), [monthRange])
  const { data: comparison, error: comparisonError } = useFetch(
    () => fetchCategoryComparison(monthParam),
    [monthParam],
  )

  const trendList = trend ?? []
  const comparisonList = comparison ?? []

  const error = summaryError || trendError || comparisonError

  const trendData = trendList.map((m) => ({
    month: format(new Date(m.month + 'T00:00:00'), 'MMM yyyy'),
    income: m.income,
    expenses: m.expenses,
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-display">Reports</h1>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className={selectClass}
          />
          <select
            value={monthRange}
            onChange={(e) => setMonthRange(parseInt(e.target.value))}
            className={selectClass}
          >
            <option value={6}>6 months</option>
            <option value={12}>12 months</option>
            <option value={24}>24 months</option>
          </select>
        </div>
      </div>

      <ErrorAlert message={error ? 'Failed to load reports' : null} />

      {loading ? (
        <PageLoader label="Loading reports..." />
      ) : (
        <>
          {/* Savings summary */}
          {summary && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-navy-900 border border-navy-800 rounded-xl p-5">
                <p className="text-sm text-slate-400 mb-1">Income</p>
                <p className="text-xl font-bold font-mono text-green-400">
                  {formatCurrency(summary.income)}
                </p>
              </div>
              <div className="bg-navy-900 border border-navy-800 rounded-xl p-5">
                <p className="text-sm text-slate-400 mb-1">Expenses</p>
                <p className="text-xl font-bold font-mono text-red-400">
                  {formatCurrency(summary.expenses)}
                </p>
              </div>
              <div className="bg-navy-900 border border-navy-800 rounded-xl p-5">
                <p className="text-sm text-slate-400 mb-1">Savings Rate</p>
                <p className="text-xl font-bold font-mono text-emerald-400">
                  {summary.savings_rate}%
                </p>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  {formatCurrency(summary.savings)} saved
                </p>
              </div>
            </div>
          )}

          {/* Income vs Expense Trend */}
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-6 mb-8">
            <h2 className="text-sm font-medium font-display text-slate-400 uppercase tracking-wider mb-4">
              Income vs Expenses
            </h2>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2D3D" />
                  <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickFormatter={(v: number) => formatCompact(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: '1px solid #1E2D3D',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend wrapperStyle={{ color: '#94a3b8' }} />
                  <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-sm">No data for this period</p>
            )}
          </div>

          {/* Category Comparison Table */}
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-6">
            <h2 className="text-sm font-medium font-display text-slate-400 uppercase tracking-wider mb-4">
              Category Comparison (vs Prior Month)
            </h2>
            {comparisonList.length > 0 ? (
              <div>
                <div className="flex items-center px-4 py-2 text-xs text-slate-400 uppercase tracking-wider border-b border-navy-800">
                  <span className="flex-1">Category</span>
                  <span className="w-32 text-right">This Month</span>
                  <span className="w-32 text-right">Last Month</span>
                  <span className="w-24 text-right">Change</span>
                </div>
                {comparisonList.map((row) => (
                  <div
                    key={row.category_id}
                    className="flex items-center px-4 py-3 border-b border-navy-800 last:border-0"
                  >
                    <span className="flex-1 text-sm">
                      {row.category_icon} {row.category_name}
                    </span>
                    <span className="w-32 text-right text-sm font-mono">
                      {formatCurrency(row.total)}
                    </span>
                    <span className="w-32 text-right text-sm font-mono text-slate-400">
                      {formatCurrency(row.prior_total)}
                    </span>
                    <span
                      className={`w-24 text-right text-sm font-medium font-mono ${
                        row.pct_change > 0
                          ? 'text-red-400'
                          : row.pct_change < 0
                            ? 'text-green-400'
                            : 'text-slate-400'
                      }`}
                    >
                      {row.pct_change > 0 ? '+' : ''}
                      {row.pct_change}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm">No category data for this month</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
