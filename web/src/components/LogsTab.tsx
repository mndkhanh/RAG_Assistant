import { useState } from 'react'
import { LOG_STATUS_BG, LOG_STATUS_COLOR, LOG_STATUS_LABEL } from './statusStyles'
import { useRunJob } from '../hooks/useRunJob'
import { useJobRuns } from '../hooks/useJobRuns'
import { useJobLogs } from '../hooks/useJobLogs'
import type { JobRunRow } from '../lib/api'
import type { LogStatus } from '../types'

function badgeStyle(status: LogStatus) {
  return {
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 11.5,
    fontWeight: 700,
    background: LOG_STATUS_BG[status],
    color: LOG_STATUS_COLOR[status],
  }
}

function toLogStatus(status: JobRunRow['status']): LogStatus {
  if (status === 'SUCCEEDED') return 'success'
  if (status === 'FAILED') return 'failed'
  return 'running'
}

function formatDuration(startedAt: string, finishedAt: string | null): string {
  const start = new Date(startedAt).getTime()
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now()
  const seconds = Math.max(0, Math.round((end - start) / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`
}

function runName(run: JobRunRow): string {
  const taskId = run.task_arn.split('/').pop() ?? run.task_arn
  return `${run.trigger === 'manual' ? 'Manual' : 'Scheduled'} run · ${taskId.slice(0, 12)}`
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, { hour12: false })
}

export function LogsTab() {
  const [selectedTaskArn, setSelectedTaskArn] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const { runs, loading, error: loadError, refresh } = useJobRuns()
  const { state: runState, message: runMessage, run: runJob } = useRunJob(refresh)

  const selectedRun = runs.find((r) => r.task_arn === selectedTaskArn) ?? runs[0]
  const { events: logEvents, loading: logsLoading, error: logsError } = useJobLogs(
    panelOpen && selectedRun ? selectedRun.log_group : null,
    panelOpen && selectedRun ? selectedRun.log_stream : null,
  )

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <div className="optibot-scroll" style={{ height: '100%', overflowY: 'auto', padding: '32px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0f2e29' }}>Task Execution Logs</div>
            <div style={{ fontSize: 13, color: '#5c8a80', marginTop: 2, marginBottom: 24 }}>
              Select a run to view its live CloudWatch log stream
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <button
              type="button"
              onClick={runJob}
              disabled={runState === 'running'}
              style={{
                padding: '10px 16px',
                fontSize: 13.5,
                fontWeight: 700,
                borderRadius: 10,
                border: 'none',
                cursor: runState === 'running' ? 'not-allowed' : 'pointer',
                opacity: runState === 'running' ? 0.6 : 1,
                background: 'radial-gradient(circle at 30% 30%, #30ba9e, #01998a)',
                color: '#ffffff',
                whiteSpace: 'nowrap',
              }}
            >
              {runState === 'running' ? 'Starting task…' : 'Run job now'}
            </button>
            {runState === 'success' && (
              <div style={{ fontSize: 12, color: '#01998a', maxWidth: 220, textAlign: 'right', wordBreak: 'break-all' }}>
                Task started: {runMessage}
              </div>
            )}
            {runState === 'error' && (
              <div style={{ fontSize: 12, color: '#c96b60', maxWidth: 220, textAlign: 'right', wordBreak: 'break-all' }}>
                Failed to start: {runMessage}
              </div>
            )}
          </div>
        </div>

        {loading && <div style={{ fontSize: 13, color: '#7a9d95' }}>Loading runs…</div>}
        {loadError && <div style={{ fontSize: 13, color: '#c96b60' }}>Failed to load runs: {loadError}</div>}
        {!loading && !loadError && runs.length === 0 && (
          <div style={{ fontSize: 13, color: '#7a9d95' }}>No runs recorded yet.</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 820 }}>
          {runs.map((run) => {
            const status = toLogStatus(run.status)
            const selected = selectedTaskArn === run.task_arn && panelOpen
            return (
              <div
                key={run.task_arn}
                onClick={() => {
                  setSelectedTaskArn(run.task_arn)
                  setPanelOpen(true)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '14px 16px',
                  border: `1px solid ${selected ? '#30ba9e' : '#e6f3ef'}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  background: '#ffffff',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div
                    className={status === 'running' ? 'optibot-blink' : undefined}
                    style={{
                      width: 9,
                      height: 9,
                      minWidth: 9,
                      borderRadius: '50%',
                      background: LOG_STATUS_COLOR[status],
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#0f2e29',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {runName(run)}
                    </div>
                    <div style={{ fontSize: 12, color: '#7a9d95' }}>
                      {new Date(run.started_at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      · {formatDuration(run.started_at, run.finished_at)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                  <div style={badgeStyle(status)}>{LOG_STATUS_LABEL[status]}</div>
                  <div style={{ color: '#c3ddd6', fontSize: 16 }}>›</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {panelOpen && selectedRun && (
        <>
          <div
            onClick={() => setPanelOpen(false)}
            className="optibot-fade-up"
            style={{ position: 'absolute', inset: 0, background: 'rgba(15,46,41,0.28)' }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: 480,
              maxWidth: '92%',
              background: '#ffffff',
              boxShadow: '-16px 0 40px rgba(15,46,41,0.18)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e6f3ef',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2e29' }}>{runName(selectedRun)}</div>
                <div style={{ ...badgeStyle(toLogStatus(selectedRun.status)), marginTop: 8 }}>
                  {LOG_STATUS_LABEL[toLogStatus(selectedRun.status)]}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={runJob}
                  disabled={runState === 'running'}
                  title="Start a new manual run"
                  style={{
                    padding: '8px 12px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    borderRadius: 8,
                    border: 'none',
                    cursor: runState === 'running' ? 'not-allowed' : 'pointer',
                    opacity: runState === 'running' ? 0.6 : 1,
                    background: 'radial-gradient(circle at 30% 30%, #30ba9e, #01998a)',
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {runState === 'running' ? 'Starting…' : 'Trigger manually'}
                </button>
                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  style={{
                    border: 'none',
                    background: '#f4fbf9',
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    cursor: 'pointer',
                    color: '#5c8a80',
                    fontSize: 14,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            <div style={{ padding: '16px 20px', fontSize: 12, color: '#7a9d95', borderBottom: '1px solid #f0f8f5' }}>
              Started {new Date(selectedRun.started_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              {' · '}
              Duration {formatDuration(selectedRun.started_at, selectedRun.finished_at)}
              {' · '}
              <span style={{ wordBreak: 'break-all' }}>{selectedRun.log_stream}</span>
            </div>
            <div
              className="optibot-scroll"
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 20px',
                background: '#0f2e29',
                fontFamily: "'SF Mono', Menlo, Consolas, monospace",
                fontSize: 12.5,
                lineHeight: 1.7,
              }}
            >
              {logsLoading && <div style={{ color: '#7a9d95' }}>Loading log stream…</div>}
              {logsError && <div style={{ color: '#ff8a7a' }}>Failed to load logs: {logsError}</div>}
              {!logsLoading && !logsError && logEvents.length === 0 && (
                <div style={{ color: '#7a9d95' }}>No log output found for this run.</div>
              )}
              {!logsLoading &&
                !logsError &&
                logEvents.map((event, i) => (
                  <div
                    key={i}
                    style={{
                      color: event.message.includes('ERROR') ? '#ff8a7a' : '#c9ede4',
                      marginBottom: 2,
                      wordBreak: 'break-all',
                    }}
                  >
                    [{formatTime(event.timestamp)}] {event.message}
                  </div>
                ))}
              {selectedRun.error_message && (
                <div style={{ color: '#ff8a7a', marginTop: 8 }}>ERROR: {selectedRun.error_message}</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
