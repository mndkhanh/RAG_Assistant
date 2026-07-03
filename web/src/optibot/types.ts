export type Tab = 'chat' | 'logs' | 'files'

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  id: number
  role: ChatRole
  text: string
}

export type LogStatus = 'success' | 'running' | 'failed' | 'queued'

export interface LogEntry {
  id: string
  name: string
  status: LogStatus
  timestamp: string
  duration: string
  lines: string[]
}

export type FileStatus = 'created' | 'modified' | 'archived' | 'deleted' | 'none'

export interface FileEntry {
  slug: string
  row: FileStatus[]
}
