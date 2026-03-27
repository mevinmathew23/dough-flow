import { Debt, DebtGroup } from '../../types'
import { inputClass } from '../../constants/styles'
import { useCurrency } from '../../contexts/CurrencyContext'
import Modal from '../Modal'

interface DebtGroupManagerProps {
  // Group create/rename modal
  groupModalOpen: boolean
  editingGroup: DebtGroup | null
  groupName: string
  setGroupName: (name: string) => void
  closeGroupModal: () => void
  handleGroupSubmit: (e: React.FormEvent) => Promise<void>

  // Manage members modal
  managingGroup: DebtGroup | null
  memberSelection: Set<string>
  sortedDebts: Debt[]
  getAccountName: (accountId: string) => string
  closeManageMembers: () => void
  toggleMember: (debtId: string) => void
  saveMembers: () => Promise<void>
}

export default function DebtGroupManager({
  groupModalOpen,
  editingGroup,
  groupName,
  setGroupName,
  closeGroupModal,
  handleGroupSubmit,
  managingGroup,
  memberSelection,
  sortedDebts,
  getAccountName,
  closeManageMembers,
  toggleMember,
  saveMembers,
}: DebtGroupManagerProps) {
  const { formatCurrency } = useCurrency()

  return (
    <>
      <Modal
        open={groupModalOpen}
        onClose={closeGroupModal}
        title={editingGroup ? 'Rename Group' : 'New Group'}
      >
        <form onSubmit={handleGroupSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className={inputClass}
            required
            maxLength={100}
          />
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            {editingGroup ? 'Rename' : 'Create Group'}
          </button>
        </form>
      </Modal>

      <Modal
        open={!!managingGroup}
        onClose={closeManageMembers}
        title={managingGroup ? `Manage: ${managingGroup.name}` : 'Manage Members'}
      >
        <div className="space-y-2 mb-4">
          {sortedDebts.map((debt) => (
            <label
              key={debt.id}
              className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-navy-850 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={memberSelection.has(debt.id)}
                onChange={() => toggleMember(debt.id)}
                className="w-4 h-4 accent-emerald-500"
              />
              <span className="text-sm text-slate-300">{getAccountName(debt.account_id)}</span>
              <span className="text-xs text-slate-500 font-mono ml-auto">
                {formatCurrency(debt.current_balance)}
              </span>
            </label>
          ))}
        </div>
        <button
          onClick={saveMembers}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          Save Members
        </button>
      </Modal>
    </>
  )
}
