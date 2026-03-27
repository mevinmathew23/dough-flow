import { useEffect, useState } from 'react'
import { fetchAccounts } from '../api/accounts'
import {
  createDebt,
  deleteDebt,
  fetchDebts,
  fetchDebtGroupSummary,
  fetchPayoffSummary,
  updateDebt,
} from '../api/debts'
import {
  createDebtGroup,
  deleteDebtGroup,
  fetchDebtGroups,
  updateDebtGroup,
  updateDebtGroupMembers,
} from '../api/debtGroups'
import useFetch from './useFetch'
import {
  Account,
  CompoundingFrequency,
  Debt,
  DebtGroup,
  DebtGroupSummary,
  PayoffSummary,
} from '../types'

const STORAGE_KEY = 'doughflow:payoff-selection'

export const emptyDebtForm = {
  account_id: '',
  principal_amount: '',
  current_balance: '',
  interest_rate: '',
  minimum_payment: '',
  compounding_frequency: 'monthly' as CompoundingFrequency,
  priority_order: '1',
  target_payoff_date: '',
}

export type DebtFormState = typeof emptyDebtForm

export interface UseDebtDataReturn {
  // Data
  debts: Debt[]
  accounts: Account[]
  groups: DebtGroup[]
  groupSummary: DebtGroupSummary | null
  sortedDebts: Debt[]
  loading: boolean
  error: string
  fetchError: string
  setError: (msg: string) => void

  // Simulator
  extraMonthly: number
  setExtraMonthly: (value: number) => void
  payoffSummary: PayoffSummary | null
  simulatorLoading: boolean
  expandedDebtId: string | null
  setExpandedDebtId: (id: string | null) => void
  handleExtraChange: (value: number) => void
  getProjection: (debtId: string) => PayoffSummary['projections'][number] | null

  // Selection
  selectedDebtIds: Set<string>
  toggleDebt: (debtId: string) => void
  toggleGroup: (group: DebtGroup) => void
  selectAll: () => void
  selectNone: () => void
  getGroupCheckState: (group: DebtGroup) => 'all' | 'some' | 'none'

  // Group subtotals
  getGroupSubtotal: (
    group: DebtGroup,
  ) => { totalBalance: number; totalInterest: number; maxMonths: number; count: number } | null

  // Debt CRUD modals
  modalOpen: boolean
  editing: Debt | null
  form: DebtFormState
  formError: string
  setForm: (form: DebtFormState) => void
  setFormError: (msg: string) => void
  openCreate: () => void
  openEdit: (debt: Debt) => void
  closeDebtModal: () => void
  handleSubmit: (e: React.FormEvent) => Promise<void>
  confirmDebtTarget: string | null
  setConfirmDebtTarget: (id: string | null) => void
  handleDeleteDebt: (id: string) => Promise<void>

  // Group management modals
  groupModalOpen: boolean
  editingGroup: DebtGroup | null
  groupName: string
  setGroupName: (name: string) => void
  openCreateGroup: () => void
  openEditGroup: (group: DebtGroup) => void
  closeGroupModal: () => void
  handleGroupSubmit: (e: React.FormEvent) => Promise<void>
  confirmGroupTarget: string | null
  setConfirmGroupTarget: (id: string | null) => void
  handleDeleteGroup: (groupId: string) => Promise<void>

  // Group member management
  managingGroup: DebtGroup | null
  memberSelection: Set<string>
  openManageMembers: (group: DebtGroup) => void
  closeManageMembers: () => void
  toggleMember: (debtId: string) => void
  saveMembers: () => Promise<void>

  // Helpers
  getAccountName: (accountId: string) => string
}

export default function useDebtData(): UseDebtDataReturn {
  const {
    data: debtsData,
    loading,
    error: fetchError,
    refetch: refetchDebts,
  } = useFetch(fetchDebts)
  const { data: accountsData, refetch: refetchAccounts } = useFetch(fetchAccounts)
  const { data: groupSummaryData, refetch: refetchGroupSummary } = useFetch(fetchDebtGroupSummary)
  const { data: groupsData, refetch: refetchGroups } = useFetch(fetchDebtGroups)

  const debts: Debt[] = debtsData ?? []
  const accounts: Account[] = accountsData ?? []
  const groupSummary: DebtGroupSummary | null = groupSummaryData ?? null
  const groups: DebtGroup[] = groupsData ?? []

  const [error, setError] = useState('')

  const refetchAll = () => {
    refetchDebts()
    refetchAccounts()
    refetchGroupSummary()
    refetchGroups()
  }

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Debt | null>(null)
  const [form, setForm] = useState<DebtFormState>(emptyDebtForm)
  const [formError, setFormError] = useState('')

  // Simulator
  const [extraMonthly, setExtraMonthly] = useState(0)
  const [payoffSummary, setPayoffSummary] = useState<PayoffSummary | null>(null)
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null)
  const [simulatorLoading, setSimulatorLoading] = useState(false)

  // Group modals
  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<DebtGroup | null>(null)
  const [groupName, setGroupName] = useState('')
  const [managingGroup, setManagingGroup] = useState<DebtGroup | null>(null)
  const [memberSelection, setMemberSelection] = useState<Set<string>>(new Set())

  // Selection
  const [selectedDebtIds, setSelectedDebtIds] = useState<Set<string>>(new Set())
  const [selectionInitialized, setSelectionInitialized] = useState(false)

  // Confirm dialogs
  const [confirmDebtTarget, setConfirmDebtTarget] = useState<string | null>(null)
  const [confirmGroupTarget, setConfirmGroupTarget] = useState<string | null>(null)

  // -------------------------------------------------------------------------
  // Selection initialization & persistence
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (debts.length === 0 || selectionInitialized) return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const ids: string[] = JSON.parse(saved)
        const validIds = ids.filter((id) => debts.some((d) => d.id === id))
        if (validIds.length > 0) {
          setSelectedDebtIds(new Set(validIds))
          setSelectionInitialized(true)
          return
        }
      }
    } catch {
      // ignore parse errors
    }
    setSelectedDebtIds(new Set(debts.map((d) => d.id)))
    setSelectionInitialized(true)
  }, [debts, selectionInitialized])

  useEffect(() => {
    if (!selectionInitialized) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(selectedDebtIds)))
  }, [selectedDebtIds, selectionInitialized])

  useEffect(() => {
    if (!selectionInitialized || selectedDebtIds.size === 0) {
      setPayoffSummary(null)
      return
    }
    runFetchPayoff(extraMonthly)
  }, [selectionInitialized, selectedDebtIds]) // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Simulator
  // -------------------------------------------------------------------------

  const runFetchPayoff = async (extra: number) => {
    if (selectedDebtIds.size === 0) {
      setPayoffSummary(null)
      return
    }
    setSimulatorLoading(true)
    try {
      const result = await fetchPayoffSummary(Array.from(selectedDebtIds), extra)
      setPayoffSummary(result)
    } catch {
      // non-critical
    } finally {
      setSimulatorLoading(false)
    }
  }

  const handleExtraChange = (value: number) => {
    runFetchPayoff(value)
  }

  // -------------------------------------------------------------------------
  // Selection helpers
  // -------------------------------------------------------------------------

  const toggleDebt = (debtId: string) => {
    setSelectedDebtIds((prev) => {
      const next = new Set(prev)
      if (next.has(debtId)) next.delete(debtId)
      else next.add(debtId)
      return next
    })
  }

  const toggleGroup = (group: DebtGroup) => {
    const allSelected = group.debt_ids.every((id) => selectedDebtIds.has(id))
    setSelectedDebtIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        group.debt_ids.forEach((id) => next.delete(id))
      } else {
        group.debt_ids.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const selectAll = () => setSelectedDebtIds(new Set(debts.map((d) => d.id)))
  const selectNone = () => setSelectedDebtIds(new Set())

  const getGroupCheckState = (group: DebtGroup): 'all' | 'some' | 'none' => {
    if (group.debt_ids.length === 0) return 'none'
    const selectedCount = group.debt_ids.filter((id) => selectedDebtIds.has(id)).length
    if (selectedCount === group.debt_ids.length) return 'all'
    if (selectedCount > 0) return 'some'
    return 'none'
  }

  // -------------------------------------------------------------------------
  // Group management
  // -------------------------------------------------------------------------

  const openCreateGroup = () => {
    setEditingGroup(null)
    setGroupName('')
    setGroupModalOpen(true)
  }

  const openEditGroup = (group: DebtGroup) => {
    setEditingGroup(group)
    setGroupName(group.name)
    setGroupModalOpen(true)
  }

  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim()) return
    try {
      if (editingGroup) {
        await updateDebtGroup(editingGroup.id, groupName.trim())
      } else {
        await createDebtGroup(groupName.trim())
      }
      setGroupModalOpen(false)
      refetchGroups()
    } catch {
      setError('Failed to save group')
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteDebtGroup(groupId)
      refetchGroups()
    } catch {
      setError('Failed to delete group')
    }
  }

  const openManageMembers = (group: DebtGroup) => {
    setManagingGroup(group)
    setMemberSelection(new Set(group.debt_ids))
  }

  const toggleMember = (debtId: string) => {
    setMemberSelection((prev) => {
      const next = new Set(prev)
      if (next.has(debtId)) next.delete(debtId)
      else next.add(debtId)
      return next
    })
  }

  const saveMembers = async () => {
    if (!managingGroup) return
    try {
      await updateDebtGroupMembers(managingGroup.id, Array.from(memberSelection))
      setManagingGroup(null)
      refetchGroups()
    } catch {
      setError('Failed to update group members')
    }
  }

  // -------------------------------------------------------------------------
  // Debt CRUD
  // -------------------------------------------------------------------------

  const getAccountName = (accountId: string): string => {
    const acct = accounts.find((a) => a.id === accountId)
    return acct ? acct.name : '—'
  }

  const getProjection = (debtId: string) =>
    payoffSummary?.projections.find((p) => p.debt_id === debtId) ?? null

  const openCreate = () => {
    setEditing(null)
    setForm({
      ...emptyDebtForm,
      account_id: accounts.length > 0 ? accounts[0].id : '',
      priority_order: String(debts.length + 1),
    })
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (debt: Debt) => {
    setEditing(debt)
    setForm({
      account_id: debt.account_id,
      principal_amount: String(debt.principal_amount),
      current_balance: String(debt.current_balance),
      interest_rate: String(debt.interest_rate * 100),
      minimum_payment: String(debt.minimum_payment),
      compounding_frequency: debt.compounding_frequency,
      priority_order: String(debt.priority_order),
      target_payoff_date: debt.target_payoff_date ?? '',
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const currentBalance = parseFloat(form.current_balance)
    const interestRate = parseFloat(form.interest_rate)
    const minimumPayment = parseFloat(form.minimum_payment)
    const priorityOrder = parseInt(form.priority_order)

    if (isNaN(currentBalance) || currentBalance < 0) {
      setFormError('Current balance must be a valid number')
      return
    }
    if (isNaN(interestRate) || interestRate < 0 || interestRate >= 100) {
      setFormError('Interest rate must be between 0 and 100')
      return
    }
    if (isNaN(minimumPayment) || minimumPayment < 0) {
      setFormError('Minimum payment must be a valid number')
      return
    }
    if (isNaN(priorityOrder)) {
      setFormError('Priority order must be a valid number')
      return
    }

    try {
      if (editing) {
        await updateDebt(editing.id, {
          current_balance: currentBalance,
          interest_rate: interestRate / 100,
          minimum_payment: minimumPayment,
          compounding_frequency: form.compounding_frequency,
          priority_order: priorityOrder || 0,
          target_payoff_date: form.target_payoff_date || null,
        })
      } else {
        const principalAmount = parseFloat(form.principal_amount)
        if (isNaN(principalAmount) || principalAmount <= 0) {
          setFormError('Principal amount must be a positive number')
          return
        }
        await createDebt({
          account_id: form.account_id,
          principal_amount: principalAmount,
          current_balance: currentBalance,
          interest_rate: interestRate / 100,
          minimum_payment: minimumPayment,
          compounding_frequency: form.compounding_frequency,
          priority_order: priorityOrder || 1,
          target_payoff_date: form.target_payoff_date || null,
        })
      }
      setModalOpen(false)
      refetchAll()
    } catch {
      setFormError(editing ? 'Failed to update debt' : 'Failed to create debt')
    }
  }

  const handleDeleteDebt = async (id: string) => {
    try {
      await deleteDebt(id)
      refetchAll()
    } catch {
      setError('Failed to delete debt')
    }
  }

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const sortedDebts = [...debts].sort((a, b) => a.priority_order - b.priority_order)

  const getGroupSubtotal = (group: DebtGroup) => {
    const selectedGroupDebts = debts.filter(
      (d) => group.debt_ids.includes(d.id) && selectedDebtIds.has(d.id),
    )
    if (selectedGroupDebts.length === 0) return null
    const totalBalance = selectedGroupDebts.reduce((s, d) => s + d.current_balance, 0)
    const totalInterest = selectedGroupDebts.reduce((s, d) => {
      const proj = getProjection(d.id)
      return s + (proj?.total_interest ?? 0)
    }, 0)
    const maxMonths = Math.max(
      ...selectedGroupDebts.map((d) => {
        const proj = getProjection(d.id)
        return proj?.months_to_payoff ?? 0
      }),
    )
    return { totalBalance, totalInterest, maxMonths, count: selectedGroupDebts.length }
  }

  return {
    debts,
    accounts,
    groups,
    groupSummary,
    sortedDebts,
    loading,
    error,
    fetchError,
    setError,

    extraMonthly,
    setExtraMonthly,
    payoffSummary,
    simulatorLoading,
    expandedDebtId,
    setExpandedDebtId,
    handleExtraChange,
    getProjection,

    selectedDebtIds,
    toggleDebt,
    toggleGroup,
    selectAll,
    selectNone,
    getGroupCheckState,
    getGroupSubtotal,

    modalOpen,
    editing,
    form,
    formError,
    setForm,
    setFormError,
    openCreate,
    openEdit,
    closeDebtModal: () => setModalOpen(false),
    handleSubmit,
    confirmDebtTarget,
    setConfirmDebtTarget,
    handleDeleteDebt,

    groupModalOpen,
    editingGroup,
    groupName,
    setGroupName,
    openCreateGroup,
    openEditGroup,
    closeGroupModal: () => setGroupModalOpen(false),
    handleGroupSubmit,
    confirmGroupTarget,
    setConfirmGroupTarget,
    handleDeleteGroup,

    managingGroup,
    memberSelection,
    openManageMembers,
    closeManageMembers: () => setManagingGroup(null),
    toggleMember,
    saveMembers,

    getAccountName,
  }
}
