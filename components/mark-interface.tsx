"use client"

import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react"
import { useContentFromUrl } from "@/lib/utils"

const SAMPLE_PROMPT = "اين يقع المفعول به في قوله تعالى:"
const SAMPLE_PARAGRAPH = "{إِنَّمَا يَخْشَى *اللَّهَ* مِنْ عِبَادِهِ الْعُلَمَاءُ}"

type WordState = "idle" | "selected" | "correct" | "incorrect" | "missed"

interface WordToken {
  id: number
  text: string
  isCorrect: boolean
  state: WordState
}

/**
 * Parses the paragraph input. Words wrapped in * are correct answers.
 * e.g. "*يذهب* الطالب" => [{ text: "يذهب", isCorrect: true }, { text: "الطالب", isCorrect: false }]
 */
function parseParagraph(paragraph: string): WordToken[] {
  const tokens: WordToken[] = []
  let id = 0

  // Split by spaces but keep track of asterisk markers
  const rawWords = paragraph.split(/\s+/).filter(Boolean)

  for (const raw of rawWords) {
    // Check if the word is wrapped in asterisks: *word*
    const match = raw.match(/^\*(.+)\*$/)
    if (match) {
      tokens.push({
        id: id++,
        text: match[1],
        isCorrect: true,
        state: "idle",
      })
    } else {
      // Clean any stray asterisks just in case
      tokens.push({
        id: id++,
        text: raw.replace(/\*/g, ""),
        isCorrect: false,
        state: "idle",
      })
    }
  }

  return tokens
}

type Content = {
  prompt: string;
  paragraph: string;
}

export function MarkInterface() {
  // const searchParams = useSearchParams()
  // const prompt = searchParams.get("prompt") || SAMPLE_PROMPT
  // const paragraph = searchParams.get("paragraph") || SAMPLE_PARAGRAPH
  const content = useContentFromUrl<Content>()
  const prompt = content.prompt || SAMPLE_PROMPT
  const paragraph = content.paragraph || SAMPLE_PARAGRAPH

  const initialTokens = useMemo(() => parseParagraph(paragraph), [paragraph])

  const [tokens, setTokens] = useState<WordToken[]>(initialTokens)
  const [hasChecked, setHasChecked] = useState(false)
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null)

  // Reset when paragraph changes
  useEffect(() => {
    setTokens(parseParagraph(paragraph))
    setHasChecked(false)
    setScore(null)
  }, [paragraph])

  const selectedCount = tokens.filter((t) => t.state === "selected").length
  const correctTotal = tokens.filter((t) => t.isCorrect).length

  const handleWordClick = (wordId: number) => {
    if (hasChecked) return

    setTokens((prev) =>
      prev.map((t) => {
        if (t.id !== wordId) return t
        return {
          ...t,
          state: t.state === "selected" ? "idle" : "selected",
        }
      }),
    )
  }

  const handleCheck = () => {
    let correctCount = 0

    const updated = tokens.map((t) => {
      if (t.isCorrect && t.state === "selected") {
        // Correctly selected
        correctCount++
        return { ...t, state: "correct" as WordState }
      }
      if (t.isCorrect && t.state !== "selected") {
        // Should have been selected but wasn't
        return { ...t, state: "missed" as WordState }
      }
      if (!t.isCorrect && t.state === "selected") {
        // Incorrectly selected
        return { ...t, state: "incorrect" as WordState }
      }
      // Not selected and not correct - stays idle
      return t
    })

    setTokens(updated)
    setHasChecked(true)
    setScore({ correct: correctCount, total: correctTotal })
  }

  const handleRetry = () => {
    setTokens(parseParagraph(paragraph))
    setHasChecked(false)
    setScore(null)
  }

  const isAllCorrect = score?.correct === score?.total && tokens.every((t) => t.state !== "incorrect")

  const getWordStyles = (token: WordToken) => {
    const base =
      "inline-flex items-center px-1.5 py-1.5 rounded-md text-lg font-medium transition-all duration-300 select-none border-dashed"

    switch (token.state) {
      case "selected":
        return `${base} bg-primary/15 text-primary border-2 border-primary shadow-sm shadow-primary/20 cursor-pointer hover:bg-primary/20 scale-[1.03]`
      case "correct":
        return `${base} bg-success/15 text-success border-2 border-success/40`
      case "incorrect":
        return `${base} bg-destructive/15 text-destructive border-2 border-destructive/40 line-through`
      case "missed":
        return `${base} bg-warning/20 text-warning-foreground border-2 border-warning/50 border-dashed`
      default:
        if (hasChecked) {
          return `${base} bg-transparent text-foreground border-2 border-transparent`
        }
        return `${base} bg-card text-foreground border-2 border-border cursor-pointer hover:border-primary/40 hover:bg-primary/5 active:scale-[0.97]`
    }
  }

  return (
    <main className="min-h-screen px-4 py-6" dir="rtl">
      <div className="mx-auto max-w-lg">
        {/* Prompt / Instructions */}
        <div className="mb-6 animate-slide-up">
          <h1 className="text-2xl font-bold text-foreground mb-2 text-balance">{prompt}</h1>
          <p className="text-muted-foreground text-sm">
            اضغط على الكلمات المناسبة ثم تحقق من إجابتك
          </p>
        </div>

        {/* Selection counter */}
        <div className="mb-5 flex items-center gap-3 animate-slide-up" style={{ animationDelay: "50ms" }}>
          <div className="flex items-center gap-2 bg-muted rounded-full px-4 py-1.5 text-sm text-muted-foreground">
            <span className="font-bold text-foreground">{selectedCount}</span>
            <span>محددة</span>
          </div>
          <div className="flex items-center gap-2 bg-primary/10 rounded-full px-4 py-1.5 text-sm text-primary">
            <span className="font-bold">{correctTotal}</span>
            <span>مطلوبة</span>
          </div>
        </div>

        {/* Word cloud / paragraph */}
        <div
          className="bg-card rounded-3xl p-5 shadow-lg border border-border mb-6 animate-slide-up"
          style={{ animationDelay: "100ms" }}
        >
          <div className="flex flex-wrap gap-1 leading-relaxed">
            {tokens.map((token) => (
              <button
                key={token.id}
                type="button"
                onClick={() => handleWordClick(token.id)}
                className={getWordStyles(token)}
                disabled={hasChecked}
                aria-pressed={token.state === "selected"}
                aria-label={`${token.text}${token.state === "selected" ? " (محددة)" : ""}`}
              >
                {token.text}
              </button>
            ))}
          </div>
        </div>

        {/* Result feedback */}
        {hasChecked && score && (
          <div className="mb-6 animate-scale-in">
            <div
              className={`flex items-center justify-center gap-3 py-4 px-5 rounded-2xl mb-4 ${isAllCorrect
                ? "bg-success/15 text-success"
                : "bg-warning/15 text-warning-foreground"
                }`}
            >
              {isAllCorrect ? (
                <CheckCircle2 className="w-7 h-7 shrink-0" />
              ) : (
                <XCircle className="w-7 h-7 shrink-0" />
              )}
              <span className="font-bold text-lg">
                {isAllCorrect
                  ? "ممتاز! جميع الإجابات صحيحة"
                  : `${score.correct} من ${score.total} صحيحة`}
              </span>
            </div>

            {/* Legend */}
            {!isAllCorrect && (
              <div className="flex flex-wrap gap-3 mb-4 justify-center text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-muted-foreground">صحيحة</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <span className="text-muted-foreground">خاطئة</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm border-2 border-dashed border-warning" />
                  <span className="text-muted-foreground">لم تحدد</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="animate-slide-up" style={{ animationDelay: "150ms" }}>
          {!hasChecked ? (
            <Button
              onClick={handleCheck}
              size="lg"
              className="w-full h-14 rounded-2xl text-lg font-medium"
              disabled={selectedCount === 0}
            >
              تحقق من الإجابة
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
