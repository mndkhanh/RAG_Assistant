import { useState } from 'react'
import { supabase } from '../supabaseClient'

export type RunState = 'idle' | 'running' | 'success' | 'error'

export function useRunJob() {
  const [state, setState] = useState<RunState>('idle')
  const [message, setMessage] = useState('')

  async function run() {
    setState('running')
    setMessage('')

    const { data, error } = await supabase.functions.invoke('run-job', {
      method: 'POST',
    })

    if (error) {
      setState('error')
      setMessage(error.message)
      return
    }

    setState('success')
    setMessage(data?.taskArn ?? 'Task started')
  }

  return { state, message, run }
}
