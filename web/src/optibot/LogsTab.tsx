import { useState } from 'react'
import { LOG_DEFS, LOG_STATUS_BG, LOG_STATUS_COLOR, LOG_STATUS_LABEL } from './data'
import { useRunJob } from './useRunJob'

function badgeStyle(status: keyof typeof LOG_STATUS_COLOR) {
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

export function LogsTab() {
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const { state: runState, message: runMessage, run: runJob } = useRunJob()

  const selectedLog = LOG_DEFS.find((l) => l.id === selectedLogId) ?? LOG_DEFS[0]

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <div className="optibot-scroll" style={{ height: '100%', overflowY: 'auto', padding: '32px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0f2e29' }}>Task Execution Logs</div>
            <div style={{ fontSize: 13, color: '#5c8a80', marginTop: 2, marginBottom: 24 }}>
              Select a run to view its live log stream
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 820 }}>
          {LOG_DEFS.map((log) => {
            const selected = selectedLogId === log.id && panelOpen
            return (
              <div
                key={log.id}
                onClick={() => {
                  setSelectedLogId(log.id)
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
                    className={log.status === 'running' ? 'optibot-blink' : undefined}
                    style={{
                      width: 9,
                      height: 9,
                      minWidth: 9,
                      borderRadius: '50%',
                      background: LOG_STATUS_COLOR[log.status],
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
                      {log.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#7a9d95' }}>
                      {log.timestamp} · {log.duration}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                  <div style={badgeStyle(log.status)}>{LOG_STATUS_LABEL[log.status]}</div>
                  <div style={{ color: '#c3ddd6', fontSize: 16 }}>›</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {panelOpen && (
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
              width: 440,
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
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2e29' }}>{selectedLog.name}</div>
                <div style={{ ...badgeStyle(selectedLog.status), marginTop: 8 }}>{LOG_STATUS_LABEL[selectedLog.status]}</div>
              </div>
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
            <div style={{ padding: '16px 20px', fontSize: 12, color: '#7a9d95', borderBottom: '1px solid #f0f8f5' }}>
              Started {selectedLog.timestamp} · Duration {selectedLog.duration}
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
              {selectedLog.lines.map((line, i) => (
                <div key={i} style={{ color: line.includes('ERROR') ? '#ff8a7a' : '#c9ede4', marginBottom: 2 }}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
