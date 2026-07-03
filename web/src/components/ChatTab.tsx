import { useState, type KeyboardEvent } from 'react'
import { useChat } from '../hooks/useChat'

export function ChatTab() {
  const { messages, isSending, error, sendMessage } = useChat()
  const [draft, setDraft] = useState('')

  function handleSend() {
    if (!draft.trim() || isSending) return
    sendMessage(draft)
    setDraft('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: '22px 32px',
          background: 'radial-gradient(circle at 22% 25%, #30ba9e 0%, #01998a 62%, #017a6e 100%)',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700, color: '#ffffff' }}>AI Chatbot</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
          Ask OptiBot anything about OptiSigns — answered from the live knowledge base
        </div>
      </div>

      <div className="optibot-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 0' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18, padding: '0 24px' }}>
          {messages.map((msg) => {
            const isUser = msg.role === 'user'
            return (
              <div
                key={msg.id}
                className="optibot-fade-up"
                style={{ display: 'flex', alignItems: 'flex-start', justifyContent: isUser ? 'flex-end' : 'flex-start' }}
              >
                {!isUser && (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      minWidth: 28,
                      borderRadius: 8,
                      background: 'radial-gradient(circle at 30% 30%, #30ba9e, #01998a)',
                      marginRight: 10,
                    }}
                  />
                )}
                <div
                  style={{
                    maxWidth: '72%',
                    padding: '12px 16px',
                    borderRadius: 14,
                    fontSize: 14,
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    background: isUser ? '#d2f0e9' : '#f7fbfa',
                    color: isUser ? '#0f2e29' : '#173832',
                    border: isUser ? undefined : '1px solid #eaf5f1',
                    borderTopRightRadius: isUser ? 4 : 14,
                    borderTopLeftRadius: isUser ? 14 : 4,
                  }}
                >
                  {msg.text}
                </div>
              </div>
            )
          })}
          {isSending && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  minWidth: 28,
                  borderRadius: 8,
                  background: 'radial-gradient(circle at 30% 30%, #30ba9e, #01998a)',
                  marginRight: 10,
                }}
              />
              <div style={{ padding: '12px 16px', borderRadius: 14, background: '#f4fbf9', color: '#5c8a80', fontSize: 14 }}>
                OptiBot is typing…
              </div>
            </div>
          )}
          {error && (
            <div style={{ maxWidth: '72%', padding: '12px 16px', borderRadius: 14, background: '#fbeeec', color: '#b85347', fontSize: 13 }}>
              {error}
            </div>
          )}
        </div>
      </div>

      <div style={{ borderTop: '1px solid #e6f3ef', padding: '16px 24px', flexShrink: 0 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Message OptiBot…"
            rows={1}
            style={{
              flex: 1,
              resize: 'none',
              border: '1px solid #d8ece7',
              borderRadius: 14,
              padding: '12px 16px',
              fontSize: 14,
              fontFamily: 'inherit',
              outline: 'none',
              color: '#0f2e29',
              background: '#fbfefd',
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending}
            style={{
              width: 42,
              height: 42,
              minWidth: 42,
              borderRadius: 12,
              border: 'none',
              cursor: isSending ? 'not-allowed' : 'pointer',
              opacity: isSending ? 0.6 : 1,
              background: 'radial-gradient(circle at 30% 30%, #30ba9e, #01998a)',
              color: '#ffffff',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}
