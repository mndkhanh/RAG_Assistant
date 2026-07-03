import type { ChatMessage, FileEntry, FileStatus, LogEntry, LogStatus } from './types'

export const INITIAL_MESSAGES: ChatMessage[] = [
  { id: 1, role: 'assistant', text: "Hi, I'm OptiBot. Ask me to plan a task, explain a log, or check a file's history." },
  { id: 2, role: 'user', text: "Can you reconcile last night's invoice job and tell me if anything failed?" },
  { id: 3, role: 'assistant', text: "Checking Task Execution Logs now — the invoice reconciliation job is still running, no failures reported yet. I'll flag you if it errors out." },
]

export const REPLIES = [
  "Got it — I've queued that up. I'll walk through each step before executing anything irreversible.",
  "Here's my plan: pull the latest data, validate against the schema, then run the transform. Want me to proceed?",
  'That file lifecycle looks clean — no orphaned versions in the last 5 snapshots.',
  'I can kick that off now. It should show up under Task Execution Logs once it starts running.',
  "Done. I've summarized the result — let me know if you'd like the full log stream.",
]

export const LOG_DEFS: LogEntry[] = [
  {
    id: 'l1',
    name: 'Sync customer records to warehouse',
    status: 'success',
    timestamp: 'Jul 3, 09:14',
    duration: '48s',
    lines: [
      '[09:14:01] Job started',
      '[09:14:02] Connected to source DB',
      '[09:14:06] Extracted 12,480 rows',
      '[09:14:22] Transform: normalizing addresses',
      '[09:14:41] Loaded into warehouse.customers',
      '[09:14:49] Job completed successfully',
    ],
  },
  {
    id: 'l2',
    name: 'Nightly invoice reconciliation',
    status: 'running',
    timestamp: 'Jul 3, 08:02',
    duration: '3m 12s',
    lines: [
      '[08:02:00] Job started',
      '[08:02:04] Fetching open invoices',
      '[08:03:10] Matching 842 line items',
      '[08:04:55] Flagged 6 mismatches for review',
      '[08:05:12] Still processing batch 3/4…',
    ],
  },
  {
    id: 'l3',
    name: 'PDF contract parser',
    status: 'failed',
    timestamp: 'Jul 2, 22:47',
    duration: '11s',
    lines: [
      '[22:47:00] Job started',
      '[22:47:03] Reading 14 documents',
      '[22:47:09] ERROR: unsupported encoding in doc #9',
      '[22:47:11] Job aborted',
    ],
  },
  {
    id: 'l4',
    name: 'Weekly analytics rollup',
    status: 'success',
    timestamp: 'Jul 2, 06:00',
    duration: '2m 03s',
    lines: [
      '[06:00:00] Job started',
      '[06:00:15] Aggregating 7 days of events',
      '[06:01:40] Writing rollup tables',
      '[06:02:03] Job completed successfully',
    ],
  },
  {
    id: 'l5',
    name: 'Vendor API webhook backfill',
    status: 'success',
    timestamp: 'Jul 1, 19:20',
    duration: '1m 40s',
    lines: [
      '[19:20:00] Job started',
      '[19:20:05] Replaying 233 missed events',
      '[19:21:12] All events acknowledged',
      '[19:21:40] Job completed successfully',
    ],
  },
  {
    id: 'l6',
    name: 'Onboarding email sequence trigger',
    status: 'queued',
    timestamp: 'Jul 1, 14:05',
    duration: '—',
    lines: ['[14:05:00] Job queued', '[14:05:00] Waiting for worker slot…'],
  },
]

export const FILE_DEFS: FileEntry[] = [
  { slug: 'invoices/2026-q3.csv', row: ['created', 'modified', 'modified', 'none', 'archived'] },
  { slug: 'contracts/acme-msa.pdf', row: ['created', 'none', 'modified', 'modified', 'none'] },
  { slug: 'customers/export.json', row: ['none', 'created', 'modified', 'modified', 'modified'] },
  { slug: 'reports/weekly-rollup.xlsx', row: ['created', 'modified', 'none', 'modified', 'deleted'] },
  { slug: 'webhooks/vendor-log.ndjson', row: ['created', 'modified', 'modified', 'modified', 'modified'] },
  { slug: 'assets/logo-v2.png', row: ['none', 'none', 'created', 'none', 'archived'] },
]

export const COLUMNS = ['Jun 29', 'Jun 30', 'Jul 1', 'Jul 2', 'Jul 3']

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

export const FILE_STATUS: Record<FileStatus, { label: string; dot: string; bg: string; fg: string }> = {
  created: { label: 'Created', dot: '#01998a', bg: '#e6f7f2', fg: '#01998a' },
  modified: { label: 'Modified', dot: '#30ba9e', bg: '#eefaf6', fg: '#1c8f7c' },
  archived: { label: 'Archived', dot: '#9aa8a5', bg: '#f3f5f4', fg: '#6b7a76' },
  deleted: { label: 'Deleted', dot: '#c96b60', bg: '#fbeeec', fg: '#b85347' },
  none: { label: '—', dot: '#e3ece9', bg: 'transparent', fg: '#c3ccc9' },
}
