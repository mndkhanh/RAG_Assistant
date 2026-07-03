import { Fragment } from 'react'
import { COLUMNS, FILE_DEFS, FILE_STATUS } from './data'

export function FilesTab() {
  return (
    <div className="optibot-scroll" style={{ height: '100%', overflow: 'auto', padding: '32px 40px' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#0f2e29' }}>File Lifecycle Tracking</div>
      <div style={{ fontSize: 13, color: '#5c8a80', marginTop: 2, marginBottom: 24 }}>
        Status of each file across recent snapshots
      </div>

      <div style={{ border: '1px solid #e6f3ef', borderRadius: 14, overflow: 'auto', maxWidth: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `220px repeat(${COLUMNS.length}, 150px)`, minWidth: 920 }}>
          <div
            style={{
              position: 'sticky',
              left: 0,
              background: '#f4fbf9',
              padding: '12px 16px',
              fontSize: 12,
              fontWeight: 700,
              color: '#5c8a80',
              borderBottom: '1px solid #e6f3ef',
              borderRight: '1px solid #e6f3ef',
              zIndex: 2,
            }}
          >
            FILE
          </div>
          {COLUMNS.map((col) => (
            <div
              key={col}
              style={{
                background: '#f4fbf9',
                padding: '12px 12px',
                fontSize: 12,
                fontWeight: 700,
                color: '#5c8a80',
                borderBottom: '1px solid #e6f3ef',
                textAlign: 'center',
              }}
            >
              {col}
            </div>
          ))}

          {FILE_DEFS.map((file) => (
            <Fragment key={file.slug}>
              <div
                style={{
                  position: 'sticky',
                  left: 0,
                  background: '#ffffff',
                  padding: '14px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#0f2e29',
                  borderBottom: '1px solid #f0f8f5',
                  borderRight: '1px solid #e6f3ef',
                  zIndex: 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {file.slug}
              </div>
              {file.row.map((status, i) => {
                const s = FILE_STATUS[status]
                return (
                  <div
                    key={`${file.slug}-${i}`}
                    style={{
                      padding: '10px 12px',
                      borderBottom: '1px solid #f0f8f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {status === 'none' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#c3ccc9' }}>
                        {s.label}
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '5px 10px',
                          borderRadius: 999,
                          background: s.bg,
                          color: s.fg,
                          fontSize: 11.5,
                          fontWeight: 700,
                        }}
                      >
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
                        {s.label}
                      </div>
                    )}
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
