import { Suspense } from "react"
import { SortInterface } from "@/components/sort-interface"

export default function SortPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" dir="rtl">
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      }
    >
      <SortInterface />
    </Suspense>
  )
}
