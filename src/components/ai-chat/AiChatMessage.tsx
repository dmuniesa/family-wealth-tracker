"use client"

import type { ChatMessage } from "@/types"
import { Bot, Sparkles, User, Info, Zap } from "lucide-react"
import { renderInlineMarkdown } from "./renderMarkdown"

interface Props {
  message: ChatMessage
}

export function AiChatMessage({ message }: Props) {
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  if (message.role === "user") {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-3 py-2">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          <p className="text-[10px] text-blue-200 mt-1 text-right">{time}</p>
        </div>
      </div>
    )
  }

  if (message.role === "ai-response") {
    return (
      <div className="flex justify-start mb-3">
        <div className="flex gap-2 max-w-[85%]">
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center mt-0.5">
            <Bot className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-2xl rounded-bl-sm px-3 py-2">
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{renderInlineMarkdown(message.content)}</p>
            <p className="text-[10px] text-gray-400 mt-1">{time}</p>
          </div>
        </div>
      </div>
    )
  }

  if (message.role === "ai-action") {
    return (
      <div className="flex justify-start mb-3">
        <div className="flex gap-2 max-w-[85%]">
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center mt-0.5">
            <Zap className="w-3.5 h-3.5 text-cyan-600" />
          </div>
          <div className="bg-cyan-50 border border-cyan-200 rounded-2xl rounded-bl-sm px-3 py-2">
            <p className="text-sm text-cyan-800 whitespace-pre-wrap font-medium">{renderInlineMarkdown(message.content)}</p>
            <p className="text-[10px] text-cyan-400 mt-1">{time}</p>
          </div>
        </div>
      </div>
    )
  }

  if (message.role === "ai-operation") {
    return (
      <div className="flex justify-start mb-3">
        <div className="flex gap-2 max-w-[85%]">
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
            <Sparkles className="w-3.5 h-3.5 text-gray-500" />
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-bl-sm px-3 py-2">
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{renderInlineMarkdown(message.content)}</p>
            <p className="text-[10px] text-gray-400 mt-1">{time}</p>
          </div>
        </div>
      </div>
    )
  }

  // system messages (help, errors, info)
  return (
    <div className="flex justify-center mb-3">
      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2 rounded-xl max-w-[90%]">
        <div className="flex items-center gap-1.5 mb-1">
          <Info className="w-3 h-3 flex-shrink-0" />
          <span className="font-medium">Info</span>
        </div>
        <p className="whitespace-pre-wrap">{renderInlineMarkdown(message.content)}</p>
      </div>
    </div>
  )
}
