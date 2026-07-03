import { useState } from 'react'
import './optibot.css'
import { Sidebar } from './Sidebar'
import { ChatTab } from './ChatTab'
import { LogsTab } from './LogsTab'
import { FilesTab } from './FilesTab'
import type { Tab } from './types'

export function OptiBot() {
  const [tab, setTab] = useState<Tab>('chat')

  return (
    <div
      className="optibot"
      style={{
        display: 'flex',
        height: '100vh',
        width: '100%',
        background: '#ffffff',
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        color: '#0f2e29',
        overflow: 'hidden',
      }}
    >
      <Sidebar tab={tab} onTabChange={setTab} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative', background: '#ffffff' }}>
        {tab === 'chat' && <ChatTab />}
        {tab === 'logs' && <LogsTab />}
        {tab === 'files' && <FilesTab />}
      </div>
    </div>
  )
}
