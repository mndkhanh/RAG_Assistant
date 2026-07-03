import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export type RunState = 'idle' | 'running' | 'success' | 'error'

export function useRunJob(onStarted?: () => void) {
  const [state, setState] = useState<RunState>('idle')
  const [message, setMessage] = useState('')

  async function run(articleLimit?: number) {
    setState('running')
    setMessage('')

    const { data, error } = await supabase.functions.invoke('run-job', {
      method: 'POST',
      body: articleLimit ? { articleLimit } : {},
    })

    if (error) {
      setState('error')
      setMessage(error.message)
      return
    }

    setState('success')
    setMessage(data?.taskArn ?? 'Task started')
    onStarted?.()
  }

  return { state, message, run }
}
