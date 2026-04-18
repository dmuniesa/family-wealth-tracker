"use client"

import { useState, type KeyboardEvent } from "react"
import { Send, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

interface Props {
  onSend: (message: string) => Promise<void>
  isLoading: boolean
}

export function AiChatInput({ onSend, isLoading }: Props) {
  const [value, setValue] = useState("")
  const t = useTranslations()

  const handleSend = async () => {
    const trimmed = value.trim()
    if (!trimmed || isLoading) return
    setValue("")
    await onSend(trimmed)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-gray-200 p-3">
      <div className="flex items-end gap-2">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("aiChat.placeholder")}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent max-h-24"
          style={{ minHeight: "38px" }}
        />
        <button
          onClick={handleSend}
          disabled={!value.trim() || isLoading}
          className="flex-shrink-0 w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  )
}
