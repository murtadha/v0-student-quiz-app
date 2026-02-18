"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Sparkles } from "lucide-react"
import { updateLessonHistory } from "@/app/utils"
import { useContentFromUrl } from "@/lib/utils"

// Sample data for testing - format: word1:word2,word1:word2,...
// const SAMPLE_PAIRS = "apple:تفاحة,book:كتاب,sun:شمس,water:ماء,house:بيت"
const SAMPLE_PAIRS = [
  { left: 'apple', right: 'تفاحة' },
  { left: 'book', right: 'كتاب' },
  { left: 'sun', right: 'شمس' },
  { left: 'water', right: 'ماء' },
  { left: 'house', right: 'بيت' },
]
const DEFAULT_PROMPT = "طابق الكلمات"

type MatchState = "idle" | "selected" | "correct" | "incorrect"

interface WordItem {
  id: string
  text: string
  pairId: string
  state: MatchState
  column: "left" | "right"
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

type Content = {
  pairs: { left: string; right: string }[];
  prompt: string;
}

export function MatchInterface() {
  const searchParams = useSearchParams()
  // const pairsParam = searchParams.get("pairs") || SAMPLE_PAIRS
  const widgetId = searchParams.get("widgetId") || '000000000000000000000000';

  const [leftWords, setLeftWords] = useState<WordItem[]>([])
  const [rightWords, setRightWords] = useState<WordItem[]>([])
  const [selectedWord, setSelectedWord] = useState<WordItem | null>(null)
  const [completedPairs, setCompletedPairs] = useState<Set<string>>(new Set())
  const [isComplete, setIsComplete] = useState(false)
  const [incorrectCount, setIncorrectCount] = useState(0)
  const content = useContentFromUrl<Content>()
  const prompt = content?.prompt ?? DEFAULT_PROMPT

  // Parse pairs and initialize words
  useEffect(() => {
    // const pairs = pairsParam.split(",").map((pair, index) => {
    //   const [left, right] = pair.split(":")
    //   return { id: `pair-${index}`, left: left?.trim(), right: right?.trim() }
    // }).filter(p => p.left && p.right)
    const pairs = content.pairs ?? SAMPLE_PAIRS

    const leftItems: WordItem[] = pairs.map((pair, i) => ({
      id: `left-${i}`,
      text: pair.left,
      pairId: i + '',
      state: "idle" as MatchState,
      column: "left" as const,
    }))

    const rightItems: WordItem[] = pairs.map((pair, i) => ({
      id: `right-${i}`,
      text: pair.right,
      pairId: i + '',
      state: "idle" as MatchState,
      column: "right" as const,
    }))

    setLeftWords(shuffleArray(leftItems))
    setRightWords(shuffleArray(rightItems))
    setCompletedPairs(new Set())
    setSelectedWord(null)
    setIsComplete(false)
  }, [content.pairs])

  const handleWordClick = useCallback((word: WordItem) => {
    // Ignore if word is already matched
    if (completedPairs.has(word.pairId)) return

    // If no word is selected, select this one
    if (!selectedWord) {
      setSelectedWord(word)
      if (word.column === "left") {
        setLeftWords(prev => prev.map(w =>
          w.id === word.id ? { ...w, state: "selected" } : w
        ))
      } else {
        setRightWords(prev => prev.map(w =>
          w.id === word.id ? { ...w, state: "selected" } : w
        ))
      }
      return
    }

    // If clicking the same word, deselect it
    if (selectedWord.id === word.id) {
      setSelectedWord(null)
      if (word.column === "left") {
        setLeftWords(prev => prev.map(w =>
          w.id === word.id ? { ...w, state: "idle" } : w
        ))
      } else {
        setRightWords(prev => prev.map(w =>
          w.id === word.id ? { ...w, state: "idle" } : w
        ))
      }
      return
    }

    // If clicking a word in the same column, switch selection
    if (selectedWord.column === word.column) {
      if (word.column === "left") {
        setLeftWords(prev => prev.map(w => {
          if (w.id === word.id) return { ...w, state: "selected" }
          if (w.id === selectedWord.id) return { ...w, state: "idle" }
          return w
        }))
      } else {
        setRightWords(prev => prev.map(w => {
          if (w.id === word.id) return { ...w, state: "selected" }
          if (w.id === selectedWord.id) return { ...w, state: "idle" }
          return w
        }))
      }
      setSelectedWord(word)
      return
    }

    // Attempting to match two words from different columns
    const isCorrect = selectedWord.pairId === word.pairId

    if (isCorrect) {
      // Mark both as correct
      setLeftWords(prev => prev.map(w =>
        w.pairId === word.pairId ? { ...w, state: "correct" } : w
      ))
      setRightWords(prev => prev.map(w =>
        w.pairId === word.pairId ? { ...w, state: "correct" } : w
      ))
      setCompletedPairs(prev => new Set([...prev, word.pairId]))
      setSelectedWord(null)
    } else {
      // Mark both as incorrect temporarily
      const selectedId = selectedWord.id
      const clickedId = word.id
      const selectedCol = selectedWord.column
      const clickedCol = word.column

      if (selectedCol === "left") {
        setLeftWords(prev => prev.map(w =>
          w.id === selectedId ? { ...w, state: "incorrect" } : w
        ))
      } else {
        setRightWords(prev => prev.map(w =>
          w.id === selectedId ? { ...w, state: "incorrect" } : w
        ))
      }

      if (clickedCol === "left") {
        setLeftWords(prev => prev.map(w =>
          w.id === clickedId ? { ...w, state: "incorrect" } : w
        ))
      } else {
        setRightWords(prev => prev.map(w =>
          w.id === clickedId ? { ...w, state: "incorrect" } : w
        ))
      }

      // Reset after 1.5 seconds
      setTimeout(() => {
        setLeftWords(prev => prev.map(w =>
          (w.id === selectedId || w.id === clickedId) && w.state === "incorrect"
            ? { ...w, state: "idle" }
            : w
        ))
        setRightWords(prev => prev.map(w =>
          (w.id === selectedId || w.id === clickedId) && w.state === "incorrect"
            ? { ...w, state: "idle" }
            : w
        ))
      }, 1500)

      setSelectedWord(null)
      setIncorrectCount(x => x + 1)
    }
  }, [selectedWord, completedPairs])

  // Check if all pairs are matched
  useEffect(() => {
    const totalPairs = leftWords.length
    if (totalPairs > 0 && completedPairs.size === totalPairs) {
      setIsComplete(true)
    }
  }, [completedPairs, leftWords.length])

  const getWordStyles = (word: WordItem) => {
    const baseStyles = "w-full py-4 px-5 text-lg font-medium rounded-2xl border-2 transition-all duration-300 cursor-pointer select-none"

    switch (word.state) {
      case "correct":
        return `${baseStyles} bg-success/15 border-success/30 text-success pointer-events-none opacity-70`
      case "incorrect":
        return `${baseStyles} bg-destructive/15 border-destructive/50 text-destructive animate-shake`
      case "selected":
        return `${baseStyles} bg-primary/15 border-primary text-primary shadow-lg shadow-primary/20 scale-[1.02]`
      default:
        return `${baseStyles} bg-card border-border hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]`
    }
  }

  return (
    <main className="min-h-screen px-4 py-6" dir="rtl">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center animate-slide-up">
          <h1 className="text-2xl font-bold text-foreground mb-2">{prompt}</h1>
          <p className="text-muted-foreground text-sm">اضغط على كلمة من كل عمود لمطابقتها</p>
        </div>

        {/* Progress indicator */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {leftWords.map((word) => (
            <div
              key={word.pairId}
              className={`w-3 h-3 rounded-full transition-all duration-500 ${completedPairs.has(word.pairId)
                ? "bg-success scale-110"
                : "bg-muted"
                }`}
            />
          ))}
        </div>

        {/* Matching columns */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Right column (appears first in RTL) */}
          <div className="space-y-3">
            {rightWords.map((word, index) => (
              <button
                key={word.id}
                onClick={() => handleWordClick(word)}
                className={getWordStyles(word)}
                style={{ animationDelay: `${index * 50}ms` }}
                disabled={word.state === "correct" || word.state === "incorrect"}
              >
                {word.text}
              </button>
            ))}
          </div>

          {/* Left column (appears second in RTL) */}
          <div className="space-y-3">
            {leftWords.map((word, index) => (
              <button
                key={word.id}
                onClick={() => handleWordClick(word)}
                className={getWordStyles(word)}
                style={{ animationDelay: `${index * 50 + 25}ms` }}
                disabled={word.state === "correct" || word.state === "incorrect"}
              >
                {word.text}
              </button>
            ))}
          </div>
        </div>

        {/* Completion celebration */}
        {(isComplete || true) && (
          <div className="text-center animate-scale-in">
            {/* <div className="inline-flex items-center gap-2 bg-success/15 text-success px-6 py-4 rounded-2xl mb-4">
              <CheckCircle2 className="w-6 h-6" />
              <span className="font-bold text-lg">احسنت! اكملت جميع المطابقات</span>
              <Sparkles className="w-5 h-5" />
            </div> */}
            <Button
              onClick={() => {
                window.location.search = window.location.search + `&success=${incorrectCount}`
                updateLessonHistory(widgetId, leftWords.length, Math.max(0, leftWords.length - incorrectCount), 'MATCH')
              }}
              size="lg"
              className="w-full h-12"
            >
              كمل
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}
