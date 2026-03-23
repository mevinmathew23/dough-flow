import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Landmark,
  ArrowLeftRight,
  BarChart3,
  TrendingDown,
  Target,
  Upload,
  Settings,
  LogOut,
} from 'lucide-react'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/accounts', label: 'Accounts', icon: Landmark },
  { path: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/debt', label: 'Debt Payoff', icon: TrendingDown },
  { path: '/budgets', label: 'Budgets & Goals', icon: Target },
  { path: '/import', label: 'Import CSV', icon: Upload },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <aside className="w-60 bg-navy-900 border-r border-navy-800 min-h-screen p-5 flex flex-col">
      <div className="flex items-center gap-2.5 mb-10 px-2">
        <img src="/logo.png" alt="Dough Flow" className="w-8 h-8 rounded-lg" />
        <span className="font-display font-bold text-lg text-slate-100 tracking-tight">
          Dough Flow
        </span>
      </div>

      <nav className="flex flex-col gap-0.5 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-navy-850'
                }`
              }
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-navy-850 transition-all duration-150 cursor-pointer mt-4"
      >
        <LogOut size={18} strokeWidth={1.8} />
        <span>Log Out</span>
      </button>
    </aside>
  )
}
