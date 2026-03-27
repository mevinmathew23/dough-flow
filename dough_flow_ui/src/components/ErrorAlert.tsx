export default function ErrorAlert({ message }: { message: string | null }) {
  if (!message) return null
  return <p className="text-red-400 text-sm mb-4">{message}</p>
}
