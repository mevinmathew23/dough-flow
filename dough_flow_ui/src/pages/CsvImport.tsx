import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import StepIndicator from '../components/StepIndicator'
import { useCurrency } from '../contexts/CurrencyContext'
import { Account, Category, CSVMapping, CSVPreviewResponse, CSVPreviewRow } from '../types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DATE_FORMAT_OPTIONS: { label: string; value: string }[] = [
  { label: 'MM/DD/YYYY (e.g. 01/31/2024)', value: '%m/%d/%Y' },
  { label: 'YYYY-MM-DD (e.g. 2024-01-31)', value: '%Y-%m-%d' },
  { label: 'DD/MM/YYYY (e.g. 31/01/2024)', value: '%d/%m/%Y' },
  { label: 'MM-DD-YYYY (e.g. 01-31-2024)', value: '%m-%d-%Y' },
]

const SEMANTIC_FIELDS: { key: string; label: string; required: boolean }[] = [
  { key: 'date', label: 'Date', required: true },
  { key: 'description', label: 'Description', required: true },
  { key: 'amount', label: 'Amount', required: true },
  { key: 'category', label: 'Category', required: false },
]

const inputClass =
  'bg-navy-850 border border-navy-750 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 w-full'

const selectClass =
  'bg-navy-850 border border-navy-750 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 w-full'

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/**
 * Auto-map CSV column headers to semantic field keys by fuzzy name matching.
 * Returns a Record where key = semantic field, value = CSV column header.
 */
function autoMapColumns(columns: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  const matchers: Record<string, string[]> = {
    date: ['date', 'trans date', 'transaction date', 'posted date', 'post date'],
    description: ['description', 'desc', 'memo', 'payee', 'merchant', 'details', 'narrative'],
    amount: ['amount', 'debit', 'credit', 'transaction amount', 'sum'],
    category: ['category', 'cat', 'type', 'label'],
  }

  for (const [field, keywords] of Object.entries(matchers)) {
    for (const col of columns) {
      const lower = col.toLowerCase()
      if (keywords.some((kw) => lower.includes(kw))) {
        mapping[field] = col
        break
      }
    }
  }
  return mapping
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type WizardStep = 1 | 2 | 3 | 4

export default function CsvImport() {
  const navigate = useNavigate()
  const { formatCurrency } = useCurrency()

  // Shared state
  const [step, setStep] = useState<WizardStep>(1)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [savedMappings, setSavedMappings] = useState<CSVMapping[]>([])

  // Step 1
  const [file, setFile] = useState<File | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [selectedMappingId, setSelectedMappingId] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 2
  const [detectedColumns, setDetectedColumns] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [dateFormat, setDateFormat] = useState<string>('%m/%d/%Y')

  // Step 2 skip tracking
  const [skippedMapping, setSkippedMapping] = useState(false)

  // Step 3
  const [previewData, setPreviewData] = useState<CSVPreviewResponse | null>(null)
  const [includeDuplicates, setIncludeDuplicates] = useState(false)
  const [saveMapping, setSaveMapping] = useState(false)
  const [institutionName, setInstitutionName] = useState('')
  const [dateTolerance, setDateTolerance] = useState(5)
  const [transferLinks, setTransferLinks] = useState<Record<number, boolean>>({})
  const [categoryOverrides, setCategoryOverrides] = useState<Record<number, string>>({})

  // Step 4 (confirm result)
  const [confirmResult, setConfirmResult] = useState<{
    imported_count: number
    skipped_duplicates: number
  } | null>(null)

  // Loading / error
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // -------------------------------------------------------------------------
  // Initial data fetch
  // -------------------------------------------------------------------------

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [accountsRes, mappingsRes, categoriesRes] = await Promise.all([
          api.get<Account[]>('/accounts'),
          api.get<CSVMapping[]>('/csv/mappings'),
          api.get<Category[]>('/categories'),
        ])
        setAccounts(accountsRes.data)
        setSavedMappings(mappingsRes.data)
        setCategories(categoriesRes.data)
        if (accountsRes.data.length > 0) {
          setSelectedAccountId(accountsRes.data[0].id)
        }
      } catch {
        setError('Failed to load accounts or saved mappings')
      }
    }
    fetchInitialData()
  }, [])

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const selectedMapping = savedMappings.find((m) => m.id === selectedMappingId) ?? null

  const rowsToImport = previewData
    ? previewData.rows.filter((r) => includeDuplicates || !r.is_duplicate)
    : []

  // -------------------------------------------------------------------------
  // Step 1 handlers
  // -------------------------------------------------------------------------

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setError('')
    // Reset downstream state when a new file is picked
    setDetectedColumns([])
    setColumnMapping({})
    setPreviewData(null)
    setSelectedMappingId('')
  }

  const handleDeleteMapping = async (mappingId: string) => {
    if (!confirm('Delete this saved mapping? This cannot be undone.')) return
    try {
      await api.delete(`/csv/mappings/${mappingId}`)
      setSavedMappings((prev) => prev.filter((m) => m.id !== mappingId))
      if (selectedMappingId === mappingId) {
        setSelectedMappingId('')
      }
    } catch {
      setError('Failed to delete mapping')
    }
  }

  /**
   * Proceed from step 1.
   * If a saved mapping is selected, skip column-map step and go straight to preview.
   * Otherwise, call detect-columns and go to step 2.
   */
  const handleStep1Next = async () => {
    if (!file) {
      setError('Please select a CSV file')
      return
    }
    setError('')

    if (selectedMapping) {
      // Apply the saved mapping + date format then jump to preview
      setColumnMapping(selectedMapping.column_mapping)
      setDateFormat(selectedMapping.date_format)
      setSkippedMapping(true)
      await runPreview(selectedMapping.column_mapping, selectedMapping.date_format)
    } else {
      setSkippedMapping(false)
      await detectColumns()
    }
  }

  const detectColumns = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post<{ columns: string[] }>('/csv/detect-columns', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const cols = res.data.columns
      setDetectedColumns(cols)
      setColumnMapping(autoMapColumns(cols))
      setStep(2)
    } catch {
      setError('Failed to detect CSV columns. Ensure the file is a valid CSV.')
    } finally {
      setLoading(false)
    }
  }

  // -------------------------------------------------------------------------
  // Step 2 handlers
  // -------------------------------------------------------------------------

  const handleMappingChange = (semanticField: string, csvColumn: string) => {
    setColumnMapping((prev) => {
      const updated = { ...prev }
      if (csvColumn === '') {
        delete updated[semanticField]
      } else {
        updated[semanticField] = csvColumn
      }
      return updated
    })
  }

  const isMappingValid = (): boolean => {
    return SEMANTIC_FIELDS.filter((f) => f.required).every((f) => Boolean(columnMapping[f.key]))
  }

  const handleStep2Next = async () => {
    if (!isMappingValid()) {
      setError('Please map all required fields (date, description, amount)')
      return
    }
    await runPreview(columnMapping, dateFormat)
  }

  // -------------------------------------------------------------------------
  // Preview (shared between step 1 saved-mapping path and step 2)
  // -------------------------------------------------------------------------

  const runPreview = async (mapping: Record<string, string>, format: string) => {
    if (!file) {
      setError('Please select a file first')
      return
    }
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('column_mapping', JSON.stringify(mapping))
      formData.append('date_format', format)
      if (selectedAccountId) {
        formData.append('account_id', selectedAccountId)
      }
      formData.append('date_tolerance_days', String(dateTolerance))
      if (selectedMapping) {
        formData.append('mapping_id', selectedMapping.id)
      }
      const res = await api.post<CSVPreviewResponse>('/csv/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setPreviewData(res.data)
      // Default all transfer matches to linked
      const links: Record<number, boolean> = {}
      res.data.rows.forEach((row, i) => {
        if (row.transfer_match) links[i] = true
      })
      setTransferLinks(links)
      setStep(3)
    } catch {
      setError('Failed to generate preview. Check your column mapping and date format.')
    } finally {
      setLoading(false)
    }
  }

  // -------------------------------------------------------------------------
  // Step 3 handlers
  // -------------------------------------------------------------------------

  const handleConfirm = async () => {
    if (!previewData) return
    setLoading(true)
    setError('')
    try {
      const rowsWithTransferLinks = rowsToImport.map((row) => {
        const originalIdx = previewData.rows.indexOf(row)
        const shouldLink = transferLinks[originalIdx] && row.transfer_match
        const overriddenCategory = categoryOverrides[originalIdx]
        return {
          ...row,
          category_name:
            overriddenCategory !== undefined ? overriddenCategory || null : row.category_name,
          resolved_category_name:
            overriddenCategory !== undefined
              ? overriddenCategory || null
              : row.resolved_category_name,
          link_transfer_id: shouldLink ? row.transfer_match!.transaction_id : null,
        }
      })
      const payload = {
        account_id: selectedAccountId || null,
        rows: rowsWithTransferLinks,
        save_mapping: saveMapping,
        institution_name: saveMapping ? institutionName : null,
        column_mapping: columnMapping,
        date_format: dateFormat,
        mapping_id: selectedMapping?.id ?? null,
      }
      const res = await api.post<{ imported_count: number; skipped_duplicates: number }>(
        '/csv/confirm',
        payload,
      )
      setConfirmResult(res.data)
      setStep(4)
    } catch {
      setError('Import failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // -------------------------------------------------------------------------
  // Step 4 handlers
  // -------------------------------------------------------------------------

  const handleImportAnother = () => {
    setStep(1)
    setFile(null)
    setSelectedMappingId('')
    setDetectedColumns([])
    setColumnMapping({})
    setDateFormat('%m/%d/%Y')
    setPreviewData(null)
    setSkippedMapping(false)
    setIncludeDuplicates(false)
    setSaveMapping(false)
    setInstitutionName('')
    setConfirmResult(null)
    setTransferLinks({})
    setCategoryOverrides({})
    setDateTolerance(5)
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">CSV File *</label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
        />
        {file && (
          <p className="text-xs text-slate-400 mt-1">
            Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Account (optional)</label>
        <select
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          className={selectClass}
        >
          <option value="">No account selected</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} — {a.institution}
            </option>
          ))}
        </select>
      </div>

      {savedMappings.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Saved Mapping (optional — skips column mapping step)
          </label>
          <div className="space-y-2">
            {savedMappings.map((m) => (
              <div
                key={m.id}
                className={`flex items-center justify-between bg-navy-850 border rounded-lg px-4 py-3 cursor-pointer transition-colors ${
                  selectedMappingId === m.id
                    ? 'border-emerald-500'
                    : 'border-navy-750 hover:border-slate-600'
                }`}
                onClick={() => setSelectedMappingId((prev) => (prev === m.id ? '' : m.id))}
              >
                <div>
                  <p className="text-sm font-medium text-slate-200">{m.institution_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Date format: {m.date_format} &middot; Fields:{' '}
                    {Object.keys(m.column_mapping).join(', ')}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteMapping(m.id)
                  }}
                  className="text-slate-500 hover:text-red-400 text-xs ml-4 transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={handleStep1Next}
        disabled={loading || !file}
        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
      >
        {loading ? 'Processing...' : selectedMapping ? 'Preview Import' : 'Next: Map Columns'}
      </button>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">
        Map each required CSV column to the corresponding field. Required fields are marked with *.
      </p>

      <div className="space-y-4">
        {SEMANTIC_FIELDS.map((field) => (
          <div key={field.key} className="grid grid-cols-2 gap-4 items-center">
            <label className="text-sm font-medium text-slate-300">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </label>
            <select
              value={columnMapping[field.key] ?? ''}
              onChange={(e) => handleMappingChange(field.key, e.target.value)}
              className={selectClass}
            >
              <option value="">{field.required ? '— Select column —' : '— None —'}</option>
              {detectedColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Date Format <span className="text-red-400">*</span>
        </label>
        <select
          value={dateFormat}
          onChange={(e) => setDateFormat(e.target.value)}
          className={selectClass}
        >
          {DATE_FORMAT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => setStep(1)}
          className="border border-slate-600 hover:border-slate-500 text-slate-300 px-6 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          Back
        </button>
        <button
          onClick={handleStep2Next}
          disabled={loading || !isMappingValid()}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          {loading ? 'Loading preview...' : 'Next: Preview'}
        </button>
      </div>
    </div>
  )

  const renderPreviewRow = (row: CSVPreviewRow, idx: number) => {
    const isDuplicate = row.is_duplicate
    const hasTransferMatch = !!row.transfer_match
    const isLinked = transferLinks[idx] ?? false
    return (
      <tr
        key={idx}
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
                  : row.match_method
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
                  onChange={(e) =>
                    setTransferLinks((prev) => ({ ...prev, [idx]: e.target.checked }))
                  }
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

  const renderStep3 = () => (
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
              <tbody>{previewData.rows.map((row, idx) => renderPreviewRow(row, idx))}</tbody>
            </table>
          </div>

          {/* Save mapping option */}
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

  const renderStep4 = () => (
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
          onClick={() => navigate('/transactions')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          View Transactions
        </button>
        <button
          onClick={handleImportAnother}
          className="border border-slate-600 hover:border-slate-500 text-slate-300 px-6 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          Import Another
        </button>
      </div>
    </div>
  )

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  const stepLabels = ['Upload', 'Map Columns', 'Preview', 'Done']

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold font-display mb-6">Import CSV</h1>

      <StepIndicator current={step} total={4} labels={stepLabels} />

      <div className="bg-navy-900 border border-navy-800 rounded-xl p-6">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </div>
    </div>
  )
}
