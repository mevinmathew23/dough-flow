import BulkActionBar from '../components/transactions/BulkActionBar'
import TransactionFiltersBar from '../components/transactions/TransactionFilters'
import TransactionFormModal from '../components/transactions/TransactionFormModal'
import TransactionTable from '../components/transactions/TransactionTable'
import ConfirmDialog from '../components/ConfirmDialog'
import ErrorAlert from '../components/ErrorAlert'
import Modal from '../components/Modal'
import PageLoader from '../components/PageLoader'
import { useCurrency } from '../contexts/CurrencyContext'
import useTransactions from '../hooks/useTransactions'

export default function Transactions() {
  const { formatCurrency: baseFmtCurrency } = useCurrency()
  const t = useTransactions(baseFmtCurrency)

  if (t.loading) return <PageLoader label="Loading transactions..." />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-display">Transactions</h1>
        <button
          onClick={t.openCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          Add Transaction
        </button>
      </div>

      {t.successMessage && <p className="text-green-400 text-sm mb-4">{t.successMessage}</p>}
      {t.error && !t.modalOpen && <ErrorAlert message={t.error} />}

      <TransactionFiltersBar
        accounts={t.accounts}
        categories={t.categories}
        filterAccount={t.filterAccount}
        filterCategory={t.filterCategory}
        filterType={t.filterType}
        filterStartDate={t.filterStartDate}
        filterEndDate={t.filterEndDate}
        search={t.search}
        hasActiveFilters={t.hasActiveFilters}
        setFilterAccount={t.setFilterAccount}
        setFilterCategory={t.setFilterCategory}
        setFilterType={t.setFilterType}
        setFilterStartDate={t.setFilterStartDate}
        setFilterEndDate={t.setFilterEndDate}
        setSearch={t.setSearch}
        clearFilters={t.clearFilters}
      />

      {t.selected.size > 0 && (
        <BulkActionBar
          selectedCount={t.selected.size}
          categories={t.categories}
          bulkCategoryId={t.bulkCategoryId}
          setBulkCategoryId={t.setBulkCategoryId}
          bulkTypeId={t.bulkTypeId}
          setBulkTypeId={t.setBulkTypeId}
          onBulkCategorize={t.handleBulkCategorize}
          onBulkUpdateType={t.handleBulkUpdateType}
          onBulkDeleteClick={() => t.setDeleteConfirmOpen(true)}
          onCancel={t.clearSelection}
        />
      )}

      <TransactionTable
        transactions={t.transactions}
        selected={t.selected}
        hasActiveFilters={t.hasActiveFilters}
        getCategoryName={t.getCategoryName}
        getAccountName={t.getAccountName}
        formatCurrency={t.formatCurrency}
        toggleSelect={t.toggleSelect}
        toggleSelectAll={t.toggleSelectAll}
        openEdit={t.openEdit}
        setConfirmSingleTarget={t.setConfirmSingleTarget}
      />

      <ConfirmDialog
        open={!!t.confirmSingleTarget}
        title="Delete Transaction"
        message="Delete this transaction?"
        onConfirm={async () => {
          if (t.confirmSingleTarget) await t.handleDelete(t.confirmSingleTarget)
          t.setConfirmSingleTarget(null)
        }}
        onCancel={() => t.setConfirmSingleTarget(null)}
      />

      <Modal
        open={t.deleteConfirmOpen}
        onClose={() => t.setDeleteConfirmOpen(false)}
        title="Confirm Bulk Delete"
      >
        <p className="text-slate-300 text-sm mb-2">
          Are you sure you want to delete {t.selected.size} transaction
          {t.selected.size !== 1 ? 's' : ''}?
        </p>
        <p className="text-slate-400 text-sm mb-6">
          Total amount: {t.formatCurrency(t.selectedTotal)}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => t.setDeleteConfirmOpen(false)}
            className="text-slate-400 hover:text-white px-4 py-2 rounded-lg text-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={t.handleBulkDelete}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            Delete {t.selected.size} Transaction{t.selected.size !== 1 ? 's' : ''}
          </button>
        </div>
      </Modal>

      <TransactionFormModal
        open={t.modalOpen}
        editing={t.editing}
        form={t.form}
        formError={t.formError}
        accounts={t.accounts}
        categories={t.categories}
        onClose={t.closeModal}
        setForm={t.setForm}
        onSubmit={t.handleSubmit}
      />
    </div>
  )
}
