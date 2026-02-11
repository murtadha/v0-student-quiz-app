import { Suspense } from "react"
import { SpellInterface } from "@/components/spell-interface"

export default function SpellPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SpellInterface />
    </Suspense>
  )
}
