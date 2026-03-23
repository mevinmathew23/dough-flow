import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { User } from '../types'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function Settings() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await api.get<User>('/auth/me')
        setUser(res.data)
      } catch {
        setError('Failed to load profile. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {loading && (
        <div className="text-slate-400 text-sm">Loading profile...</div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-400 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && user && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Profile</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-slate-800">
              <span className="text-sm text-slate-400">Name</span>
              <span className="text-sm text-white font-medium">{user.name}</span>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-slate-800">
              <span className="text-sm text-slate-400">Email</span>
              <span className="text-sm text-white font-medium">{user.email}</span>
            </div>

            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-slate-400">Member since</span>
              <span className="text-sm text-white font-medium">{formatDate(user.created_at)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Log out
        </button>
      </div>
    </div>
  )
}
