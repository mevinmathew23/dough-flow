import { Category, CSVPreviewResponse, CSVPreviewRow } from '../../types'
import { useCurrency } from '../../contexts/CurrencyContext'

const inputClass =
  'bg-navy-850 border border-navy-750 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 w-full'

interface CsvPreviewStepProps {
  previewData: CSVPreviewResponse | null
  categories: Category[]
  includeDuplicates: boolean
  setIncludeDuplicates: (val: boolean) => void
  saveMapping: boolean
  setSaveMapping: (val: boolean) => void
  institutionName: string
  setInstitutionName: (name: string) => void
  dateTolerance: number
  setDateTolerance: (val: number) => void
  transferLinks: Record<number, boolean>
  setTransferLinks: (fn: (prev: Record<number, boolean>) => Record<number, boolean>) => void
  categoryOverrides: Record<number, string>
  setCategoryOverrides: (fn: (prev: Record<number, string>) => Record<number, string>) => void
  rowsToImport: CSVPreviewResponse['rows']
  loading: boolean
  error: string
  skippedMapping: boolean
  columnMapping: Record<string, string>
  dateFormat: string
  runPreview: (mapping: Record<string, string>, format: string) => Promise<void>
  handleConfirm: () => Promise<void>
  setStep: (step: import('../../hooks/useCsvImportWizard').WizardStep) => void
}

function PreviewRow({
  row,
  idx,
  includeDuplicates,
  categories,
  transferLinks,
  setTransferLinks,
  categoryOverrides,
  setCategoryOverrides,
  formatCurrency,
}: {
  row: CSVPreviewRow
  idx: number
  includeDuplicates: boolean
  categories: Category[]
  transferLinks: Record<number, boolean>
  setTransferLinks: (fn: (prev: Record<number, boolean>) => Record<number, boolean>) => void
  categoryOverrides: Record<number, string>
  setCategoryOverrides: (fn: (prev: Record<number, string>) => Record<number, string>) => void
  formatCurrency: (amount: number) => string
}) {
  const isDuplicate = row.is_duplicate
  const hasTransferMatch = !!row.transfer_match
  const isLinked = transferLinks[idx] ?? false

  return (
    <tr
      className={`border-t border-navy-800 transition-opacity ${
        isDuplicate && !includeDuplicates ? 'opacity-30' : ''
      } ${row.match_method === 'unmatched' && row.category_name ? 'bg-red-950/20' : ''}`}
    >
      <td
        className={`px-4 py-2 text-sm text-slate-300 ${isDuplicate ? 'line-through text-slate-500' : ''}`}
      >
        {row.date}
      </td>
      <td
        className={`px-4 py-2 text-sm text-slate-300 max-w-xs truncate ${isDuplicate ? 'line-through text-slate-500' : ''}`}
      >
        {row.description}
      </td>
      <td
        className={`px-4 py-2 text-sm text-right font-mono ${
          isDuplicate
            ? 'line-through text-slate-500'
            : row.amount >= 0
              ? 'text-green-400'
              : 'text-red-400'
        }`}
      >
        {formatCurrency(row.amount)}
      </td>
      <td className="px-4 py-2">
        <select
          value={categoryOverrides[idx] ?? row.resolved_category_name ?? row.category_name ?? ''}
          onChange={(e) => setCategoryOverrides((prev) => ({ ...prev, [idx]: e.target.value }))}
          className="bg-navy-850 border border-navy-750 rounded px-2 py-1 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 w-full"
        >
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
        {row.match_method && !categoryOverrides[idx] && (
          <span
            className={`inline-block ml-1.5 mt-1 text-xs px-1.5 py-0.5 rounded ${
              row.match_method === 'exact' || row.match_method === 'institution'
                ? 'bg-emerald-900/60 text-emerald-400'
                : row.match_method === 'fuzzy'
                  ? 'bg-yellow-900/60 text-yellow-400'
                  : 'bg-red-900/60 text-red-400'
            }`}
            title={
              row.match_method === 'fuzzy' && row.confidence
                ? `Fuzzy match (${Math.round(row.confidence * 100)}%)`
                : (row.match_method ?? undefined)
            }
          >
            {row.match_method === 'exact' || row.match_method === 'institution'
              ? '✓'
              : row.match_method === 'fuzzy'
                ? '~'
                : '?'}
          </span>
        )}
      </td>
      <td className="px-4 py-2">
        {isDuplicate && (
          <span className="text-xs bg-yellow-900/60 text-yellow-400 px-2 py-0.5 rounded-full">
            duplicate
          </span>
        )}
        {hasTransferMatch && !isDuplicate && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isLinked}
                onChange={(e) => setTransferLinks((prev) => ({ ...prev, [idx]: e.target.checked }))}
                className="w-3.5 h-3.5 accent-blue-500"
              />
              <span className="text-xs bg-blue-900/60 text-blue-400 px-2 py-0.5 rounded-full whitespace-nowrap">
                Transfer: {row.transfer_match!.account_name} &middot; {row.transfer_match!.date}
              </span>
            </label>
          </div>
        )}
      </td>
    </tr>
  )
}

export default function CsvPreviewStep({
  previewData,
  categories,
  includeDuplicates,
  setIncludeDuplicates,
  saveMapping,
  setSaveMapping,
  institutionName,
  setInstitutionName,
  dateTolerance,
  setDateTolerance,
  transferLinks,
  setTransferLinks,
  categoryOverrides,
  setCategoryOverrides,
  rowsToImport,
  loading,
  error,
  skippedMapping,
  columnMapping,
  dateFormat,
  runPreview,
  handleConfirm,
  setStep,
}: CsvPreviewStepProps) {
  const { formatCurrency } = useCurrency()

  return (
    <div className="space-y-6">
      {previewData && (
        <>
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              {previewData.total_rows} rows detected
              {previewData.duplicate_count > 0 && (
                <span className="ml-2 text-yellow-400">
                  · {previewData.duplicate_count} potential duplicate
                  {previewData.duplicate_count !== 1 ? 's' : ''}
                </span>
              )}
              {previewData.transfer_match_count > 0 && (
                <span className="ml-2 text-blue-400">
                  · {previewData.transfer_match_count} transfer match
                  {previewData.transfer_match_count !== 1 ? 'es' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-slate-400">
                Match transfers within
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={dateTolerance}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    if (val >= 1 && val <= 30) {
                      setDateTolerance(val)
                      runPreview(columnMapping, dateFormat)
                    }
                  }}
                  className="w-14 bg-navy-850 border border-navy-750 rounded px-2 py-1 text-sm text-slate-300 text-center focus:outline-none focus:border-emerald-500"
                />
                days
              </label>
              <div className="text-sm font-medium text-slate-200">
                {rowsToImport.length} row{rowsToImport.length !== 1 ? 's' : ''} will be imported
              </div>
            </div>
          </div>

          {previewData.duplicate_count > 0 && (
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeDuplicates}
                onChange={(e) => setIncludeDuplicates(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
              <span className="text-sm text-slate-300">
                Include duplicate rows ({previewData.duplicate_count})
              </span>
            </label>
          )}

          <div className="overflow-x-auto rounded-lg border border-navy-800 max-h-96 overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-navy-850/80 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Date
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Description
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide text-right">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Category
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {previewData.rows.map((row, idx) => (
                  <PreviewRow
                    key={idx}
                    row={row}
                    idx={idx}
                    includeDuplicates={includeDuplicates}
                    categories={categories}
                    transferLinks={transferLinks}
                    setTransferLinks={setTransferLinks}
                    categoryOverrides={categoryOverrides}
                    setCategoryOverrides={setCategoryOverrides}
                    formatCurrency={formatCurrency}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-navy-850/50 border border-navy-750 rounded-lg p-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveMapping}
                onChange={(e) => setSaveMapping(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
              <span className="text-sm text-slate-300">Save column mapping for future imports</span>
            </label>
            {saveMapping && (
              <input
                type="text"
                placeholder="Institution name (e.g. Chase, Bank of America)"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                className={inputClass}
              />
            )}
          </div>
        </>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => setStep(skippedMapping ? 1 : 2)}
          className="border border-slate-600 hover:border-slate-500 text-slate-300 px-6 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          Back
        </button>
        <button
          onClick={handleConfirm}
          disabled={
            loading || rowsToImport.length === 0 || (saveMapping && !institutionName.trim())
          }
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          {loading
            ? 'Importing...'
            : `Import ${rowsToImport.length} row${rowsToImport.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  )
}
