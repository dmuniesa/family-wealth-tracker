"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

// Context for select state management
interface SelectContextValue {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  value?: string
  onValueChange?: (value: string) => void
  closeSelect: () => void
  placeholder?: string
  selectedLabel?: string
  setSelectedLabel: (label: string) => void
  registerOption: (value: string, label: string) => void
  triggerRef: React.RefObject<HTMLButtonElement>
  disabled?: boolean
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

const useSelect = () => {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error('Select components must be used within a Select')
  }
  return context
}

// Root component
interface SelectProps {
  children: React.ReactNode
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
}

const Select: React.FC<SelectProps> = ({ 
  children, 
  value: controlledValue, 
  defaultValue,
  onValueChange,
  disabled 
}) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedLabel, setSelectedLabel] = React.useState("")
  const [optionsRegistry, setOptionsRegistry] = React.useState<Record<string, string>>({})
  const [isInitialized, setIsInitialized] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  
  const value = controlledValue !== undefined ? controlledValue : internalValue
  
  const closeSelect = React.useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleValueChange = React.useCallback((newValue: string) => {
    // First update internal value if needed
    if (controlledValue === undefined) {
      setInternalValue(newValue)
    }
    
    // Call the external onChange handler (from react-hook-form)
    onValueChange?.(newValue)
    
    // Close the select
    closeSelect()
  }, [controlledValue, onValueChange, closeSelect])

  const registerOption = React.useCallback((optionValue: string, optionLabel: string) => {
    setOptionsRegistry(prev => {
      const newRegistry = { ...prev, [optionValue]: optionLabel }
      // If we have a value and this is the matching option, set the label immediately
      if (value && optionValue === value && !selectedLabel) {
        setTimeout(() => setSelectedLabel(optionLabel), 0)
      }
      return newRegistry
    })
  }, [value, selectedLabel])

  // Update selected label when value changes or when options are registered
  React.useEffect(() => {
    if (value && optionsRegistry[value]) {
      setSelectedLabel(optionsRegistry[value])
    } else if (!value) {
      setSelectedLabel("")
    }
  }, [value, optionsRegistry])
  
  // Force update internal value when controlled value changes
  React.useEffect(() => {
    if (controlledValue !== undefined && controlledValue !== internalValue) {
      setInternalValue(controlledValue)
    }
  }, [controlledValue, internalValue])

  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        closeSelect()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, closeSelect])

  const contextValue = React.useMemo(() => ({
    isOpen,
    setIsOpen,
    value,
    onValueChange: handleValueChange,
    closeSelect,
    selectedLabel,
    setSelectedLabel,
    registerOption,
    triggerRef,
    disabled
  }), [isOpen, setIsOpen, value, handleValueChange, closeSelect, selectedLabel, registerOption, disabled])

  return (
    <SelectContext.Provider value={contextValue}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

// Group component
const SelectGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div role="group">{children}</div>
)

// Value component
const SelectValue = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & {
    placeholder?: string
    children?: React.ReactNode
  }
>(({ className, placeholder, children, ...props }, ref) => {
  const { selectedLabel, value } = useSelect()

  // Priority: children > selectedLabel > placeholder > value
  const displayValue = children || selectedLabel || placeholder || value

  return (
    <span
      ref={ref}
      className={cn("block truncate", className)}
      {...props}
    >
      {displayValue}
    </span>
  )
})
SelectValue.displayName = "SelectValue"

// Trigger component
const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, onClick, disabled: propDisabled, ...props }, ref) => {
  const { isOpen, setIsOpen, triggerRef, disabled: contextDisabled } = useSelect()
  const disabled = propDisabled || contextDisabled

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    if (!disabled) {
      setIsOpen(!isOpen)
    }
    onClick?.(event)
  }

  const combinedRef = React.useCallback((node: HTMLButtonElement) => {
    triggerRef.current = node
    if (ref) {
      if (typeof ref === 'function') {
        ref(node)
      } else {
        ref.current = node
      }
    }
  }, [ref, triggerRef])

  return (
    <button
      ref={combinedRef}
      type="button"
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className
      )}
      onClick={handleClick}
      disabled={disabled}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  )
})
SelectTrigger.displayName = "SelectTrigger"

// Content component with portal
const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    position?: "item-aligned" | "popper"
  }
>(({ className, children, position = "popper", ...props }, ref) => {
  const { isOpen, closeSelect, triggerRef } = useSelect()
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [contentPosition, setContentPosition] = React.useState<{
    top: number
    left: number
    width: number
  }>({ top: 0, left: 0, width: 0 })

  // Calculate position when opened
  React.useEffect(() => {
    if (isOpen && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const scrollY = window.scrollY || window.pageYOffset
      const scrollX = window.scrollX || window.pageXOffset
      
      setContentPosition({
        top: triggerRect.bottom + scrollY,
        left: triggerRect.left + scrollX,
        width: triggerRect.width
      })
    }
  }, [isOpen, triggerRef])

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        contentRef.current && 
        !contentRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        closeSelect()
      }
    }

    if (isOpen) {
      // Use setTimeout to avoid immediate closure on trigger click
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 100) // Increased timeout to give SelectItem click priority
      
      return () => {
        clearTimeout(timeoutId)
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen, closeSelect, triggerRef])

  // Handle scroll to update position
  React.useEffect(() => {
    const handleScroll = () => {
      if (isOpen && triggerRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect()
        const scrollY = window.scrollY || window.pageYOffset
        const scrollX = window.scrollX || window.pageXOffset
        
        setContentPosition({
          top: triggerRect.bottom + scrollY,
          left: triggerRect.left + scrollX,
          width: triggerRect.width
        })
      }
    }

    if (isOpen) {
      window.addEventListener('scroll', handleScroll, true)
      window.addEventListener('resize', handleScroll)
      return () => {
        window.removeEventListener('scroll', handleScroll, true)
        window.removeEventListener('resize', handleScroll)
      }
    }
  }, [isOpen, triggerRef])

  if (!isOpen) return null

  const content = (
    <div
      ref={contentRef}
      className={cn(
        "fixed z-[9999] max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg",
        className
      )}
      style={{
        top: contentPosition.top,
        left: contentPosition.left,
        width: contentPosition.width,
        minWidth: contentPosition.width,
        pointerEvents: 'auto'
      }}
      role="listbox"
      {...props}
    >
      <div className="overflow-y-auto max-h-96 p-1" style={{ pointerEvents: 'auto' }}>
        {children}
      </div>
    </div>
  )

  // Render in portal to escape table overflow constraints
  return typeof document !== 'undefined' 
    ? createPortal(content, document.body)
    : null
})
SelectContent.displayName = "SelectContent"

// Item component
const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value: string
    disabled?: boolean
  }
>(({ className, children, value, disabled, onClick, ...props }, ref) => {
  const { value: selectedValue, onValueChange, setSelectedLabel, registerOption } = useSelect()
  const isSelected = selectedValue === value
  
  // Extract text content from children
  const label = React.useMemo(() => {
    if (typeof children === 'string') return children
    if (typeof children === 'number') return children.toString()
    
    // For JSX expressions like {account.name} ({account.currency}), convert to string
    try {
      const textContent = React.Children.toArray(children).join('')
      return textContent || value
    } catch {
      return value
    }
  }, [children, value])

  // Register this option on mount and update selected label if this is the selected value
  React.useEffect(() => {
    registerOption(value, label)
    // If this option's value matches the current selected value, update the label immediately
    if (selectedValue === value) {
      setSelectedLabel(label)
    }
  }, [value, label, registerOption, selectedValue, setSelectedLabel])

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return
    
    // Stop all event propagation immediately
    event.stopPropagation()
    event.preventDefault()
    event.nativeEvent.stopImmediatePropagation()
    
    // Use setTimeout to ensure this happens after any outside click handlers
    setTimeout(() => {
      onValueChange?.(value)
      setSelectedLabel(label)
    }, 0)
    
    onClick?.(event)
  }

  const handleMouseEnter = () => {
    // Mouse enter handler for future use
  }

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        disabled && "pointer-events-none opacity-50",
        isSelected && "bg-accent text-accent-foreground",
        className
      )}
      onClick={handleClick}
      onMouseDown={handleClick}
      onMouseEnter={handleMouseEnter}
      data-select-value={value}
      tabIndex={disabled ? -1 : 0}
      role="option"
      aria-selected={isSelected}
      style={{ pointerEvents: disabled ? 'none' : 'auto', zIndex: 1 }}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && <Check className="h-4 w-4" />}
      </span>
      <span className="truncate" style={{ pointerEvents: 'none' }}>
        {children}
      </span>
    </div>
  )
})
SelectItem.displayName = "SelectItem"

// Label component
const SelectLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
    {...props}
  />
))
SelectLabel.displayName = "SelectLabel"

// Separator component
const SelectSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = "SelectSeparator"

// Scroll button components (simplified)
const SelectScrollUpButton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </div>
))
SelectScrollUpButton.displayName = "SelectScrollUpButton"

const SelectScrollDownButton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </div>
))
SelectScrollDownButton.displayName = "SelectScrollDownButton"

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}