export function extractApiError(err: unknown): string {
  if (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof (err as Record<string, unknown>).response === 'object'
  ) {
    const response = (err as { response: { data?: { detail?: string } } }).response
    if (response.data?.detail) {
      return response.data.detail
    }
  }
  if (err instanceof Error) {
    return err.message
  }
  return 'An unexpected error occurred'
}
