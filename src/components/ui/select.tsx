"use client"

import * as React from "react"
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
  
  const value = controlledValue !== undefined ? controlledValue : internalValue
  
  const closeSelect = React.useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleValueChange = React.useCallback((newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
    closeSelect()
  }, [controlledValue, onValueChange, closeSelect])

  const registerOption = React.useCallback((optionValue: string, optionLabel: string) => {
    setOptionsRegistry(prev => ({ ...prev, [optionValue]: optionLabel }))
  }, [])

  // Update selected label when value changes or when options are registered
  React.useEffect(() => {
    if (value && optionsRegistry[value] && selectedLabel !== optionsRegistry[value]) {
      setSelectedLabel(optionsRegistry[value])
    }
  }, [value, optionsRegistry, selectedLabel])

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
    setIsOpen: disabled ? () => {} : setIsOpen,
    value,
    onValueChange: handleValueChange,
    closeSelect,
    selectedLabel,
    setSelectedLabel,
    registerOption
  }), [isOpen, setIsOpen, value, handleValueChange, closeSelect, disabled, selectedLabel, setSelectedLabel, registerOption])

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
  const { selectedLabel } = useSelect()

  return (
    <span
      ref={ref}
      className={cn("block truncate", className)}
      {...props}
    >
      {children || selectedLabel || placeholder}
    </span>
  )
})
SelectValue.displayName = "SelectValue"

// Trigger component
const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, onClick, disabled, ...props }, ref) => {
  const { isOpen, setIsOpen } = useSelect()

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    if (!disabled) {
      setIsOpen(!isOpen)
    }
    onClick?.(event)
  }

  return (
    <button
      ref={ref}
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

// Content component
const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    position?: "item-aligned" | "popper"
  }
>(({ className, children, position = "popper", ...props }, ref) => {
  const { isOpen, closeSelect } = useSelect()
  const contentRef = React.useRef<HTMLDivElement>(null)

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        closeSelect()
      }
    }

    if (isOpen) {
      // Use setTimeout to avoid immediate closure on trigger click
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 0)
      
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, closeSelect])

  if (!isOpen) return null

  return (
    <div
      ref={contentRef}
      className={cn(
        "absolute z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
        position === "popper" 
          ? "top-full mt-1 w-full" 
          : "top-full mt-1",
        className
      )}
      {...props}
    >
      <div className="overflow-y-auto max-h-96 p-1">
        {children}
      </div>
    </div>
  )
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
  const label = typeof children === 'string' ? children : value

  // Register this option on mount
  React.useEffect(() => {
    registerOption(value, label)
  }, [value, label, registerOption])

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return
    onValueChange?.(value)
    setSelectedLabel(label)
    onClick?.(event)
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
      data-select-value={value}
      tabIndex={disabled ? -1 : 0}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && <Check className="h-4 w-4" />}
      </span>
      <span className="truncate">{children}</span>
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