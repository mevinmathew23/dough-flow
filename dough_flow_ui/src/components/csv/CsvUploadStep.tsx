import { Account, CSVMapping } from '../../types'

const selectClass =
  'bg-navy-850 border border-navy-750 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 w-full'

interface CsvUploadStepProps {
  file: File | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  accounts: Account[]
  savedMappings: CSVMapping[]
  selectedAccountId: string
  setSelectedAccountId: (id: string) => void
  selectedMappingId: string
  setSelectedMappingId: (id: string) => void
  selectedMapping: CSVMapping | null
  loading: boolean
  error: string
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleDeleteMapping: (mappingId: string) => Promise<void>
  handleStep1Next: () => Promise<void>
}

export default function CsvUploadStep({
  file,
  fileInputRef,
  accounts,
  savedMappings,
  selectedAccountId,
  setSelectedAccountId,
  selectedMappingId,
  setSelectedMappingId,
  selectedMapping,
  loading,
  error,
  handleFileChange,
  handleDeleteMapping,
  handleStep1Next,
}: CsvUploadStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">CSV File *</label>
        <input
          ref={fileInputRef as React.RefObject<HTMLInputElement>}
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
                onClick={() => setSelectedMappingId(selectedMappingId === m.id ? '' : m.id)}
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
}
