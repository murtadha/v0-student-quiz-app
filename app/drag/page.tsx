"use client"

import { Suspense } from "react"
import DragInterface from "@/components/drag-interface"

export default function MatchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">جاري التحميل...</div>
        </div>
      }
    >
      <DragInterface />
    </Suspense>
  )
}
