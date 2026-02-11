"use client"

import { Suspense } from "react"
import { MatchInterface } from "@/components/match-interface"

export default function MatchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">جاري التحميل...</div>
        </div>
      }
    >
      <MatchInterface />
    </Suspense>
  )
}
