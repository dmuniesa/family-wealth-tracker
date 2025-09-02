"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Check, ChevronRight, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

// Context for dropdown state management
interface DropdownContextValue {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  closeDropdown: () => void
  triggerRef: React.RefObject<HTMLElement | null>
}

const DropdownContext = React.createContext<DropdownContextValue | null>(null)

const useDropdown = () => {
  const context = React.useContext(DropdownContext)
  if (!context) {
    throw new Error('Dropdown components must be used within a DropdownMenu')
  }
  return context
}

// Root component
const DropdownMenu: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLElement | null>(null)
  
  const closeDropdown = React.useCallback(() => {
    setIsOpen(false)
  }, [])

  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        closeDropdown()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, closeDropdown])

  const contextValue = React.useMemo(() => ({
    isOpen,
    setIsOpen,
    closeDropdown,
    triggerRef
  }), [isOpen, setIsOpen, closeDropdown, triggerRef])

  return (
    <DropdownContext.Provider value={contextValue}>
      <div className="relative">
        {children}
      </div>
    </DropdownContext.Provider>
  )
}

// Trigger component
const DropdownMenuTrigger = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & {
    asChild?: boolean
  }
>(({ className, children, onClick, asChild = false, ...props }, ref) => {
  const { isOpen, setIsOpen, triggerRef } = useDropdown()

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault()
    setIsOpen(!isOpen)
    onClick?.(event)
  }

  const combinedRef = React.useCallback((node: HTMLElement | null) => {
    triggerRef.current = node
    if (typeof ref === 'function') {
      ref(node)
    } else if (ref) {
      ref.current = node
    }
  }, [ref, triggerRef])

  if (asChild) {
    return React.cloneElement(children as React.ReactElement, {
      ref: combinedRef,
      onClick: handleClick,
      "aria-expanded": isOpen,
      "aria-haspopup": "menu",
      ...props
    })
  }

  return (
    <button
      ref={combinedRef}
      className={cn("outline-none", className)}
      onClick={handleClick}
      aria-expanded={isOpen}
      aria-haspopup="menu"
      {...props}
    >
      {children}
    </button>
  )
})
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

// Content component
const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    sideOffset?: number
    align?: "start" | "center" | "end"
  }
>(({ className, children, sideOffset = 4, align = "end", ...props }, ref) => {
  const { isOpen, closeDropdown, triggerRef } = useDropdown()
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState({ 
    x: 0, 
    y: 0, 
    placement: "bottom" as "top" | "bottom",
    useRight: false 
  })
  const [mounted, setMounted] = React.useState(false)

  // Ensure component is mounted (for SSR)
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate position based on trigger element
  React.useLayoutEffect(() => {
    if (isOpen && triggerRef.current && mounted) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      const scrollY = window.scrollY
      const scrollX = window.scrollX
      
      // Estimate content dimensions
      const estimatedContentHeight = 200
      const estimatedContentWidth = 200
      
      // Calculate vertical position
      const spaceBelow = viewportHeight - triggerRect.bottom - sideOffset
      const spaceAbove = triggerRect.top - sideOffset
      
      let y: number
      let placement: "top" | "bottom"
      
      if (spaceBelow < estimatedContentHeight && spaceAbove > spaceBelow) {
        // Position above
        y = triggerRect.top + scrollY - sideOffset
        placement = "top"
      } else {
        // Position below
        y = triggerRect.bottom + scrollY + sideOffset
        placement = "bottom"
      }
      
      // Calculate horizontal position based on alignment
      let x: number
      let useRight = false
      
      switch (align) {
        case "start":
          x = triggerRect.left + scrollX
          break
        case "center":
          x = triggerRect.left + scrollX + (triggerRect.width / 2) - (estimatedContentWidth / 2)
          break
        case "end":
        default:
          // For end alignment, use right positioning
          x = viewportWidth - (triggerRect.right + scrollX)
          useRight = true
          break
      }
      
      // Ensure content stays within viewport
      if (!useRight) {
        x = Math.max(8, Math.min(x, viewportWidth - estimatedContentWidth - 8))
      } else {
        x = Math.max(8, x)
      }
      
      setPosition({ x, y, placement, useRight })
    }
  }, [isOpen, triggerRef, align, sideOffset, mounted])

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node) && 
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        closeDropdown()
      }
    }

    if (isOpen && mounted) {
      // Use setTimeout to avoid immediate closure on trigger click
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 0)
      
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, closeDropdown, triggerRef, mounted])

  if (!isOpen || !mounted) return null

  const content = (
    <div
      ref={contentRef}
      className={cn(
        "fixed z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        className
      )}
      style={{
        ...(position.useRight ? { right: position.x } : { left: position.x }),
        top: position.placement === "top" ? position.y - 200 : position.y,
        transformOrigin: position.placement === "top" ? "bottom center" : "top center"
      }}
      {...props}
    >
      <div onClick={closeDropdown}>
        {children}
      </div>
    </div>
  )

  return createPortal(content, document.body)
})
DropdownMenuContent.displayName = "DropdownMenuContent"

// Menu item component
const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    inset?: boolean
    disabled?: boolean
  }
>(({ className, inset, disabled, children, onClick, ...props }, ref) => {
  const { closeDropdown } = useDropdown()

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return
    onClick?.(event)
    closeDropdown()
  }

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        inset && "pl-8",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      onClick={handleClick}
      tabIndex={disabled ? -1 : 0}
      {...props}
    >
      {children}
    </div>
  )
})
DropdownMenuItem.displayName = "DropdownMenuItem"

// Checkbox item component
const DropdownMenuCheckboxItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    checked?: boolean
    disabled?: boolean
  }
>(({ className, children, checked, disabled, onClick, ...props }, ref) => {
  const { closeDropdown } = useDropdown()

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return
    onClick?.(event)
    closeDropdown()
  }

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      onClick={handleClick}
      tabIndex={disabled ? -1 : 0}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {checked && <Check className="h-4 w-4" />}
      </span>
      {children}
    </div>
  )
})
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem"

// Radio item component
const DropdownMenuRadioItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: string
    disabled?: boolean
  }
>(({ className, children, disabled, onClick, ...props }, ref) => {
  const { closeDropdown } = useDropdown()

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return
    onClick?.(event)
    closeDropdown()
  }

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      onClick={handleClick}
      tabIndex={disabled ? -1 : 0}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <Circle className="h-2 w-2 fill-current" />
      </span>
      {children}
    </div>
  )
})
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem"

// Label component
const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "px-2 py-1.5 text-sm font-semibold",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = "DropdownMenuLabel"

// Separator component
const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

// Shortcut component
const DropdownMenuShortcut: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({
  className,
  ...props
}) => {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
      {...props}
    />
  )
}
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

// Group component - simple wrapper
const DropdownMenuGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div role="group">{children}</div>
)

// Compatibility exports (simplified versions)
const DropdownMenuPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>
const DropdownMenuSub: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>
const DropdownMenuSubContent = DropdownMenuContent
const DropdownMenuSubTrigger = DropdownMenuItem
const DropdownMenuRadioGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div role="radiogroup">{children}</div>
)

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}