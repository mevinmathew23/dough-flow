import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Accounts from './pages/Accounts'
import Transactions from './pages/Transactions'

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/accounts" element={<Accounts />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/reports" element={<div className="text-slate-400">Reports - Plan 3</div>} />
                <Route path="/debt" element={<div className="text-slate-400">Debt Payoff - Plan 3</div>} />
                <Route path="/budgets" element={<div className="text-slate-400">Budgets & Goals - Plan 3</div>} />
                <Route path="/import" element={<div className="text-slate-400">Import CSV - Plan 3</div>} />
                <Route path="/settings" element={<div className="text-slate-400">Settings - Plan 3</div>} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
