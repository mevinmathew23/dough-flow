import { useEffect, useRef, useState } from 'react'
import api from '../api/client'
import { Account, Category, CSVMapping, CSVPreviewResponse } from '../types'

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

export { DATE_FORMAT_OPTIONS, SEMANTIC_FIELDS }

export type WizardStep = 1 | 2 | 3 | 4

/**
 * Auto-map CSV column headers to semantic field keys by fuzzy name matching.
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

export interface UseCsvImportWizardReturn {
  // Step
  step: WizardStep
  setStep: (step: WizardStep) => void

  // Reference data
  accounts: Account[]
  categories: Category[]
  savedMappings: CSVMapping[]
  setSavedMappings: (mappings: CSVMapping[]) => void

  // Step 1 state
  file: File | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  selectedAccountId: string
  setSelectedAccountId: (id: string) => void
  selectedMappingId: string
  setSelectedMappingId: (id: string) => void
  selectedMapping: CSVMapping | null
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleDeleteMapping: (mappingId: string) => Promise<void>
  handleStep1Next: () => Promise<void>

  // Step 2 state
  detectedColumns: string[]
  columnMapping: Record<string, string>
  dateFormat: string
  setDateFormat: (fmt: string) => void
  handleMappingChange: (semanticField: string, csvColumn: string) => void
  isMappingValid: () => boolean
  handleStep2Next: () => Promise<void>
  skippedMapping: boolean

  // Step 3 state
  previewData: CSVPreviewResponse | null
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
  runPreview: (mapping: Record<string, string>, format: string) => Promise<void>
  handleConfirm: () => Promise<void>

  // Step 4 state
  confirmResult: { imported_count: number; skipped_duplicates: number } | null
  handleImportAnother: () => void

  // Global
  loading: boolean
  error: string
}

export default function useCsvImportWizard(): UseCsvImportWizardReturn {
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
  const [skippedMapping, setSkippedMapping] = useState(false)

  // Step 3
  const [previewData, setPreviewData] = useState<CSVPreviewResponse | null>(null)
  const [includeDuplicates, setIncludeDuplicates] = useState(false)
  const [saveMapping, setSaveMapping] = useState(false)
  const [institutionName, setInstitutionName] = useState('')
  const [dateTolerance, setDateTolerance] = useState(5)
  const [transferLinks, setTransferLinks] = useState<Record<number, boolean>>({})
  const [categoryOverrides, setCategoryOverrides] = useState<Record<number, string>>({})

  // Step 4
  const [confirmResult, setConfirmResult] = useState<{
    imported_count: number
    skipped_duplicates: number
  } | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedMapping = savedMappings.find((m) => m.id === selectedMappingId) ?? null

  const rowsToImport = previewData
    ? previewData.rows.filter((r) => includeDuplicates || !r.is_duplicate)
    : []

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
  // Step 1 handlers
  // -------------------------------------------------------------------------

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setError('')
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

  const handleStep1Next = async () => {
    if (!file) {
      setError('Please select a CSV file')
      return
    }
    setError('')

    if (selectedMapping) {
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

  return {
    step,
    setStep,
    accounts,
    categories,
    savedMappings,
    setSavedMappings,
    file,
    fileInputRef,
    selectedAccountId,
    setSelectedAccountId,
    selectedMappingId,
    setSelectedMappingId,
    selectedMapping,
    handleFileChange,
    handleDeleteMapping,
    handleStep1Next,
    detectedColumns,
    columnMapping,
    dateFormat,
    setDateFormat,
    handleMappingChange,
    isMappingValid,
    handleStep2Next,
    skippedMapping,
    previewData,
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
    runPreview,
    handleConfirm,
    confirmResult,
    handleImportAnother,
    loading,
    error,
  }
}
