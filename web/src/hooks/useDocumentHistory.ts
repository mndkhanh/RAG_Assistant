import { useCallback, useEffect, useState } from 'react'
import { fetchDocumentHistory, type DocumentEventRow } from '../lib/api'

export function useDocumentHistory() {
  const [events, setEvents] = useState<DocumentEventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const data = await fetchDocumentHistory()
      setEvents(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document history')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { events, loading, error, refresh }
}
