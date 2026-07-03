import { DOCUMENT_ACTION_STYLE } from './statusStyles'
import { useDocumentHistory } from '../hooks/useDocumentHistory'

export function FilesTab() {
  const { events, loading, error } = useDocumentHistory()

  return (
    <div className="optibot-scroll" style={{ height: '100%', overflow: 'auto', padding: '32px 40px' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#0f2e29' }}>File Lifecycle Tracking</div>
      <div style={{ fontSize: 13, color: '#5c8a80', marginTop: 2, marginBottom: 24 }}>
        Every ADDED / UPDATED / REMOVED event recorded for each article, most recent first
      </div>

      {loading && <div style={{ fontSize: 13, color: '#7a9d95' }}>Loading history…</div>}
      {error && <div style={{ fontSize: 13, color: '#c96b60' }}>Failed to load history: {error}</div>}
      {!loading && !error && events.length === 0 && (
        <div style={{ fontSize: 13, color: '#7a9d95' }}>No document events recorded yet.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 820 }}>
        {events.map((event) => {
          const style = DOCUMENT_ACTION_STYLE[event.action]
          return (
            <div
              key={event.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                padding: '12px 16px',
                border: '1px solid #e6f3ef',
                borderRadius: 12,
                background: '#ffffff',
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f2e29', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {event.slug}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                <div style={{ fontSize: 12, color: '#7a9d95', whiteSpace: 'nowrap' }}>
                  {new Date(event.created_at).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 10px',
                    borderRadius: 999,
                    background: style.bg,
                    color: style.fg,
                    fontSize: 11.5,
                    fontWeight: 700,
                  }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: style.dot }} />
                  {style.label}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
