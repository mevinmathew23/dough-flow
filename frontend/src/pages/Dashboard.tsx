// frontend/src/pages/Dashboard.tsx
import { useEffect, useState } from 'react'
import { format, startOfMonth } from 'date-fns'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import api from '../api/client'
import { Account, CategorySpending, Debt, MonthlySummary, NetWorth } from '../types'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatCompact(amount: number): string {
  if (Math.abs(amount) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount)
  }
  return formatCurrency(amount)
}

const CHART_COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16']

export default function Dashboard() {
  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [netWorth, setNetWorth] = useState<NetWorth | null>(null)
  const [trend, setTrend] = useState<MonthlySummary[]>([])
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDashboard = async () => {
      const month = format(startOfMonth(new Date()), 'yyyy-MM-dd')
      try {
        const [summaryRes, netWorthRes, trendRes, categoryRes, accountsRes, debtsRes] = await Promise.all([
          api.get(`/reports/monthly?month=${month}`),
          api.get('/reports/net-worth'),
          api.get('/reports/trend?months=6'),
          api.get(`/reports/categories?month=${month}`),
          api.get('/accounts'),
          api.get('/debts'),
        ])
        setSummary(summaryRes.data)
        setNetWorth(netWorthRes.data)
        setTrend(trendRes.data)
        setCategorySpending(categoryRes.data)
        setAccounts(accountsRes.data)
        setDebts(debtsRes.data)
      } catch {
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading) {
    return <div className="text-slate-400">Loading dashboard...</div>
  }

  if (error) {
    return <div className="text-red-400">{error}</div>
  }

  const trendData = trend.map((m) => ({
    month: format(new Date(m.month + 'T00:00:00'), 'MMM'),
    income: m.income,
    expenses: m.expenses,
  }))

  const totalDebt = debts.reduce((sum, d) => sum + d.current_balance, 0)
  const priorMonth = trend.length >= 2 ? trend[trend.length - 2] : null
  const incomeChange = priorMonth && priorMonth.income > 0 && summary
    ? ((summary.income - priorMonth.income) / priorMonth.income) * 100
    : null
  const expenseChange = priorMonth && priorMonth.expenses > 0 && summary
    ? ((summary.expenses - priorMonth.expenses) / priorMonth.expenses) * 100
    : null

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-sm text-slate-400 mb-1">Net Worth</p>
          <p className="text-xl font-bold">{formatCurrency(netWorth?.net_worth ?? 0)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-sm text-slate-400 mb-1">Monthly Income</p>
          <p className="text-xl font-bold text-green-400">{formatCurrency(summary?.income ?? 0)}</p>
          {incomeChange !== null && (
            <p className={`text-xs mt-1 ${incomeChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {incomeChange >= 0 ? '+' : ''}{incomeChange.toFixed(1)}% vs last month
            </p>
          )}
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-sm text-slate-400 mb-1">Monthly Expenses</p>
          <p className="text-xl font-bold text-red-400">{formatCurrency(summary?.expenses ?? 0)}</p>
          {expenseChange !== null && (
            <p className={`text-xs mt-1 ${expenseChange <= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {expenseChange >= 0 ? '+' : ''}{expenseChange.toFixed(1)}% vs last month
            </p>
          )}
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-sm text-slate-400 mb-1">Total Debt</p>
          <p className="text-xl font-bold text-orange-400">{formatCurrency(totalDebt)}</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Income vs Expense Trend */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
            Income vs Expenses (6 months)
          </h2>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => formatCompact(v as number)} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-sm">No data yet</p>
          )}
        </div>

        {/* Spending by Category */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
            Spending by Category
          </h2>
          {categorySpending.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categorySpending} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => formatCompact(v as number)} />
                <YAxis
                  type="category"
                  dataKey="category_name"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  width={120}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {categorySpending.map((_, i) => (
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
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
          Account Balances
        </h2>
        {accounts.length > 0 ? (
          <div className="space-y-2">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0"
              >
                <div>
                  <span className="text-sm">{account.name}</span>
                  <span className="text-xs text-slate-400 ml-2">{account.institution}</span>
                </div>
                <span
                  className={`text-sm font-medium ${account.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}
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
