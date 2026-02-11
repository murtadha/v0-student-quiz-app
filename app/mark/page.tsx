import { Suspense } from "react"
import { MarkInterface } from "@/components/mark-interface"

export default function MarkPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" dir="rtl">
          <div className="text-muted-foreground">جاري التحميل...</div>
        </div>
      }
    >
      <MarkInterface />
    </Suspense>
  )
}
