interface StepIndicatorProps {
  current: number
  total: number
  labels: string[]
}

export default function StepIndicator({ current, total, labels }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1
        const isActive = step === current
        const isDone = step < current
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  isDone
                    ? 'bg-emerald-600 text-white'
                    : isActive
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-500/30'
                      : 'bg-slate-700 text-slate-400'
                }`}
              >
                {isDone ? '✓' : step}
              </div>
              <span
                className={`text-xs mt-1 whitespace-nowrap ${
                  isActive ? 'text-emerald-400' : isDone ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                {labels[i]}
              </span>
            </div>
            {step < total && (
              <div
                className={`w-16 h-0.5 mb-5 mx-1 ${step < current ? 'bg-emerald-600' : 'bg-slate-700'}`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
