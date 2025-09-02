"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SimpleDropdownProps {
  children: React.ReactNode
  trigger: React.ReactNode
  className?: string
}

export function SimpleDropdown({ children, trigger, className }: SimpleDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (!mounted) {
    return <div className="inline-block">{trigger}</div>
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      
      {isOpen && (
        <div className={cn(
          "absolute right-0 top-full mt-1 min-w-[8rem] overflow-hidden rounded-md border bg-white p-1 shadow-md z-50",
          className
        )}>
          <div onClick={() => setIsOpen(false)}>
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

interface SimpleDropdownItemProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}

export function SimpleDropdownItem({ children, onClick, className }: SimpleDropdownItemProps) {
  return (
    <div
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 transition-colors",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}