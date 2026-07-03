import { useEffect, useState } from 'react'
import { fetchJobLogs, type LogEvent } from '../lib/api'

export function useJobLogs(logGroup: string | null, logStream: string | null) {
  const [events, setEvents] = useState<LogEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!logGroup || !logStream) {
      setEvents([])
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchJobLogs(logGroup, logStream)
      .then((data) => {
        if (!cancelled) setEvents(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load logs')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [logGroup, logStream])

  return { events, loading, error }
}
