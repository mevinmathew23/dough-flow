import { DATE_FORMAT_OPTIONS, SEMANTIC_FIELDS, WizardStep } from '../../hooks/useCsvImportWizard'

const selectClass =
  'bg-navy-850 border border-navy-750 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 w-full'

interface CsvMapColumnsStepProps {
  detectedColumns: string[]
  columnMapping: Record<string, string>
  dateFormat: string
  setDateFormat: (fmt: string) => void
  loading: boolean
  error: string
  isMappingValid: () => boolean
  handleMappingChange: (semanticField: string, csvColumn: string) => void
  handleStep2Next: () => Promise<void>
  setStep: (step: WizardStep) => void
}

export default function CsvMapColumnsStep({
  detectedColumns,
  columnMapping,
  dateFormat,
  setDateFormat,
  loading,
  error,
  isMappingValid,
  handleMappingChange,
  handleStep2Next,
  setStep,
}: CsvMapColumnsStepProps) {
  return (
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
}
