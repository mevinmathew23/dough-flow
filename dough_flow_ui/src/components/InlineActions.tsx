export default function InlineActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onEdit} className="text-slate-400 hover:text-white text-sm cursor-pointer">
        Edit
      </button>
      <button
        onClick={onDelete}
        className="text-slate-400 hover:text-red-400 text-sm cursor-pointer"
      >
        Delete
      </button>
    </div>
  )
}
