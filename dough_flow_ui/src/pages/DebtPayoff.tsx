import ConfirmDialog from '../components/ConfirmDialog'
import ErrorAlert from '../components/ErrorAlert'
import PageLoader from '../components/PageLoader'
import DebtFormModal from '../components/debt/DebtFormModal'
import DebtGroupManager from '../components/debt/DebtGroupManager'
import DebtList from '../components/debt/DebtList'
import DebtSelector from '../components/debt/DebtSelector'
import PayoffSimulator from '../components/debt/PayoffSimulator'
import { useCurrency } from '../contexts/CurrencyContext'
import useDebtData from '../hooks/useDebtData'

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`
}

export default function DebtPayoff() {
  const { formatCurrency } = useCurrency()
  const debt = useDebtData()

  if (debt.loading) return <PageLoader label="Loading debts..." />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display">Debt Payoff</h1>
          <p className="text-slate-400 text-sm mt-1">
            Track and prioritize your debts to pay them off faster
          </p>
        </div>
        <button
          onClick={debt.openCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          Add Debt
        </button>
      </div>

      {(debt.error || debt.fetchError) && !debt.modalOpen && !debt.groupModalOpen && (
        <ErrorAlert message={debt.error || debt.fetchError} />
      )}

      {debt.debts.length > 0 && debt.groupSummary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total Debt</p>
            <p className="text-xl font-bold text-red-400 font-mono">
              {formatCurrency(debt.groupSummary.total_current_balance)}
            </p>
          </div>
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">
              Original Principal
            </p>
            <p className="text-xl font-bold font-mono">
              {formatCurrency(debt.groupSummary.total_principal)}
            </p>
          </div>
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Weighted Rate</p>
            <p className="text-xl font-bold text-orange-400 font-mono">
              {formatPercent(debt.groupSummary.weighted_interest_rate)}
            </p>
          </div>
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Monthly Minimum</p>
            <p className="text-xl font-bold font-mono">
              {formatCurrency(debt.groupSummary.total_minimum_payment)}
            </p>
          </div>
        </div>
      )}

      {debt.debts.length > 0 && (
        <DebtSelector
          sortedDebts={debt.sortedDebts}
          groups={debt.groups}
          selectedDebtIds={debt.selectedDebtIds}
          getAccountName={debt.getAccountName}
          getGroupCheckState={debt.getGroupCheckState}
          toggleDebt={debt.toggleDebt}
          toggleGroup={debt.toggleGroup}
          selectAll={debt.selectAll}
          selectNone={debt.selectNone}
          openCreateGroup={debt.openCreateGroup}
          openEditGroup={debt.openEditGroup}
          openManageMembers={debt.openManageMembers}
          setConfirmGroupTarget={debt.setConfirmGroupTarget}
        />
      )}

      {debt.payoffSummary &&
        debt.groups.length > 0 &&
        debt.groups.map((group) => {
          const subtotal = debt.getGroupSubtotal(group)
          if (!subtotal) return null
          return (
            <div
              key={group.id}
              className="bg-navy-850 border border-navy-750 rounded-lg px-4 py-3 mb-3"
            >
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">
                {group.name} Subtotal
              </p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Balance: </span>
                  <span className="text-white font-mono">
                    {formatCurrency(subtotal.totalBalance)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Interest: </span>
                  <span className="text-red-400 font-mono">
                    {formatCurrency(subtotal.totalInterest)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Payoff: </span>
                  <span className="text-white font-mono">
                    {subtotal.maxMonths} month{subtotal.maxMonths !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          )
        })}

      {debt.debts.length > 0 && debt.selectedDebtIds.size > 0 && (
        <PayoffSimulator
          extraMonthly={debt.extraMonthly}
          setExtraMonthly={debt.setExtraMonthly}
          payoffSummary={debt.payoffSummary}
          simulatorLoading={debt.simulatorLoading}
          handleExtraChange={debt.handleExtraChange}
        />
      )}

      <DebtList
        sortedDebts={debt.sortedDebts}
        selectedDebtIds={debt.selectedDebtIds}
        payoffSummary={debt.payoffSummary}
        expandedDebtId={debt.expandedDebtId}
        setExpandedDebtId={debt.setExpandedDebtId}
        getAccountName={debt.getAccountName}
        getProjection={debt.getProjection}
        openEdit={debt.openEdit}
        setConfirmDebtTarget={debt.setConfirmDebtTarget}
      />

      <ConfirmDialog
        open={!!debt.confirmDebtTarget}
        title="Delete Debt"
        message="Delete this debt? This cannot be undone."
        onConfirm={async () => {
          if (debt.confirmDebtTarget) await debt.handleDeleteDebt(debt.confirmDebtTarget)
          debt.setConfirmDebtTarget(null)
        }}
        onCancel={() => debt.setConfirmDebtTarget(null)}
      />

      <ConfirmDialog
        open={!!debt.confirmGroupTarget}
        title="Delete Group"
        message="Delete this group? The debts themselves will not be deleted."
        onConfirm={async () => {
          if (debt.confirmGroupTarget) await debt.handleDeleteGroup(debt.confirmGroupTarget)
          debt.setConfirmGroupTarget(null)
        }}
        onCancel={() => debt.setConfirmGroupTarget(null)}
      />

      <DebtFormModal
        open={debt.modalOpen}
        editing={debt.editing}
        form={debt.form}
        formError={debt.formError}
        accounts={debt.accounts}
        onClose={debt.closeDebtModal}
        setForm={debt.setForm}
        onSubmit={debt.handleSubmit}
      />

      <DebtGroupManager
        groupModalOpen={debt.groupModalOpen}
        editingGroup={debt.editingGroup}
        groupName={debt.groupName}
        setGroupName={debt.setGroupName}
        closeGroupModal={debt.closeGroupModal}
        handleGroupSubmit={debt.handleGroupSubmit}
        managingGroup={debt.managingGroup}
        memberSelection={debt.memberSelection}
        sortedDebts={debt.sortedDebts}
        getAccountName={debt.getAccountName}
        closeManageMembers={debt.closeManageMembers}
        toggleMember={debt.toggleMember}
        saveMembers={debt.saveMembers}
      />
    </div>
  )
}
