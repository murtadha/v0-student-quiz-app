"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CaseSensitive, Send, Sparkles, Superscript } from "lucide-react"
import { evaluateAnswer, fetchIsWidgetSkippable } from "@/lib/actions"
import { LatexText } from "@/components/latex-text"
import { updateLessonHistory } from "@/app/utils"
import { cn, useContentFromUrl } from "@/lib/utils"

const SUBJECT = "Grade 12 Physics"
const LESSON = "Capacitors (الفصل الأول - المتسعات)"
// const QUESTION = "ما هي الصيغة الجربية للعدد المركب $$3i^6 - \\sqrt{-49}$$"
// const QUESTION = "ما هو ذر الاربعة $$\\sqrt{4}$$"
const QUESTION = "ما هي الوظيفة الأساسية للمتسعة؟"
const ANSWER = "الوظيفة الأساسية للمتسعة هي تخزين الشحنات الكهربائية والطاقة الكهربائية داخلها."
const FULL_MARK = 5

type Content = {
  question: string;
  answer: string;
  subject: string;
  lesson: string;
}

export function QuizInterface() {
  const searchParams = useSearchParams()
  const content = useContentFromUrl<Content>()

  const userId = searchParams.get("userId") || "000000000000000000000000"
  const lessonId = searchParams.get("lessonId") || "000000000000000000000000"
  const widgetId = searchParams.get("widgetId") || "000000000000000000000000"
  const subject = content?.subject || searchParams.get("subject") || SUBJECT
  const lesson = content?.lesson || searchParams.get("lesson") || LESSON
  const question = content?.question || searchParams.get("question") || QUESTION
  const correctAnswer = content?.answer || searchParams.get("answer") || ANSWER
  const tenant = searchParams.get("tenant") || 'ankido'

  const [answer, setAnswer] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackType, setFeedbackType] = useState<"correct" | "partial" | "incorrect" | "error" | null>(null)
  const [tryCount, setTryCount] = useState(0);
  const [skippable, setSkippable] = useState(false)
  const [showMathKeyboard, setShowMathKeyboard] = useState(false)

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchIsWidgetSkippable(tenant, userId, lessonId, widgetId).then(setSkippable);
  }, [tenant, userId, lessonId, widgetId]);

  useEffect(() => {
    // const interval = setInterval(() => {
    //   const found = document.querySelector("main ~ div")
    //   if (!found) return
    //   found.remove()
    //   clearInterval(interval)
    // }, 200)
  }, [])

  const handleSubmit = async () => {
    textAreaRef.current?.focus();
    if (!answer.trim()) return

    const timeout = setTimeout(() => setIsLoading(false), 5000)
    evaluateAnswer(userId, lessonId, widgetId, subject, lesson, answer, correctAnswer, question, tenant)
      .then((result) => {
        setFeedback(result.feedback)
        setFeedbackType(result.type)
      })
      .catch((error) => {
        console.error("[v0] Error evaluating answer:", error)
        setFeedback("اسف صار خطأ بتدقيق الاجابة، بلا زحمة جرب مرة ثانية")
        setFeedbackType("error")
      })
      .finally(() => {
        setTryCount(old => old + 1)
        clearTimeout(timeout)
        setIsLoading(false)
      })

    setIsLoading(true)
    setProgress(0)
    setFeedback(null)
    setFeedbackType(null)

    // Simulate progress updates
    const startTime = Date.now()
    const duration = 10000 // 10 seconds
    const maxIncrement = (100 * 1000) / duration

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = duration - elapsed

      if (remaining <= 0) {
        clearInterval(progressInterval)
        setProgress(100)
      } else {
        // Random progress increments
        setProgress((prev) => {
          const increment = Math.random() * (maxIncrement * 0.75) + maxIncrement * 0.25
          const newProgress = Math.min(prev + increment, 90)
          return newProgress
        })
      }
    }, 500)
  }

  const getRobotExpression = () => {
    return "🤖"
    if (isLoading) return "🤔"
    if (feedbackType === "correct") return "🎉"
    if (feedbackType === "partial") return "👍"
    if (feedbackType === "incorrect") return "💡"
    return "🤖"
  }

  const getFeedbackColor = () => {
    if (feedbackType === "correct") return "bg-success/10 border-success"
    if (feedbackType === "partial") return "bg-warning/10 border-warning text-foreground"
    if (feedbackType === "incorrect") return "bg-primary/10 border-primary text-foreground"
    if (feedbackType === "error") return "bg-destructive/10 border-destructive text-destructive"
    return "bg-card"
  }

  const keyboardOffset = showMathKeyboard && "min-h-[calc(100vh-200px)]"
  const transitionStyle = { transition: 'min-height 0.3s' }
  return (
    <main className={cn("px-4 min-h-screen", keyboardOffset)} style={transitionStyle}>
      {/* className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 px-4"> */}
      <div
        style={transitionStyle}
        className={cn("mx-auto min-h-screen max-w-md flex flex-col", keyboardOffset)}>
        <div className="mb-8 mt-8 animate-slide-up">
          <LatexText
            text={question}
            className="text-xl font-semibold text-foreground leading-tight text-balance mb-2"
          />
          <div className="h-1 w-16 bg-gradient-to-r from-primary to-accent rounded-full" />
        </div>

        <div className="mb-6 relative">
          <div className="flex justify-center">
            <div
              className={`text-7xl transition-all duration-500 ${isLoading ? "animate-pulse-glow" : "animate-float"}`}
            >
              {getRobotExpression()}
            </div>
          </div>

          {feedback && (
            <div className="mt-4 animate-slide-up">
              <div className="relative">
                {/* Speech bubble pointer */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[12px] border-b-border animate-bounce-in" />
                <Card className={`p-4 border-2 ${getFeedbackColor()} animate-scale-in`}>
                  <LatexText text={feedback} className="leading-relaxed text-pretty text-center font-medium" />
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Loading Progress */}
        {isLoading && (
          <div className="mb-6 animate-slide-up">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-sm text-muted-foreground">جاري تدقيق الاجابة...</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {feedbackType !== "correct" && (
          <div className="pb-4 space-y-3">
            <div className="flex gap-2">
              {showMathKeyboard ? (
                <MathKeyboard value={answer} onChange={setAnswer} />
              ) : (
                <Textarea
                  ref={textAreaRef}
                  value={answer}
                  onChange={(e) => !isLoading && setAnswer(e.target.value)}
                  placeholder="اكتب الاجابة هنا..."
                  className="min-h-[50px] resize-none text-base"
                  dir="rtl"
                />
              )}
              <div className="flex flex-1 flex-col min-h-20">
                <Button
                  onClick={handleSubmit}
                  disabled={!answer.trim() || isLoading}
                  size="lg"
                  className="h-auto px-4 flex-1 mb-1"
                >
                  <Send className="w-5 h-5" />
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowMathKeyboard(!showMathKeyboard)
                    if (showMathKeyboard) window.mathVirtualKeyboard?.hide({ animate: true })
                  }}>
                  {showMathKeyboard ? <CaseSensitive className="h-2 w-2" /> : <Superscript className="h-2 w-2" />}
                </Button>
              </div>
            </div>
            {/* <div id="keyboard-padder" style={{ marginBottom: 0, transition: 'margin-bottom 0.3s' }} /> */}
          </div>
        )}
        {(feedbackType === "correct" || tryCount >= 3 || skippable) && (
          <Button
            onClick={() => {
              window.location.search = window.location.search + "&success"
              const obtained = feedbackType === "correct"
                ? Math.max(0, Math.round(FULL_MARK * (4 - tryCount) / 3))
                : 0
              // alert('حصلت على: ' + obtained);
              updateLessonHistory(widgetId, FULL_MARK, obtained, 'AI')
            }}
            size="lg"
            className="w-full h-12 px-4 mb-4"
          >
            كمل
          </Button>
        )}
      </div>
    </main>
  )
}

function MathKeyboard({ value, onChange }: { value: string; onChange: (_: string) => void }) {
  const mfRef = useRef<MathfieldHTMLElement | null>(null)

  useEffect(() => {
    // const script = document.createElement("script")
    // script.src = "https://esm.run/mathlive"
    // script.type = "module"
    // document.head.appendChild(script)
    window.customElements.whenDefined("math-field").then(() => {
      MathfieldElement.fontsDirectory = "https://cdn.jsdelivr.net/npm/mathlive/fonts/"
      MathfieldElement.soundsDirectory = "https://cdn.jsdelivr.net/npm/mathlive/sounds/"
      if (!window.mathVirtualKeyboard) return
      window.mathVirtualKeyboard.layouts = LAYOUT
    });

    // const onMessage = (e: MessageEvent) => {
    //   if (e.data.action !== "geometry-changed") return
    //   const padder = document.getElementById('keyboard-padder')
    //   if (!padder) return
    //   padder.style['margin-bottom'] = (e?.data?.boundingRect?.height + 4) + 'px'
    // }
    // window.addEventListener('message', onMessage)

    // return () => {
    //   // document.head.removeChild(script)
    //   // window.removeEventListener('message', onMessage)
    // }
  }, [])


  return (
    <div className="space-y-2 w-full">
      {/* <label htmlFor="answer" className="text-sm font-medium">الاجابة:</label> */}
      <math-field
        dir="ltr"
        // mathVirtualKeyboardPolicy="sandboxed"
        ref={(el) => {
          if (el === null) return
          mfRef.current = el

          // Show virtual keyboard on focus
          el.mathVirtualKeyboardPolicy = "manual"
          const showKeyboard = () => {
            if (!window.mathVirtualKeyboard) return
            window.mathVirtualKeyboard.layouts = LAYOUT;
            window.mathVirtualKeyboard.show({ animate: true })
          }
          el.addEventListener("focusin", showKeyboard)
          el.addEventListener("click", showKeyboard)
          el.focus()
          showKeyboard()
          // el.addEventListener("focusout", () =>  window?.mathVirtualKeyboard?.hide())
        }}
        onInput={(evt) => {
          const target = evt.target as MathfieldHTMLElement
          onChange(target.value)
        }}
        className="min-h-[80px] shadow-sm border w-full p-2 block mb-0 rounded-md bg-background text-lg"
      >
        {value}
      </math-field>
      <style>{`
        math-field {
          --contains-highlight-background-color: lightcyan;
        }
          
        math-field::part(menu-toggle) {
          display: none;
        }
        
        .MLK__row .horizontal-rule {
          border-width: 0px !important;
        }
      `}</style>
    </div>
  )
}
declare global {
  var MathfieldElement: {
    fontsDirectory: string;
    soundsDirectory: string;
  };

  interface Window {
    mathVirtualKeyboard?: {
      layouts: typeof LAYOUT;
      show: (options: { animate?: boolean }) => void;
      hide: (options: { animate?: boolean }) => void;
    };
  }

  namespace JSX {
    interface IntrinsicElements {
      "math-field": React.DetailedHTMLProps<React.HTMLAttributes<MathfieldHTMLElement>, MathfieldHTMLElement>
    }
  }
}

interface MathfieldHTMLElement extends HTMLElement {
  value: string
  mathVirtualKeyboardPolicy: string
}

const LAYOUT = {
  rows: [
    ["[left]", "[right]", "[hr]", "[undo]", "[redo]"],
    [
      "[+]", "[-]", "\\times", "\\frac{#@}{#@}", "[=]", "[.]", "[(]", "[)]",
      { insert: "\\sqrt{#?}", shift: "\\sqrt[#?]{#?}" },
      { insert: "#@^{#?}", shift: "#@_{#?}" },
    ],
    ["[1]", "[2]", "[3]", "[4]", "[5]", "[6]", "[7]", "[8]", "[9]", "[0]"],
    ["[shift]", "[separator]", "a", "b", "c", "x", "y", "z", "[separator]", "[backspace]", "[hide-keyboard]"],
  ]
};
