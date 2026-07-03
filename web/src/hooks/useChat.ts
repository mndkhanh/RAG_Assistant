import { useState } from 'react'
import { sendChatMessage } from '../lib/api'
import type { ChatMessage } from '../types'

const INITIAL_MESSAGES: ChatMessage[] = [
  { id: 1, role: 'assistant', text: "Hi, I'm OptiBot, the support assistant for OptiSigns.com. Ask me anything about the product." },
]

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || isSending) return

    setMessages((prev) => [...prev, { id: prev.length + 1, role: 'user', text: trimmed }])
    setIsSending(true)
    setError(null)

    try {
      const { threadId: nextThreadId, reply } = await sendChatMessage(trimmed, threadId)
      setThreadId(nextThreadId)
      setMessages((prev) => [...prev, { id: prev.length + 1, role: 'assistant', text: reply }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach OptiBot')
    } finally {
      setIsSending(false)
    }
  }

  return { messages, isSending, error, sendMessage }
}
