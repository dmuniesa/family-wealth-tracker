"use client"

import * as React from "react"
import { Check, ChevronRight, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

// Context for dropdown state management
interface DropdownContextValue {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  closeDropdown: () => void
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
    closeDropdown
  }), [isOpen, setIsOpen, closeDropdown])

  return (
    <DropdownContext.Provider value={contextValue}>
      {children}
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
  const { isOpen, setIsOpen } = useDropdown()

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault()
    setIsOpen(!isOpen)
    onClick?.(event)
  }

  if (asChild) {
    return React.cloneElement(children as React.ReactElement, {
      ref,
      onClick: handleClick,
      "aria-expanded": isOpen,
      "aria-haspopup": "menu",
      ...props
    })
  }

  return (
    <button
      ref={ref}
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
  const { isOpen, closeDropdown } = useDropdown()
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState<"top" | "bottom">("bottom")

  // Calculate position based on available space
  React.useLayoutEffect(() => {
    if (isOpen && contentRef.current) {
      const triggerElement = contentRef.current.parentElement?.querySelector('button')
      if (triggerElement) {
        const triggerRect = triggerElement.getBoundingClientRect()
        const viewportHeight = window.innerHeight
        const spaceBelow = viewportHeight - triggerRect.bottom - sideOffset
        const spaceAbove = triggerRect.top - sideOffset
        
        // Estimate content height (assume ~200px max)
        const estimatedContentHeight = 200
        
        if (spaceBelow < estimatedContentHeight && spaceAbove > spaceBelow) {
          setPosition("top")
        } else {
          setPosition("bottom")
        }
      }
    }
  }, [isOpen, sideOffset])

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        closeDropdown()
      }
    }

    if (isOpen) {
      // Use setTimeout to avoid immediate closure on trigger click
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 0)
      
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, closeDropdown])

  if (!isOpen) return null

  const alignmentClass = {
    start: "left-0",
    center: "left-1/2 transform -translate-x-1/2", 
    end: "right-0"
  }[align]

  const positionClass = position === "top" 
    ? `bottom-full mb-[${sideOffset}px]` 
    : `top-full mt-[${sideOffset}px]`

  return (
    <div
      ref={contentRef}
      className={cn(
        "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        alignmentClass,
        positionClass,
        className
      )}
      {...props}
    >
      <div onClick={closeDropdown}>
        {children}
      </div>
    </div>
  )
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