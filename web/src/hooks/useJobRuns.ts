import { useCallback, useEffect, useState } from 'react'
import { fetchJobRuns, type JobRunRow } from '../lib/api'

export function useJobRuns() {
  const [runs, setRuns] = useState<JobRunRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const data = await fetchJobRuns()
      setRuns(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job runs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // A manually-triggered run stays RUNNING for a minute or two while ECS
  // provisions the Fargate task, so poll while any run is in flight and
  // stop once everything has settled.
  useEffect(() => {
    if (!runs.some((run) => run.status === 'RUNNING')) return
    const interval = setInterval(refresh, 5000)
    return () => clearInterval(interval)
  }, [runs, refresh])

  return { runs, loading, error, refresh }
}
