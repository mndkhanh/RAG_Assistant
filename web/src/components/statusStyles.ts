import type { DocumentAction, LogStatus } from '../types'

export const LOG_STATUS_LABEL: Record<LogStatus, string> = {
  success: 'Success',
  running: 'Running',
  failed: 'Failed',
  queued: 'Queued',
}

export const LOG_STATUS_COLOR: Record<LogStatus, string> = {
  success: '#01998a',
  running: '#30ba9e',
  failed: '#c96b60',
  queued: '#9aa8a5',
}

export const LOG_STATUS_BG: Record<LogStatus, string> = {
  success: '#e6f7f2',
  running: '#eefaf6',
  failed: '#fbeeec',
  queued: '#f3f5f4',
}

export const DOCUMENT_ACTION_STYLE: Record<DocumentAction, { label: string; dot: string; bg: string; fg: string }> = {
  ADDED: { label: 'Added', dot: '#01998a', bg: '#e6f7f2', fg: '#01998a' },
  UPDATED: { label: 'Updated', dot: '#30ba9e', bg: '#eefaf6', fg: '#1c8f7c' },
  REMOVED: { label: 'Removed', dot: '#c96b60', bg: '#fbeeec', fg: '#b85347' },
}
