export default function PageLoader({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <p className="text-slate-400 text-sm animate-pulse tracking-wide">{label}</p>
    </div>
  )
}
