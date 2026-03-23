import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api/client'

interface CurrencyContextValue {
  currency: string
  setCurrency: (currency: string) => void
  formatCurrency: (amount: number) => string
  formatCompact: (amount: number) => string
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: 'USD',
  setCurrency: () => {},
  formatCurrency: (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount),
  formatCompact: (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount),
})

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState('USD')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    api
      .get('/auth/me')
      .then((res) => {
        if (res.data.currency) setCurrencyState(res.data.currency)
      })
      .catch(() => {})
  }, [])

  const setCurrency = async (newCurrency: string) => {
    const previous = currency
    setCurrencyState(newCurrency)
    try {
      await api.patch('/auth/settings', { currency: newCurrency })
    } catch (err) {
      setCurrencyState(previous)
      throw err
    }
  }

  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)

  const formatCompact = (amount: number): string => {
    if (Math.abs(amount) >= 1000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(amount)
    }
    return formatCurrency(amount)
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency, formatCompact }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
