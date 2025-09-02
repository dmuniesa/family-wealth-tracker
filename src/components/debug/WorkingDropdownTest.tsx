"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import { SimpleDropdown, SimpleDropdownItem } from "@/components/ui/simple-dropdown"

export default function WorkingDropdownTest() {
  const [clickCount, setClickCount] = useState(0)

  return (
    <div className="fixed top-4 left-4 bg-green-100 border-2 border-green-500 p-4 rounded shadow-lg z-[9999] text-sm">
      <div className="space-y-2">
        <div className="font-bold text-green-700">Working Dropdown Test</div>
        <div>Clicks: {clickCount}</div>
        
        <SimpleDropdown 
          trigger={
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setClickCount(c => c + 1)}
              className="w-full"
            >
              <MoreHorizontal className="h-4 w-4 mr-2" />
              Simple Menu
            </Button>
          }
          className="bg-green-200 border-2 border-green-600"
        >
          <SimpleDropdownItem 
            onClick={() => alert('Simple Item 1 clicked!')}
            className="bg-yellow-200 hover:bg-yellow-300"
          >
            🟡 Simple Item 1
          </SimpleDropdownItem>
          <SimpleDropdownItem 
            onClick={() => alert('Simple Item 2 clicked!')}
            className="bg-blue-200 hover:bg-blue-300"
          >
            🔵 Simple Item 2
          </SimpleDropdownItem>
        </SimpleDropdown>
      </div>
    </div>
  )
}