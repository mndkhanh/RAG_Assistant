import { supabase } from './supabaseClient'

export interface JobRunRow {
  id: number
  task_arn: string
  cluster: string
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED'
  trigger: 'schedule' | 'manual'
  triggered_by_user: string | null
  log_group: string
  log_stream: string
  started_at: string
  finished_at: string | null
  error_message: string | null
}

export interface DocumentEventRow {
  id: number
  slug: string
  action: 'ADDED' | 'UPDATED' | 'REMOVED'
  content_hash: string | null
  file_id: string | null
  vector_store_id: string | null
  created_at: string
}

export interface LogEvent {
  timestamp: number
  message: string
}

export async function fetchJobRuns(limit = 20): Promise<JobRunRow[]> {
  const { data, error } = await supabase
    .from('job_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchDocumentHistory(limit = 100): Promise<DocumentEventRow[]> {
  const { data, error } = await supabase
    .from('document_lifecycle_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchJobLogs(logGroup: string, logStream: string): Promise<LogEvent[]> {
  const { data, error } = await supabase.functions.invoke('get-job-logs', {
    method: 'POST',
    body: { logGroup, logStream },
  })

  if (error) throw new Error(error.message)
  return data?.events ?? []
}

export interface ChatReply {
  threadId: string
  reply: string
}

export async function sendChatMessage(message: string, threadId: string | null): Promise<ChatReply> {
  const { data, error } = await supabase.functions.invoke('chat', {
    method: 'POST',
    body: { message, threadId },
  })

  if (error) throw new Error(error.message)
  return data
}
