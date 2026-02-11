"use client"

import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, RotateCcw, GripVertical } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

const SAMPLE_SENTENCES = [
  "استيقظ أحمد من النوم مبكرًا",
  "تناول وجبة الإفطار مع عائلته",
  "ذهب إلى المدرسة بالحافلة",
  "حضر جميع الدروس باهتمام",
  "عاد إلى المنزل بعد انتهاء اليوم الدراسي",
]

interface SortItem {
  id: string
  text: string
  correctIndex: number
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  const isOriginalOrder = shuffled.every((item, idx) => item === array[idx])
  if (isOriginalOrder && array.length > 1) {
    return shuffleArray(array)
  }
  return shuffled
}

// ── Sortable Item Component ──

function SortableItem({
  item,
  index,
  hasChecked,
  isCorrect,
  isIncorrect,
  totalItems,
}: {
  item: SortItem
  index: number
  hasChecked: boolean
  isCorrect: boolean
  isIncorrect: boolean
  totalItems: number
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: hasChecked })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  let containerClass =
    "group relative flex items-stretch rounded-2xl border-2 transition-colors duration-200 select-none"

  if (isCorrect) {
    containerClass += " bg-success/10 border-success/40"
  } else if (isIncorrect) {
    containerClass += " bg-destructive/10 border-destructive/40"
  } else if (isDragging) {
    containerClass += " bg-primary/10 border-primary shadow-lg"
  } else {
    containerClass += " bg-card border-border hover:border-primary/30"
  }

  return (
    <div ref={setNodeRef} style={style} className={containerClass}>
      {/* Position number */}
      <div
        className={`flex items-center justify-center px-3 rounded-r-xl border-l-2 text-sm font-bold shrink-0 transition-colors duration-200 ${
          isCorrect
            ? "bg-success/15 text-success border-success/20"
            : isIncorrect
              ? "bg-destructive/15 text-destructive border-destructive/20"
              : "bg-muted/50 text-muted-foreground border-border"
        }`}
      >
        {index + 1}
      </div>

      {/* Sentence text */}
      <div className="flex-1 py-3.5 px-4 text-foreground font-medium leading-relaxed">
        {item.text}
      </div>

      {/* Drag handle */}
      {!hasChecked && (
        <div
          className="flex items-center pl-2 pr-3 text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-5 h-5" />
        </div>
      )}

      {/* Result icon */}
      {hasChecked && (
        <div className="flex items-center pr-3 pl-2">
          {isCorrect ? (
            <CheckCircle2 className="w-5 h-5 text-success" />
          ) : (
            <XCircle className="w-5 h-5 text-destructive" />
          )}
        </div>
      )}
    </div>
  )
}

// ── Drag Overlay Item (ghost shown while dragging) ──

function DragOverlayItem({ item, index }: { item: SortItem; index: number }) {
  return (
    <div className="flex items-stretch rounded-2xl border-2 bg-primary/10 border-primary shadow-xl select-none scale-[1.03]">
      <div className="flex items-center justify-center px-3 rounded-r-xl border-l-2 bg-muted/50 text-muted-foreground border-border text-sm font-bold shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 py-3.5 px-4 text-foreground font-medium leading-relaxed">
        {item.text}
      </div>
      <div className="flex items-center pl-2 pr-3 text-muted-foreground shrink-0">
        <GripVertical className="w-5 h-5" />
      </div>
    </div>
  )
}

// ── Main Component ──

export function SortInterface() {
  const searchParams = useSearchParams()
  const rawSentences = searchParams.get("sentences")

  const correctOrder = useMemo(() => {
    if (rawSentences) {
      try {
        const parsed = JSON.parse(rawSentences)
        if (Array.isArray(parsed) && parsed.length > 1) {
          return parsed.map(String)
        }
      } catch {
        const split = rawSentences
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
        if (split.length > 1) return split
      }
    }
    return SAMPLE_SENTENCES
  }, [rawSentences])

  const initialItems = useMemo(() => {
    const items: SortItem[] = correctOrder.map((text, index) => ({
      id: `item-${index}`,
      text,
      correctIndex: index,
    }))
    return shuffleArray(items)
  }, [correctOrder])

  const [items, setItems] = useState<SortItem[]>(initialItems)
  const [hasChecked, setHasChecked] = useState(false)
  const [results, setResults] = useState<boolean[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    setItems(
      shuffleArray(
        correctOrder.map((text, index) => ({
          id: `item-${index}`,
          text,
          correctIndex: index,
        }))
      )
    )
    setHasChecked(false)
    setResults([])
  }, [correctOrder])

  // Sensors for mouse, touch, and keyboard
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((item) => item.id === active.id)
    const newIndex = items.findIndex((item) => item.id === over.id)

    setItems(arrayMove(items, oldIndex, newIndex))
  }

  const handleCheck = () => {
    const checkResults = items.map((item, index) => item.correctIndex === index)
    setResults(checkResults)
    setHasChecked(true)
  }

  const handleRetry = () => {
    setItems(
      shuffleArray(
        correctOrder.map((text, index) => ({
          id: `item-${index}`,
          text,
          correctIndex: index,
        }))
      )
    )
    setHasChecked(false)
    setResults([])
  }

  const isAllCorrect = hasChecked && results.every(Boolean)
  const correctCount = results.filter(Boolean).length

  const activeItem = activeId ? items.find((item) => item.id === activeId) : null
  const activeIndex = activeId ? items.findIndex((item) => item.id === activeId) : -1

  return (
    <main className="min-h-screen px-4 py-6" dir="rtl">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-6 animate-slide-up">
          <h1 className="text-2xl font-bold text-foreground mb-2 text-balance">
            رتّب الجمل بالترتيب الصحيح
          </h1>
          <p className="text-muted-foreground text-sm">
            اسحب الجمل لترتيبها بالترتيب الصحيح
          </p>
        </div>

        {/* Sortable List */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <div
              className="flex flex-col gap-3 mb-6 animate-slide-up"
              style={{ animationDelay: "100ms" }}
            >
              {items.map((item, index) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  index={index}
                  hasChecked={hasChecked}
                  isCorrect={hasChecked && results[index]}
                  isIncorrect={hasChecked && !results[index]}
                  totalItems={items.length}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={null}>
            {activeItem ? (
              <DragOverlayItem item={activeItem} index={activeIndex} />
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Result feedback */}
        {hasChecked && (
          <div className="mb-6 animate-scale-in">
            <div
              className={`flex items-center justify-center gap-3 py-4 px-5 rounded-2xl ${
                isAllCorrect
                  ? "bg-success/15 text-success"
                  : "bg-warning/15 text-warning-foreground"
              }`}
            >
              {isAllCorrect ? (
                <CheckCircle2 className="w-7 h-7 shrink-0" />
              ) : (
                <span className="text-2xl font-bold">
                  {correctCount}/{items.length}
                </span>
              )}
              <span className="font-bold text-lg">
                {isAllCorrect
                  ? "ممتاز! الترتيب صحيح"
                  : "بعض الجمل في غير مكانها الصحيح"}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="animate-slide-up" style={{ animationDelay: "200ms" }}>
          {!hasChecked ? (
            <Button
              onClick={handleCheck}
              size="lg"
              className="w-full h-14 rounded-2xl text-lg font-medium"
            >
              تحقق من الترتيب
            </Button>
          ) : !isAllCorrect ? (
            <Button
              onClick={handleRetry}
              variant="outline"
              size="lg"
              className="w-full h-14 rounded-2xl text-lg font-medium bg-transparent"
            >
              <RotateCcw className="w-5 h-5 ml-2" />
              حاول مرة أخرى
            </Button>
          ) : null}
        </div>
      </div>
    </main>
  )
}
