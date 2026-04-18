"use client"

import { useState, useEffect, useCallback } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { AuthGuard } from "@/components/auth/auth-guard"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageSquare, Trash2, XCircle, Eye, ArrowLeft, Sparkles, User, AlertTriangle } from "lucide-react"
import { useTranslations } from "next-intl"
import type { ChatConversation, ChatMessageDB } from "@/types"

export default function ChatConversationsPage() {
  const t = useTranslations()
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [selectedConv, setSelectedConv] = useState<ChatConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessageDB[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<"all" | "auto" | "manual">("all")

  const fetchConversations = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filterType !== "all") params.set("type", filterType)
      const res = await fetch(`/api/chat/conversations?${params}`)
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err)
    } finally {
      setLoading(false)
    }
  }, [filterType])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  const loadConversation = async (conv: ChatConversation) => {
    try {
      const res = await fetch(`/api/chat/conversations/${conv.id}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedConv(data.conversation)
        setMessages(data.messages || [])
      }
    } catch (err) {
      console.error("Failed to load conversation:", err)
    }
  }

  const handleClose = async (id: number) => {
    try {
      await fetch(`/api/chat/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      })
      fetchConversations()
      if (selectedConv?.id === id) {
        setSelectedConv(null)
        setMessages([])
      }
    } catch (err) {
      console.error("Failed to close conversation:", err)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t("chatPage.deleteConfirm"))) return
    try {
      await fetch(`/api/chat/conversations/${id}`, { method: "DELETE" })
      fetchConversations()
      if (selectedConv?.id === id) {
        setSelectedConv(null)
        setMessages([])
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err)
    }
  }

  const errorCount = (conv: ChatConversation) => {
    // Approximate: if conversation has system messages with errors
    return 0 // Will show in message detail view
  }

  const msgHasErrors = messages.filter(m => m.role === "system" && m.content.includes("Error")).length

  return (
    <AuthGuard requireRole="administrator">
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="h-7 w-7 text-purple-500" />
              {t("chatPage.title")}
            </h1>
            <p className="text-gray-600">{t("chatPage.subtitle")}</p>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {(["all", "manual", "auto"] as const).map(type => (
              <Button
                key={type}
                variant={filterType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType(type)}
              >
                {t(`chatPage.filter${type.charAt(0).toUpperCase() + type.slice(1)}`)}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Conversation list */}
            <div className="lg:col-span-1 space-y-2">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                </div>
              ) : conversations.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8 text-gray-500">
                    {t("chatPage.noConversations")}
                  </CardContent>
                </Card>
              ) : (
                conversations.map(conv => (
                  <Card
                    key={conv.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow ${
                      selectedConv?.id === conv.id ? "ring-2 ring-purple-400" : ""
                    }`}
                    onClick={() => loadConversation(conv)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {conv.type === "auto" ? (
                              <Sparkles className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            ) : (
                              <MessageSquare className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                            )}
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {conv.title || (conv.type === "auto" ? t("chatPage.autoConversation") : t("chatPage.manualConversation"))}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {conv.user_name}
                            </span>
                            <span className="text-xs text-gray-400">
                              {conv.message_count || 0} msgs
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              conv.status === "active"
                                ? "bg-green-100 text-green-600"
                                : "bg-gray-100 text-gray-500"
                            }`}>
                              {conv.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {new Date(conv.updated_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 ml-2" onClick={e => e.stopPropagation()}>
                          {conv.status === "active" && (
                            <button
                              onClick={() => handleClose(conv.id)}
                              className="p-1 hover:bg-gray-100 rounded"
                              title={t("chatPage.close")}
                            >
                              <XCircle className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(conv.id)}
                            className="p-1 hover:bg-red-50 rounded"
                            title={t("chatPage.delete")}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Message detail */}
            <div className="lg:col-span-2">
              {selectedConv ? (
                <Card>
                  <CardContent className="p-0">
                    {/* Conversation header */}
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {selectedConv.title || t("chatPage.untitled")}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{selectedConv.user_name}</span>
                          <span>{selectedConv.type === "auto" ? "Auto" : "Manual"}</span>
                          <span>{new Date(selectedConv.created_at).toLocaleString()}</span>
                          {msgHasErrors > 0 && (
                            <span className="flex items-center gap-1 text-amber-600">
                              <AlertTriangle className="w-3 h-3" />{msgHasErrors} errors
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSelectedConv(null); setMessages([]) }}
                      >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        {t("chatPage.back")}
                      </Button>
                    </div>

                    {/* Messages */}
                    <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
                      {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[80%] rounded-xl px-3 py-2 ${
                            msg.role === "user"
                              ? "bg-blue-600 text-white rounded-br-sm"
                            : msg.role === "ai-response"
                              ? "bg-purple-50 border border-purple-100 rounded-bl-sm"
                            : msg.role === "ai-operation"
                              ? "bg-gray-50 border border-gray-100 rounded-bl-sm"
                            : "bg-amber-50 border border-amber-100 rounded-bl-sm"
                          }`}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-[10px] font-medium uppercase tracking-wide opacity-60">
                                {msg.role === "ai-operation" ? "operation" : msg.role}
                              </span>
                              <span className="text-[10px] opacity-40">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <p className={`text-sm whitespace-pre-wrap ${
                              msg.role === "user" ? "text-white" : "text-gray-800"
                            }`}>
                              {msg.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <Eye className="w-10 h-10 mb-3" />
                    <p className="text-sm">{t("chatPage.selectConversation")}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </MainLayout>
    </AuthGuard>
  )
}
