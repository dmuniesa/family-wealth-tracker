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

export default function DetailedDropdownDebug() {
  const [isClient, setIsClient] = useState(false)
  const [clickCount, setClickCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [portalElements, setPortalElements] = useState(0)

  useEffect(() => {
    setIsClient(true)
    
    // Count portal elements in DOM
    const checkPortals = () => {
      const portals = document.querySelectorAll('[data-radix-popper-content-wrapper]')
      setPortalElements(portals.length)
    }
    
    checkPortals()
    const interval = setInterval(checkPortals, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    console.log('Dropdown open state:', open)
    
    // Log all dropdown-related elements
    setTimeout(() => {
      const portals = document.querySelectorAll('[data-radix-popper-content-wrapper]')
      const contents = document.querySelectorAll('[data-radix-dropdown-menu-content]')
      console.log('Portal elements:', portals.length)
      console.log('Content elements:', contents.length)
      
      portals.forEach((portal, i) => {
        const rect = portal.getBoundingClientRect()
        console.log(`Portal ${i}:`, {
          visible: rect.width > 0 && rect.height > 0,
          position: { x: rect.x, y: rect.y },
          size: { width: rect.width, height: rect.height },
          styles: window.getComputedStyle(portal as Element)
        })
      })
    }, 100)
  }

  return (
    <div className="fixed top-4 right-4 bg-white border p-4 rounded shadow-lg z-[9999] text-xs max-w-xs">
      <div className="space-y-1">
        <div>Client: {isClient ? '✅' : '❌'}</div>
        <div>Clicks: {clickCount}</div>
        <div>Open State: {isOpen ? '✅' : '❌'}</div>
        <div>Portals in DOM: {portalElements}</div>
        
        <div className="border-t pt-2 mt-2">
          <div className="text-xs font-bold mb-2">Test Dropdown:</div>
          <div className="debug-portal">
            <DropdownMenu onOpenChange={handleOpenChange}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setClickCount(c => c + 1)}
                  className="w-full"
                >
                  <MoreHorizontal className="h-4 w-4 mr-2" />
                  Test Menu
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                className="bg-red-200 border-4 border-red-500"
                style={{ 
                  backgroundColor: 'red !important',
                  zIndex: 99999,
                  position: 'fixed'
                }}
              >
                <DropdownMenuItem 
                  onClick={() => {
                    alert('Item 1 clicked')
                    console.log('Item 1 clicked')
                  }}
                  className="bg-yellow-200"
                >
                  🟡 Test Item 1
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    alert('Item 2 clicked')
                    console.log('Item 2 clicked')
                  }}
                  className="bg-green-200"
                >
                  🟢 Test Item 2
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="border-t pt-2 mt-2">
          <div className="text-xs font-bold mb-2">Manual Test:</div>
          <div 
            className="bg-blue-200 p-2 rounded cursor-pointer border"
            onClick={() => {
              const testDiv = document.createElement('div')
              testDiv.innerHTML = `
                <div style="
                  position: fixed; 
                  top: 50%; 
                  left: 50%; 
                  z-index: 99999; 
                  background: red; 
                  color: white; 
                  padding: 20px;
                  border: 5px solid black;
                ">
                  Manual test overlay - Click to remove
                </div>
              `
              testDiv.onclick = () => document.body.removeChild(testDiv)
              document.body.appendChild(testDiv)
            }}
          >
            Click: Test Manual Overlay
          </div>
        </div>
      </div>
    </div>
  )
}