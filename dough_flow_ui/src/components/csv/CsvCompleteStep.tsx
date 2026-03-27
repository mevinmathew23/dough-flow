interface CsvCompleteStepProps {
  confirmResult: { imported_count: number; skipped_duplicates: number } | null
  onViewTransactions: () => void
  onImportAnother: () => void
}

export default function CsvCompleteStep({
  confirmResult,
  onViewTransactions,
  onImportAnother,
}: CsvCompleteStepProps) {
  return (
    <div className="flex flex-col items-center py-12 space-y-6 text-center">
      <div className="w-16 h-16 rounded-full bg-green-900/50 border border-green-700 flex items-center justify-center text-3xl">
        ✓
      </div>
      <div>
        <h2 className="text-xl font-bold font-display text-slate-100 mb-1">Import Complete</h2>
        {confirmResult && (
          <p className="text-slate-400 text-sm">
            {confirmResult.imported_count} transaction
            {confirmResult.imported_count !== 1 ? 's' : ''} imported
            {confirmResult.skipped_duplicates > 0 && (
              <span>
                , {confirmResult.skipped_duplicates} skipped as duplicate
                {confirmResult.skipped_duplicates !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          onClick={onViewTransactions}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          View Transactions
        </button>
        <button
          onClick={onImportAnother}
          className="border border-slate-600 hover:border-slate-500 text-slate-300 px-6 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          Import Another
        </button>
      </div>
    </div>
  )
}
