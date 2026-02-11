"use client"

import { useEffect, useRef } from "react"

interface LatexTextProps {
  text: string
  className?: string
}

export function LatexText({ text, className = "" }: LatexTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Load KaTeX from CDN if not already loaded
    if (typeof window !== "undefined" && !(window as any).katex) {
      const script = document.createElement("script")
      script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.25/dist/katex.min.js"
      script.integrity = "sha384-J+9dG2KMoiR9hqcFao0IBLwxt6zpcyN68IgwzsCSkbreXUjmNVRhPFTssqdSGjwQ"
      script.crossOrigin = "anonymous"
      script.onload = () => renderLatex()
      document.head.appendChild(script)
    } else {
      renderLatex()
    }

    function renderLatex() {
      if (!containerRef.current) return
      const katex = (window as any).katex
      if (!katex) return

      // Split text by $$ delimiters
      const parts = text.split(/(\$\$.*?\$\$)/g)

      containerRef.current.innerHTML = ""

      parts.forEach((part) => {
        if (part.startsWith("$$") && part.endsWith("$$")) {
          // This is a LaTeX expression
          const latex = part.slice(2, -2)
          const span = document.createElement("span")
          span.className = "inline-block mx-1"
          span.dir = "ltr"

          try {
            katex.render(latex, span, {
              throwOnError: false,
              displayMode: false,
            })
          } catch (error) {
            console.error("[v0] KaTeX rendering error:", error)
            span.textContent = part
          }

          containerRef.current?.appendChild(span)
        } else {
          // Regular text
          const textNode = document.createTextNode(part)
          containerRef.current?.appendChild(textNode)
        }
      })
    }
  }, [text])

  return <div ref={containerRef} className={className} />
}
