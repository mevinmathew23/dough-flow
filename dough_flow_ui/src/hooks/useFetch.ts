import { useCallback, useEffect, useRef, useState } from 'react'

interface UseFetchResult<T> {
  data: T | null
  loading: boolean
  error: string
  refetch: () => void
}

export default function useFetch<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const refetch = useCallback(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError('')
    fetcher()
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result)
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'An error occurred')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refetch()
    return () => abortRef.current?.abort()
  }, [refetch])

  return { data, loading, error, refetch }
}
