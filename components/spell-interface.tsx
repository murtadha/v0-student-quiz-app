"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Volume2, Send, Loader2, RotateCcw, CheckCircle2, XCircle, Pause } from "lucide-react"
import { generateSpeech } from "@/lib/spell-actions"
import { useContentFromUrl } from "@/lib/utils"

// Sample sentence for testing
const SAMPLE_SENTENCE = "Welcome to Corrsy"

// Number of bars in the waveform
const BAR_COUNT = 40
const SAMPLE_RATE = 24000

function generateWaveformFromFloat32(float32Array: Float32Array): number[] {
  const samplesPerBar = Math.floor(float32Array.length / BAR_COUNT)
  const waveform: number[] = []

  for (let i = 0; i < BAR_COUNT; i++) {
    const start = i * samplesPerBar
    const end = start + samplesPerBar
    let sum = 0

    for (let j = start; j < end && j < float32Array.length; j++) {
      sum += Math.abs(float32Array[j])
    }

    const average = sum / samplesPerBar
    // Normalize to 0-1 range with some minimum height
    const normalized = Math.max(0.15, Math.min(1, average * 3))
    waveform.push(normalized)
  }

  return waveform
}

type Content = {
  sentence: string;
}

export function SpellInterface() {
  // const searchParams = useSearchParams()
  // const sentence = searchParams.get("sentence") || SAMPLE_SENTENCE
  const content = useContentFromUrl<Content>()
  const sentence = content.sentence || SAMPLE_SENTENCE

  const [isLoadingAudio, setIsLoadingAudio] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackProgress, setPlaybackProgress] = useState(0)
  const [userInput, setUserInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{
    isCorrect: boolean
    accuracy: number
    comparison: Array<{ word: string; correct: boolean; expected?: string }>
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [waveformData, setWaveformData] = useState<number[]>([])
  const [isAudioReady, setIsAudioReady] = useState(false)
  const [audioDuration, setAudioDuration] = useState(0)

  const audioContextRef = useRef<AudioContext | null>(null)
  const audioBufferRef = useRef<AudioBuffer | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const startTimeRef = useRef<number>(0)
  const animationRef = useRef<number | null>(null)
  const dir = useMemo(() => isLTR(sentence), [sentence]) ? "ltr" : "rtl"

  // Generate speech on mount
  useEffect(() => {
    async function loadAudio() {
      setIsLoadingAudio(true)
      setError(null)

      const response = await generateSpeech(sentence)

      if ("error" in response) {
        setError(response.error)
        setIsLoadingAudio(false)
        return
      }

      // Convert base64 to float32 audio data
      const bytes = Uint8Array.from(atob(response.audioData), c => c.charCodeAt(0))
      const int16Array = new Int16Array(bytes.buffer)
      const float32Array = new Float32Array(int16Array.length)
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768
      }

      // Create AudioContext and buffer
      const ctx = new AudioContext({ sampleRate: SAMPLE_RATE })
      const buffer = ctx.createBuffer(1, float32Array.length, SAMPLE_RATE)
      buffer.getChannelData(0).set(float32Array)

      audioContextRef.current = ctx
      audioBufferRef.current = buffer
      setAudioDuration(buffer.duration)

      // Generate static waveform data from audio
      const waveform = generateWaveformFromFloat32(float32Array)
      setWaveformData(waveform)

      setIsAudioReady(true)
      setIsLoadingAudio(false)
    }

    loadAudio()

    return () => {
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop()
          sourceNodeRef.current.disconnect()
        } catch {
          // Source may have already stopped
        }
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentence])

  // Update playback progress using AudioContext currentTime
  const updateProgress = useCallback(() => {
    if (!audioContextRef.current || audioDuration === 0) return

    const elapsed = audioContextRef.current.currentTime - startTimeRef.current
    const progress = Math.min(elapsed / audioDuration, 1)
    setPlaybackProgress(progress)

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(updateProgress)
    }
  }, [audioDuration])

  const handlePlay = useCallback(() => {
    if (!audioContextRef.current || !audioBufferRef.current || !isAudioReady) return

    if (isPlaying) {
      // Stop playback
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop()
          sourceNodeRef.current.disconnect()
        } catch {
          // Source may have already stopped
        }
      }
      setIsPlaying(false)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    } else {
      // Start playback - create new source node each time
      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBufferRef.current
      source.connect(audioContextRef.current.destination)

      source.onended = () => {
        setIsPlaying(false)
        setPlaybackProgress(0)
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
      }

      sourceNodeRef.current = source
      startTimeRef.current = audioContextRef.current.currentTime
      source.start()
      setIsPlaying(true)
      animationRef.current = requestAnimationFrame(updateProgress)
    }
  }, [isPlaying, isAudioReady, updateProgress])

  const handleSubmit = async () => {
    if (!userInput.trim() || isSubmitting) return

    // setIsSubmitting(true)
    const verificationResult = verifySpelling(sentence, userInput)
    setResult(verificationResult)
    // setIsSubmitting(false)
  }

  const handleRetry = () => {
    setResult(null)
    setUserInput("")
  }

  const canSubmit = !result || !result.isCorrect

  // Calculate which bar the progress indicator is at
  const progressBarIndex = Math.floor(playbackProgress * BAR_COUNT)

  return (
    <main className="min-h-screen px-4 py-6" dir="rtl">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center animate-slide-up">
          <h1 className="text-2xl font-bold text-foreground mb-2">اكتب ما تسمع</h1>
          <p className="text-muted-foreground text-sm">استمع للجملة ثم اكتب ما سمعته</p>
        </div>

        {/* Audio Player Card */}
        <div className="bg-card rounded-3xl p-6 shadow-lg border border-border mb-6 animate-slide-up">
          {isLoadingAudio ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
              <p className="text-muted-foreground text-sm">جاري تحضير الصوت...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8">
              <XCircle className="w-10 h-10 text-destructive mb-3" />
              <p className="text-destructive text-sm text-center">{error}</p>
            </div>
          ) : (
            <>
              {/* Static Waveform with Progress Indicator */}
              <div className="relative mb-4 h-24 bg-muted/30 rounded-2xl overflow-hidden">
                {/* Waveform Bars */}
                <div className="absolute inset-0 flex items-center justify-center gap-[3px] px-3">
                  {waveformData.map((height, index) => {
                    const isPast = index < progressBarIndex
                    const isCurrent = index === progressBarIndex

                    return (
                      <div
                        key={index}
                        className={`rounded-full transition-all duration-150 ${isPast || isCurrent
                          ? "bg-primary"
                          : "bg-primary/25"
                          }`}
                        style={{
                          width: `${100 / BAR_COUNT - 1}%`,
                          height: `${height * 80}%`,
                          minHeight: "8px",
                          transform: isCurrent && isPlaying ? "scaleY(1.1)" : "scaleY(1)",
                        }}
                      />
                    )
                  })}
                </div>

                {/* Progress Line Indicator */}
                {/* {isPlaying && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)] transition-all duration-75"
                    style={{
                      right: `${playbackProgress * 100}%`,
                    }}
                  />
                )} */}
              </div>

              {/* Play Button */}
              <Button
                onClick={handlePlay}
                size="lg"
                className={`w-full h-14 rounded-2xl text-lg font-medium transition-all ${isPlaying
                  ? "bg-primary/20 text-primary border-2 border-primary"
                  : "bg-primary text-primary-foreground"
                  }`}
                variant={isPlaying ? "outline" : "default"}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-6 h-6 ml-2" />
                    إيقاف مؤقت
                  </>
                ) : (
                  <>
                    <Volume2 className="w-6 h-6 ml-2" />
                    اضغط للاستماع
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {/* Answer Input */}
        <div className="mb-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <div className="relative">
            <Textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="اكتب ما سمعته هنا..."
              className="min-h-[120px] text-lg rounded-2xl border-2 border-border focus:border-primary pr-4 pl-14 py-4 resize-none"
              disabled={isSubmitting || (result?.isCorrect ?? false)}
              dir={userInput ? dir : 'rtl'}
            />
            <Button
              onClick={handleSubmit}
              disabled={!userInput.trim() || isSubmitting || !canSubmit}
              size="icon"
              className="absolute left-3 bottom-3 h-10 w-10 rounded-xl"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Result Display */}
        {result && (
          <div className="animate-scale-in">
            {/* Accuracy Badge */}
            {/* <div
              className={`flex items-center justify-center gap-2 mb-4 py-3 px-4 rounded-2xl ${result.isCorrect
                ? "bg-success/15 text-success"
                : "bg-warning/15 text-warning-foreground"
                }`}
            >
              {result.isCorrect ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <span className="text-2xl font-bold">{Math.round(result.accuracy)}%</span>
              )}
              <span className="font-medium">
                {result.isCorrect ? "ممتاز! إجابة صحيحة" : "حاول مرة أخرى"}
              </span>
            </div> */}

            {/* Word-by-word comparison */}
            <div className="bg-card rounded-2xl p-4 border border-border mb-4">
              <p className="text-sm text-muted-foreground mb-3">مقارنة الكلمات:</p>
              <div className="flex flex-wrap gap-2" dir={dir}>
                {result.comparison.map((item, index) => (
                  <div
                    key={index}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${item.correct
                      ? "bg-success/15 text-success border border-success/30"
                      : "bg-destructive/15 text-destructive border border-destructive/30"
                      }`}
                  >
                    <span>{item.word}</span>
                    {!item.correct && item.expected && item.expected !== "(extra)" && (
                      <span className="block text-xs opacity-70 mt-0.5">
                        الصحيح: {item.expected}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Retry Button */}
            {(!result.isCorrect || true) && (
              <Button
                onClick={() => {
                  window.location.search = window.location.search + "&success"
                }}
                size="lg"
                className="w-full h-12 rounded-2xl"
              >
                كمل
              </Button>
            )}
          </div>
        )}
      </div>
    </main >
  )
}

function isLTR(sentence: string) {
  return (sentence.match(/[a-zA-Z]/g)?.length ?? 0) > (sentence.replace(/\s*/g, '').length * 0.5)
}

function verifySpelling(
  original: string,
  userInput: string
): {
  isCorrect: boolean
  accuracy: number
  comparison: Array<{ word: string; correct: boolean; expected?: string }>
} {
  // Normalize both strings for comparison
  const normalizeText = (text: string) =>
    text
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, "") // Remove punctuation, keep letters/numbers/spaces (Unicode aware)
      .replace(/\s+/g, " ") // Normalize whitespace

  const originalNormalized = normalizeText(original)
  const userNormalized = normalizeText(userInput)

  const originalWords = originalNormalized.split(" ").filter(Boolean)
  const userWords = userNormalized.split(" ").filter(Boolean)

  const comparison: Array<{ word: string; correct: boolean; expected?: string }> = []
  let correctCount = 0

  // Compare word by word
  const maxLength = Math.max(originalWords.length, userWords.length)

  for (let i = 0; i < maxLength; i++) {
    const originalWord = originalWords[i] || ""
    const userWord = userWords[i] || ""

    if (userWord === originalWord) {
      comparison.push({ word: userWord || "(missing)", correct: true })
      if (userWord) correctCount++
    } else if (userWord && !originalWord) {
      // Extra word
      comparison.push({ word: userWord, correct: false, expected: "(extra)" })
    } else if (!userWord && originalWord) {
      // Missing word
      comparison.push({ word: "(missing)", correct: false, expected: originalWord })
    } else {
      // Wrong word
      comparison.push({ word: userWord, correct: false, expected: originalWord })
    }
  }

  const accuracy = originalWords.length > 0 ? (correctCount / originalWords.length) * 100 : 0
  const isCorrect = accuracy >= 90 // Allow 90% tolerance

  return { isCorrect, accuracy, comparison }
}
