import { useNavigate } from 'react-router-dom'
import StepIndicator from '../components/StepIndicator'
import CsvCompleteStep from '../components/csv/CsvCompleteStep'
import CsvMapColumnsStep from '../components/csv/CsvMapColumnsStep'
import CsvPreviewStep from '../components/csv/CsvPreviewStep'
import CsvUploadStep from '../components/csv/CsvUploadStep'
import useCsvImportWizard from '../hooks/useCsvImportWizard'

const STEP_LABELS = ['Upload', 'Map Columns', 'Preview', 'Done']

export default function CsvImport() {
  const navigate = useNavigate()
  const wizard = useCsvImportWizard()

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold font-display mb-6">Import CSV</h1>

      <StepIndicator current={wizard.step} total={4} labels={STEP_LABELS} />

      <div className="bg-navy-900 border border-navy-800 rounded-xl p-6">
        {wizard.step === 1 && (
          <CsvUploadStep
            file={wizard.file}
            fileInputRef={wizard.fileInputRef}
            accounts={wizard.accounts}
            savedMappings={wizard.savedMappings}
            selectedAccountId={wizard.selectedAccountId}
            setSelectedAccountId={wizard.setSelectedAccountId}
            selectedMappingId={wizard.selectedMappingId}
            setSelectedMappingId={wizard.setSelectedMappingId}
            selectedMapping={wizard.selectedMapping}
            loading={wizard.loading}
            error={wizard.error}
            handleFileChange={wizard.handleFileChange}
            handleDeleteMapping={wizard.handleDeleteMapping}
            handleStep1Next={wizard.handleStep1Next}
          />
        )}

        {wizard.step === 2 && (
          <CsvMapColumnsStep
            detectedColumns={wizard.detectedColumns}
            columnMapping={wizard.columnMapping}
            dateFormat={wizard.dateFormat}
            setDateFormat={wizard.setDateFormat}
            loading={wizard.loading}
            error={wizard.error}
            isMappingValid={wizard.isMappingValid}
            handleMappingChange={wizard.handleMappingChange}
            handleStep2Next={wizard.handleStep2Next}
            setStep={wizard.setStep}
          />
        )}

        {wizard.step === 3 && (
          <CsvPreviewStep
            previewData={wizard.previewData}
            categories={wizard.categories}
            includeDuplicates={wizard.includeDuplicates}
            setIncludeDuplicates={wizard.setIncludeDuplicates}
            saveMapping={wizard.saveMapping}
            setSaveMapping={wizard.setSaveMapping}
            institutionName={wizard.institutionName}
            setInstitutionName={wizard.setInstitutionName}
            dateTolerance={wizard.dateTolerance}
            setDateTolerance={wizard.setDateTolerance}
            transferLinks={wizard.transferLinks}
            setTransferLinks={wizard.setTransferLinks}
            categoryOverrides={wizard.categoryOverrides}
            setCategoryOverrides={wizard.setCategoryOverrides}
            rowsToImport={wizard.rowsToImport}
            loading={wizard.loading}
            error={wizard.error}
            skippedMapping={wizard.skippedMapping}
            columnMapping={wizard.columnMapping}
            dateFormat={wizard.dateFormat}
            runPreview={wizard.runPreview}
            handleConfirm={wizard.handleConfirm}
            setStep={wizard.setStep}
          />
        )}

        {wizard.step === 4 && (
          <CsvCompleteStep
            confirmResult={wizard.confirmResult}
            onViewTransactions={() => navigate('/transactions')}
            onImportAnother={wizard.handleImportAnother}
          />
        )}
      </div>
    </div>
  )
}
