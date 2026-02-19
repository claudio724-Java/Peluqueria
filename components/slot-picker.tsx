"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface SlotPickerProps {
  slots: string[]
  selectedSlot: string | null
  onSelectSlot: (slot: string) => void
  disabledSlots?: string[]
}

export function SlotPicker({ slots, selectedSlot, onSelectSlot, disabledSlots = [] }: SlotPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {slots.map((slot) => {
        const isDisabled = disabledSlots.includes(slot)
        const isSelected = selectedSlot === slot
        return (
          <Button
            key={slot}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            disabled={isDisabled}
            onClick={() => onSelectSlot(slot)}
            className={cn(
              "text-xs font-medium",
              isSelected && "bg-primary text-primary-foreground",
            )}
          >
            {slot}
          </Button>
        )
      })}
    </div>
  )
}
