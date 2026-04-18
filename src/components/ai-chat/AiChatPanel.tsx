"use client"

import { useRef, useEffect, useState } from "react"
import { X, Plus, History, ChevronLeft } from "lucide-react"
import { useAiChat } from "./AiChatProvider"
import { AiChatMessage } from "./AiChatMessage"
import { AiChatInput } from "./AiChatInput"
import { useTranslations } from "next-intl"
import type { ChatConversation } from "@/types"

export function AiChatPanel() {
  const {
    messages, isOpen, setIsOpen, sendMessage, isLoading,
    isEnabled, conversations, loadConversation, startNewConversation,
  } = useAiChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showHistory, setShowHistory] = useState(false)
  const t = useTranslations()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (!isEnabled || !isOpen) return null

  // History view
  if (showHistory) {
    return (
      <div className="fixed bottom-24 right-4 sm:right-6 z-40 flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 w-[calc(100vw-2rem)] sm:w-[400px] max-h-[520px]">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <button
            onClick={() => setShowHistory(false)}
            className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <p className="text-sm font-semibold text-gray-900">{t("aiChat.history")}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">{t("aiChat.noConversations")}</p>
          ) : (
            conversations.map((conv: ChatConversation) => (
              <button
                key={conv.id}
                onClick={() => { loadConversation(conv.id); setShowHistory(false) }}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors mb-0.5"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-800 truncate flex-1 mr-2">
                    {conv.title || (conv.type === "auto" ? t("aiChat.autoConversation") : t("aiChat.manualConversation"))}
                  </p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    conv.type === "auto" ? "bg-gray-100 text-gray-500" : "bg-purple-100 text-purple-600"
                  }`}>
                    {conv.type === "auto" ? "Auto" : "Chat"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-400">
                    {new Date(conv.updated_at).toLocaleDateString()} {new Date(conv.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {conv.message_count || 0} msgs
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-24 right-4 sm:right-6 z-40 flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 w-[calc(100vw-2rem)] sm:w-[400px] max-h-[520px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
            <span className="text-purple-600 text-sm font-bold">AI</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{t("aiChat.title")}</p>
            <p className="text-[10px] text-gray-400">{t("aiChat.subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={startNewConversation}
            className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            title={t("aiChat.newConversation")}
          >
            <Plus className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            title={t("aiChat.history")}
          >
            <History className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-[200px]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8">
            <p className="text-sm">{t("aiChat.noMessages")}</p>
          </div>
        ) : (
          messages.map(msg => <AiChatMessage key={msg.id} message={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <AiChatInput onSend={sendMessage} isLoading={isLoading} />
    </div>
  )
}
