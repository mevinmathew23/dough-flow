// frontend/src/pages/Dashboard.tsx
import { format, startOfMonth } from 'date-fns'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fetchAccounts } from '../api/accounts'
import { fetchDebts } from '../api/debts'
import {
  fetchCategorySpending,
  fetchMonthlySummary,
  fetchNetWorth,
  fetchTrend,
} from '../api/reports'
import ErrorAlert from '../components/ErrorAlert'
import { useCurrency } from '../contexts/CurrencyContext'
import useFetch from '../hooks/useFetch'

const CHART_COLORS = [
  '#10b981',
  '#22c55e',
  '#a855f7',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
]

const CURRENT_MONTH = format(startOfMonth(new Date()), 'yyyy-MM-dd')

export default function Dashboard() {
  const { formatCurrency, formatCompact } = useCurrency()

  const { data: summary, error: summaryError } = useFetch(() => fetchMonthlySummary(CURRENT_MONTH))
  const { data: netWorth, error: netWorthError } = useFetch(fetchNetWorth)
  const { data: trend, loading, error: trendError } = useFetch(() => fetchTrend(6))
  const { data: categorySpending, error: categoryError } = useFetch(() =>
    fetchCategorySpending(CURRENT_MONTH),
  )
  const { data: accounts, error: accountsError } = useFetch(fetchAccounts)
  const { data: debts, error: debtsError } = useFetch(fetchDebts)

  const trendList = trend ?? []
  const accountList = accounts ?? []
  const debtList = debts ?? []
  const categoryList = categorySpending ?? []

  const combinedError =
    summaryError || netWorthError || trendError || categoryError || accountsError || debtsError
      ? 'Some dashboard data could not be loaded'
      : ''

  if (loading) {
    return (
      <div className="animate-pulse text-slate-500 text-sm tracking-wide">Loading dashboard...</div>
    )
  }

  const trendData = trendList.map((m) => ({
    month: format(new Date(m.month + 'T00:00:00'), 'MMM'),
    income: m.income,
    expenses: m.expenses,
  }))

  const totalDebt = debtList.reduce((sum, d) => sum + d.current_balance, 0)
  const priorMonth = trendList.length >= 2 ? trendList[trendList.length - 2] : null
  const incomeChange =
    priorMonth && priorMonth.income > 0 && summary
      ? ((summary.income - priorMonth.income) / priorMonth.income) * 100
      : null
  const expenseChange =
    priorMonth && priorMonth.expenses > 0 && summary
      ? ((summary.expenses - priorMonth.expenses) / priorMonth.expenses) * 100
      : null

  return (
    <div>
      <h1 className="text-2xl font-bold font-display mb-6">Dashboard</h1>

      <ErrorAlert message={combinedError} />

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 cursor-pointer">
          <p className="text-sm text-slate-400 mb-1">Net Worth</p>
          <p className="text-xl font-bold">
            <span className="font-mono">{formatCurrency(netWorth?.net_worth ?? 0)}</span>
          </p>
        </div>
        <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 cursor-pointer">
          <p className="text-sm text-slate-400 mb-1">Monthly Income</p>
          <p className="text-xl font-bold text-green-400">
            <span className="font-mono">{formatCurrency(summary?.income ?? 0)}</span>
          </p>
          {incomeChange !== null && (
            <p className={`text-xs mt-1 ${incomeChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {incomeChange >= 0 ? '+' : ''}
              {incomeChange.toFixed(1)}% vs last month
            </p>
          )}
        </div>
        <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 cursor-pointer">
          <p className="text-sm text-slate-400 mb-1">Monthly Expenses</p>
          <p className="text-xl font-bold text-red-400">
            <span className="font-mono">{formatCurrency(summary?.expenses ?? 0)}</span>
          </p>
          {expenseChange !== null && (
            <p className={`text-xs mt-1 ${expenseChange <= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {expenseChange >= 0 ? '+' : ''}
              {expenseChange.toFixed(1)}% vs last month
            </p>
          )}
        </div>
        <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 cursor-pointer">
          <p className="text-sm text-slate-400 mb-1">Total Debt</p>
          <p className="text-xl font-bold text-orange-400">
            <span className="font-mono">{formatCurrency(totalDebt)}</span>
          </p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Income vs Expense Trend */}
        <div className="bg-navy-900 border border-navy-800 rounded-xl p-6">
          <h2 className="text-sm font-medium font-display text-slate-400 uppercase tracking-wider mb-4">
            Income vs Expenses (6 months)
          </h2>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2D3D" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(v) => formatCompact(v as number)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #1E2D3D',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-sm">No data yet</p>
          )}
        </div>

        {/* Spending by Category */}
        <div className="bg-navy-900 border border-navy-800 rounded-xl p-6">
          <h2 className="text-sm font-medium font-display text-slate-400 uppercase tracking-wider mb-4">
            Spending by Category
          </h2>
          {categoryList.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryList} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2D3D" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(v) => formatCompact(v as number)}
                />
                <YAxis
                  type="category"
                  dataKey="category_name"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  width={120}
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
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {categoryList.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-sm">No spending data yet</p>
          )}
        </div>
      </div>

      {/* Account Balances */}
      <div className="bg-navy-900 border border-navy-800 rounded-xl p-6">
        <h2 className="text-sm font-medium font-display text-slate-400 uppercase tracking-wider mb-4">
          Account Balances
        </h2>
        {accountList.length > 0 ? (
          <div className="space-y-2">
            {accountList.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between py-2 border-b border-navy-800 last:border-0 cursor-pointer"
              >
                <div>
                  <span className="text-sm">{account.name}</span>
                  <span className="text-xs text-slate-400 ml-2">{account.institution}</span>
                </div>
                <span
                  className={`text-sm font-medium font-mono ${account.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {formatCurrency(account.balance)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm">No accounts yet</p>
        )}
      </div>
    </div>
  )
}
