'use client'

import * as React from 'react'
import { CheckIcon, ChevronDownIcon, XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

interface MultiSelectOption {
  value: string
  label: string
  description?: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select options',
  className,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (option.description && option.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Handle selection toggle
  const toggleSelection = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  // Remove a selected item
  const removeSelection = (value: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selected.filter(v => v !== value))
  }

  // Clear all selections
  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
  }

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative">
      {/* Trigger */}
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        className={cn(
          'w-full justify-between text-left font-normal',
          !selected.length && 'text-muted-foreground',
          className
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-1">
          {selected.length > 0 ? (
            <>
              {selected.slice(0, 3).map(value => {
                const option = options.find(opt => opt.value === value)
                return option ? (
                  <Badge key={value} variant="secondary" className="mr-1">
                    {option.label}
                    <span
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                      onClick={(e) => removeSelection(value, e)}
                    >
                      <XIcon className="h-3 w-3" />
                    </span>
                  </Badge>
                ) : null
              })}
              {selected.length > 3 && (
                <Badge variant="secondary">+{selected.length - 3} more</Badge>
              )}
            </>
          ) : (
            <span>{placeholder}</span>
          )}
        </div>
        <div className="flex items-center">
          {selected.length > 0 && (
            <span
              className="mr-2 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
              onClick={clearAll}
            >
              <XIcon className="h-4 w-4" />
            </span>
          )}
          <ChevronDownIcon className="h-4 w-4 opacity-50" />
        </div>
      </Button>

      {/* Content */}
      {isOpen && (
        <div
          ref={contentRef}
          className="absolute top-full z-50 mt-1 w-full min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
        >
          {/* Search input */}
          <div className="border-b p-1">
            <input
              type="text"
              placeholder="Search..."
              className="w-full rounded-sm px-2 py-1 text-sm outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          {/* Options with scrollbar */}
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className="relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-hidden hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  onClick={() => toggleSelection(option.value)}
                  title={option.description ? `${option.label} - ${option.description}` : option.label}
                >
                  <div className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <Checkbox
                      checked={selected.includes(option.value)}
                      onCheckedChange={() => toggleSelection(option.value)}
                    />
                  </div>
                  <div>
                    <div>{option.label}</div>
                    {option.description && (
                      <div className="text-xs text-muted-foreground">
                        {option.description}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-1.5 pl-8 pr-2 text-sm text-muted-foreground">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}