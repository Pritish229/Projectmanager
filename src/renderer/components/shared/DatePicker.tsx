import { useState, useRef, useEffect, useMemo } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value?: string | null // Format: YYYY-MM-DD
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  position?: 'top' | 'bottom'
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  className,
  position = 'bottom'
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Parse current date value
  const selectedDate = useMemo(() => {
    if (!value) return null
    const parts = value.split('-')
    if (parts.length !== 3) return null
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
  }, [value])

  // Current view state (year/month in the picker)
  const [viewYear, setViewYear] = useState(() => {
    return selectedDate ? selectedDate.getFullYear() : new Date().getFullYear()
  })
  const [viewMonth, setViewMonth] = useState(() => {
    return selectedDate ? selectedDate.getMonth() : new Date().getMonth()
  })

  // Sync view when selectedDate changes (e.g. from external form resets)
  useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear())
      setViewMonth(selectedDate.getMonth())
    }
  }, [selectedDate])

  // Handle clicking outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isOpen])

  // Calendar logic
  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth + 1, 0).getDate()
  }, [viewYear, viewMonth])

  const firstDayOfWeek = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).getDay() // 0 = Sunday, 1 = Monday, etc.
  }, [viewYear, viewMonth])

  const previousMonthDays = useMemo(() => {
    return new Date(viewYear, viewMonth, 0).getDate()
  }, [viewYear, viewMonth])

  // Grid days (contains { day: number, isCurrentMonth: boolean, dateString: string })
  const calendarCells = useMemo(() => {
    const cells = []

    // Previous month padding days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const prevDay = previousMonthDays - i
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear
      const mStr = String(prevMonth + 1).padStart(2, '0')
      const dStr = String(prevDay).padStart(2, '0')
      cells.push({
        day: prevDay,
        isCurrentMonth: false,
        dateString: `${prevYear}-${mStr}-${dStr}`
      })
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const mStr = String(viewMonth + 1).padStart(2, '0')
      const dStr = String(i).padStart(2, '0')
      cells.push({
        day: i,
        isCurrentMonth: true,
        dateString: `${viewYear}-${mStr}-${dStr}`
      })
    }

    // Next month padding days to fill 42 cells (6 rows)
    const remaining = 42 - cells.length
    for (let i = 1; i <= remaining; i++) {
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear
      const mStr = String(nextMonth + 1).padStart(2, '0')
      const dStr = String(i).padStart(2, '0')
      cells.push({
        day: i,
        isCurrentMonth: false,
        dateString: `${nextYear}-${mStr}-${dStr}`
      })
    }

    return cells
  }, [viewYear, viewMonth, daysInMonth, firstDayOfWeek, previousMonthDays])

  // Navigate months
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(prev => prev - 1)
    } else {
      setViewMonth(prev => prev - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(prev => prev + 1)
    } else {
      setViewMonth(prev => prev + 1)
    }
  }

  // Quick select year range
  const years = useMemo(() => {
    const current = new Date().getFullYear()
    const list = []
    for (let y = current - 10; y <= current + 15; y++) {
      list.push(y)
    }
    return list
  }, [])

  // Select day
  const handleSelectDay = (dateString: string) => {
    if (disabled) return
    onChange(dateString)
    setIsOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setIsOpen(false)
  }

  const displayValue = selectedDate
    ? selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : ''

  return (
    <div className={cn("relative w-full", className)} ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full px-3 py-2 rounded-lg border text-sm bg-background text-left outline-none cursor-pointer transition-all",
          "hover:border-primary/50 focus:border-primary select-none",
          isOpen && "border-primary ring-2 ring-primary/10",
          disabled && "opacity-50 cursor-not-allowed hover:border-border"
        )}
      >
        <span className={cn("flex items-center gap-2 truncate", !displayValue && "text-muted-foreground")}>
          <CalendarIcon className="w-4 h-4 shrink-0 text-muted-foreground/80" />
          {displayValue || placeholder}
        </span>
        {displayValue && !disabled && (
          <span
            onClick={handleClear}
            className="p-0.5 rounded-full hover:bg-muted text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      {/* Popover Calendar Grid */}
      {isOpen && (
        <div className={cn(
          "absolute left-0 w-72 rounded-xl border bg-popover text-popover-foreground shadow-2xl p-4 z-[9999] animate-scale-in",
          position === 'top' ? "bottom-full mb-1.5" : "top-full mt-1.5"
        )}>
          {/* Calendar Header */}
          <div className="flex items-center justify-between gap-1 mb-4 select-none">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg border bg-card hover:bg-muted hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value))}
                className="px-1.5 py-1 text-xs font-semibold rounded-md border bg-card cursor-pointer outline-none"
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value))}
                className="px-1.5 py-1 text-xs font-semibold rounded-md border bg-card cursor-pointer outline-none"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg border bg-card hover:bg-muted hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Calendar Weekday Names */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-1 select-none">
            {WEEKDAYS.map(w => (
              <div key={w} className="w-8 h-8 flex items-center justify-center">
                {w}
              </div>
            ))}
          </div>

          {/* Calendar Grid Cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, idx) => {
              const isSelected = value === cell.dateString
              const isToday = new Date().toISOString().split('T')[0] === cell.dateString

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(cell.dateString)}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center text-xs rounded-lg transition-colors select-none font-medium outline-none",
                    cell.isCurrentMonth
                      ? "text-foreground hover:bg-muted"
                      : "text-muted-foreground/40 hover:bg-muted/30",
                    isToday && !isSelected && "border border-primary/50 text-primary",
                    isSelected && "bg-primary text-primary-foreground hover:bg-primary"
                  )}
                >
                  {cell.day}
                </button>
              )
            })}
          </div>

          {/* Quick actions/footer */}
          <div className="mt-3 pt-3 border-t flex justify-between select-none">
            <button
              type="button"
              onClick={() => handleSelectDay(new Date().toISOString().split('T')[0])}
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
