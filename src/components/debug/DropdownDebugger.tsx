"use client"

import { useState, useEffect } from 'react'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"

export default function DropdownDebugger() {
  const [isClient, setIsClient] = useState(false)
  const [clickCount, setClickCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <div className="fixed top-4 right-4 bg-white border p-4 rounded shadow-lg z-50 text-sm">
      <div className="space-y-2">
        <div>Client: {isClient ? '✅' : '❌'}</div>
        <div>Clicks: {clickCount}</div>
        <div>Open: {isOpen ? '✅' : '❌'}</div>
        
        <DropdownMenu onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setClickCount(c => c + 1)}
            >
              <MoreHorizontal className="h-4 w-4" />
              Test
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => alert('Item 1 clicked')}>
              Test Item 1
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => alert('Item 2 clicked')}>
              Test Item 2
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}