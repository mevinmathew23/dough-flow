import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { User } from '../types'
import { useCurrency } from '../contexts/CurrencyContext'
import SearchableSelect from '../components/SearchableSelect'

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'CHF', label: 'CHF - Swiss Franc' },
  { value: 'CNY', label: 'CNY - Chinese Yuan' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'BRL', label: 'BRL - Brazilian Real' },
  { value: 'MXN', label: 'MXN - Mexican Peso' },
  { value: 'KRW', label: 'KRW - South Korean Won' },
  { value: 'SGD', label: 'SGD - Singapore Dollar' },
  { value: 'HKD', label: 'HKD - Hong Kong Dollar' },
  { value: 'NZD', label: 'NZD - New Zealand Dollar' },
  { value: 'SEK', label: 'SEK - Swedish Krona' },
  { value: 'NOK', label: 'NOK - Norwegian Krone' },
  { value: 'DKK', label: 'DKK - Danish Krone' },
  { value: 'ZAR', label: 'ZAR - South African Rand' },
  { value: 'AED', label: 'AED - UAE Dirham' },
  { value: 'TWD', label: 'TWD - Taiwan Dollar' },
  { value: 'THB', label: 'THB - Thai Baht' },
  { value: 'IDR', label: 'IDR - Indonesian Rupiah' },
  { value: 'MYR', label: 'MYR - Malaysian Ringgit' },
  { value: 'PHP', label: 'PHP - Philippine Peso' },
  { value: 'VND', label: 'VND - Vietnamese Dong' },
  { value: 'PLN', label: 'PLN - Polish Zloty' },
  { value: 'CZK', label: 'CZK - Czech Koruna' },
  { value: 'HUF', label: 'HUF - Hungarian Forint' },
  { value: 'RON', label: 'RON - Romanian Leu' },
  { value: 'TRY', label: 'TRY - Turkish Lira' },
  { value: 'ILS', label: 'ILS - Israeli Shekel' },
  { value: 'SAR', label: 'SAR - Saudi Riyal' },
  { value: 'QAR', label: 'QAR - Qatari Riyal' },
  { value: 'KWD', label: 'KWD - Kuwaiti Dinar' },
  { value: 'BHD', label: 'BHD - Bahraini Dinar' },
  { value: 'OMR', label: 'OMR - Omani Rial' },
  { value: 'EGP', label: 'EGP - Egyptian Pound' },
  { value: 'NGN', label: 'NGN - Nigerian Naira' },
  { value: 'KES', label: 'KES - Kenyan Shilling' },
  { value: 'GHS', label: 'GHS - Ghanaian Cedi' },
  { value: 'CLP', label: 'CLP - Chilean Peso' },
  { value: 'COP', label: 'COP - Colombian Peso' },
  { value: 'PEN', label: 'PEN - Peruvian Sol' },
  { value: 'ARS', label: 'ARS - Argentine Peso' },
  { value: 'UYU', label: 'UYU - Uruguayan Peso' },
  { value: 'PKR', label: 'PKR - Pakistani Rupee' },
  { value: 'BDT', label: 'BDT - Bangladeshi Taka' },
  { value: 'LKR', label: 'LKR - Sri Lankan Rupee' },
  { value: 'JOD', label: 'JOD - Jordanian Dinar' },
]

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function Settings() {
  const navigate = useNavigate()
  const { currency, setCurrency } = useCurrency()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCurrency, setSelectedCurrency] = useState(currency)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const hasChanges = selectedCurrency !== currency

  useEffect(() => {
    setSelectedCurrency(currency)
  }, [currency])

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

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await setCurrency(selectedCurrency)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Failed to save preferences.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold font-display text-white">Settings</h1>

      {loading && (
        <div className="text-slate-400 text-sm">Loading profile...</div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-400 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && user && (
        <div className="bg-navy-900 border border-navy-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold font-display text-white">Profile</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-navy-800">
              <span className="text-sm text-slate-400">Name</span>
              <span className="text-sm text-white font-medium">{user.name}</span>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-navy-800">
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

      <div className="bg-navy-900 border border-navy-800 rounded-xl p-6 mb-6 space-y-4">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider font-display">
          Preferences
        </h2>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-slate-400">Base Currency</span>
          <SearchableSelect
            options={CURRENCY_OPTIONS}
            value={selectedCurrency}
            onChange={setSelectedCurrency}
            placeholder="Search currencies..."
          />
        </div>
        <div className="flex items-center gap-3 pt-2 border-t border-navy-800">
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              hasChanges && !saving
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-navy-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {saving ? 'Saving...' : 'Save preferences'}
          </button>
          {saved && (
            <span className="text-sm text-emerald-400">Saved successfully</span>
          )}
        </div>
      </div>

      <div className="bg-navy-900 border border-navy-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold font-display text-white mb-4">Account</h2>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
        >
          Log out
        </button>
      </div>
    </div>
  )
}
