"use client"

import { MessageSquare } from "lucide-react"
import { useAiChat } from "./AiChatProvider"

export function AiChatBubble() {
  const { isOpen, setIsOpen, unreadCount, isEnabled } = useAiChat()

  if (!isEnabled || isOpen) return null

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="fixed bottom-6 right-4 sm:right-6 z-40 w-14 h-14 rounded-full bg-purple-600 text-white shadow-lg hover:bg-purple-700 transition-all hover:scale-105 flex items-center justify-center"
      title="AI Chat"
    >
      <MessageSquare className="w-6 h-6" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  )
}
