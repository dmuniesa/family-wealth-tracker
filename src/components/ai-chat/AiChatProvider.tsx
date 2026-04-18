"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"
import { aiChatEvents } from "./aiChatEvents"
import type { ChatMessage, ChatConversation, AiOperationEvent } from "@/types"

interface AiChatContextType {
  messages: ChatMessage[]
  isOpen: boolean
  isEnabled: boolean
  isLoading: boolean
  unreadCount: number
  activeConversationId: number | null
  conversations: ChatConversation[]
  setIsOpen: (open: boolean) => void
  sendMessage: (content: string) => Promise<void>
  loadConversation: (id: number) => Promise<void>
  startNewConversation: () => Promise<void>
}

const AiChatContext = createContext<AiChatContextType | null>(null)

export function useAiChat() {
  const ctx = useContext(AiChatContext)
  if (!ctx) throw new Error("useAiChat must be used within AiChatProvider")
  return ctx
}

function dbMessageToChatMessage(msg: any): ChatMessage {
  return {
    id: String(msg.id),
    role: msg.role,
    content: msg.content,
    timestamp: msg.timestamp,
  }
}

export function AiChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null)
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const isOpenRef = useRef(false)

  // Keep ref in sync
  useEffect(() => { isOpenRef.current = isOpen }, [isOpen])

  // Fetch initial enabled state and load last active conversation
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch("/api/settings/ai")
        if (res.ok) {
          const data = await res.json()
          setIsEnabled(!!data.aiChatEnabled)
        }
      } catch {}
    }
    init()
  }, [])

  // Load conversations and last active when enabled
  useEffect(() => {
    if (!isEnabled) return

    const loadInitial = async () => {
      try {
        // Load user's conversations for history
        const convRes = await fetch("/api/chat/conversations")
        if (convRes.ok) {
          const data = await convRes.json()
          const userConvs = data.conversations || []
          setConversations(userConvs)

          // Auto-continue last active manual conversation
          const activeManual = userConvs.find(
            (c: ChatConversation) => c.status === "active" && c.type === "manual"
          )
          if (activeManual) {
            await loadConversationInternal(activeManual.id)
          }
        }
      } catch {}
    }
    loadInitial()
  }, [isEnabled])

  const loadConversationInternal = async (id: number) => {
    try {
      const res = await fetch(`/api/chat/conversations/${id}`)
      if (res.ok) {
        const data = await res.json()
        setActiveConversationId(id)
        setMessages((data.messages || []).map(dbMessageToChatMessage))
      }
    } catch {}
  }

  // Subscribe to AI operation events
  useEffect(() => {
    if (!isEnabled) return

    const unsubscribe = aiChatEvents.subscribe(async (event: AiOperationEvent) => {
      // For auto operations, create a new auto conversation and persist the log
      let convId = activeConversationId

      if (event.type === "info") {
        // Start of an auto operation batch
        try {
          const res = await fetch("/api/chat/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: event.message, type: "auto" }),
          })
          if (res.ok) {
            const data = await res.json()
            convId = data.id
          }
        } catch {}
      }

      if (!convId) return

      // Persist the operation log
      try {
        await fetch(`/api/chat/conversations/${convId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "ai-operation", content: event.message }),
        })
      } catch {}

      // Show in UI
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai-operation",
        content: event.message,
        timestamp: event.timestamp,
      }

      // Only show in current view if it's the active conversation
      setActiveConversationId(prev => {
        if (prev === convId || prev === null) {
          setMessages(prevMsgs => [...prevMsgs, msg])
          return convId || prev
        }
        return prev
      })

      if (!isOpenRef.current) {
        setUnreadCount(prev => prev + 1)
      }

      // Refresh conversations list
      refreshConversations()
    })

    return unsubscribe
  }, [isEnabled, activeConversationId])

  const refreshConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/conversations")
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
      }
    } catch {}
  }, [])

  // Clear unread when opening
  useEffect(() => {
    if (isOpen) setUnreadCount(0)
  }, [isOpen])

  const sendMessage = useCallback(async (content: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          conversationId: activeConversationId,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(err.error || `Error ${res.status}`)
      }

      const data = await res.json()

      // Update active conversation id if new
      if (data.conversationId && !activeConversationId) {
        setActiveConversationId(data.conversationId)
        refreshConversations()
      }

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai-response",
        content: data.response,
        timestamp: data.timestamp || new Date().toISOString(),
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (error) {
      const errMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "system",
        content: `Error: ${(error as Error).message}`,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setIsLoading(false)
    }
  }, [activeConversationId, refreshConversations])

  const loadConversation = useCallback(async (id: number) => {
    setIsLoading(true)
    try {
      await loadConversationInternal(id)
      refreshConversations()
    } finally {
      setIsLoading(false)
    }
  }, [refreshConversations])

  const startNewConversation = useCallback(async () => {
    // Close current conversation if exists
    if (activeConversationId) {
      try {
        await fetch(`/api/chat/conversations/${activeConversationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "closed" }),
        })
      } catch {}
    }

    setMessages([])
    setActiveConversationId(null)
    refreshConversations()
  }, [activeConversationId, refreshConversations])

  return (
    <AiChatContext.Provider value={{
      messages, isOpen, isEnabled, isLoading, unreadCount,
      activeConversationId, conversations,
      setIsOpen, sendMessage, loadConversation, startNewConversation,
    }}>
      {children}
    </AiChatContext.Provider>
  )
}
