import { useState } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

type RunState = 'idle' | 'running' | 'success' | 'error'

function App() {
  const [state, setState] = useState<RunState>('idle')
  const [message, setMessage] = useState<string>('')

  async function handleRunJob() {
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

  return (
    <section id="center">
      <h1>OptiBot Mini-Clone</h1>
      <p>Trigger a fresh scrape + vector store sync on demand.</p>

      <button
        type="button"
        className="run-job"
        onClick={handleRunJob}
        disabled={state === 'running'}
      >
        {state === 'running' ? 'Starting task…' : 'Run job now'}
      </button>

      {state === 'success' && (
        <p className="status status-success">Task started: {message}</p>
      )}
      {state === 'error' && (
        <p className="status status-error">Failed to start task: {message}</p>
      )}
    </section>
  )
}

export default App
