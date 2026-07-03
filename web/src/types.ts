export type Tab = 'chat' | 'logs' | 'files'

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  id: number
  role: ChatRole
  text: string
}

export type LogStatus = 'success' | 'running' | 'failed' | 'queued'

export type DocumentAction = 'ADDED' | 'UPDATED' | 'REMOVED'
