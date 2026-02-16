"use server"
import { GoogleGenerativeAI } from '@google/generative-ai'

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
const gemini = new GoogleGenerativeAI(GOOGLE_API_KEY ?? '').getGenerativeModel({
  model: 'gemini-2.5-flash',
  // model: 'gemini-flash-lite-latest',
})

const CORRECT_FEEDBACK = [
  'صحيح!! ',
  'ممتاز!! ',
  'بالضبط!! ',
  'احسنت!! ',
]

const ADMIN_API = (tenant: string) => `https://${tenant}.admin.v2.educationforalliraqis.com/api/public/data/create`
const ADMIN_READ_API = (tenant: string) => `https://${tenant}.admin.v2.educationforalliraqis.com/api/public/data`

export async function fetchIsWidgetSkippable(
  tenant: string,
  userId: string,
  lessonId: string,
  widgetId: string,
) {
  const res = await fetch(ADMIN_READ_API(tenant), {
    method: 'POST',
    body: JSON.stringify({
      collection: 'studentHistory',
      pipeline: [
        {
          $match: {
            studentID: { $oid: userId },
            lessonID: { $oid: lessonId },
            'widgetsHistory.widgetID': widgetId,
          },
        },
        { $group: { _id: "$_id", count: { $count: {} } } }
      ],
    }),
    headers: { Authorization: `Bearer ${process.env.ADMIN_API_TOKEN}` },
  });
  const json = await res.json();
  return json?.[0]?.count > 0;
}

export async function evaluateAnswer(
  userId: string,
  lessonId: string,
  widgetId: string,
  subject: string,
  lesson: string,
  userAnswer: string,
  correctAnswer: string,
  question: string,
  tenant: string,
): Promise<{
  type: "correct" | "partial" | "incorrect"
  feedback: string
}> {
  const prompt = getPrompt(
    subject,
    lesson,
    question,
    userAnswer,
    correctAnswer,
  );

  const log = (body) => fetch(ADMIN_API(tenant), {
    method: 'POST',
    body: JSON.stringify({
      collection: 'logs',
      documents: {
        type: 'ai_chat_bot_response',
        userId: { $oid: userId },
        lessonId: { $oid: lessonId },
        widgetId: { $oid: widgetId },
        subject,
        lesson,
        question,
        userAnswer,
        correctAnswer,
        ...body,
      },
    }),
    headers: { Authorization: `Bearer ${process.env.ADMIN_API_TOKEN}` },
  }).catch(console.warn).then(res => res?.text?.()).then(console.log)

  const now = Date.now();
  let error;
  let i;
  for (i = 0; i < 3; i++) {
    try {
      const result = await gemini.generateContent(prompt);
      const content = result.response.text();
      await log({ aiResponse: content, timeTaken: Date.now() - now, try: i });
      if (content === 'Acceptable') {
        const index = Math.floor(Math.random() * CORRECT_FEEDBACK.length);
        return { type: "correct", feedback: CORRECT_FEEDBACK[index] + correctAnswer }
      } else {
        return { type: "incorrect", feedback: content }
      }
    } catch (e) {
      error = e
    }
  }

  await log({
    error: (error?.message ?? '') + '\n' + error?.toString(),
    timeTaken: Date.now() - now,
    try: i,
  });
  // console.error(process.env.GOOGLE_API_KEY, error);
  throw error;


  // TODO: Replace this with actual API call to AI service
  // This is a placeholder implementation
  // Simple mock evaluation logic for now
  const answer = userAnswer.toLowerCase()
  const correct = correctAnswer.toLowerCase()

  // Extract key terms from correct answer
  const keyTerms = correct.split(" ").filter((word) => word.length > 4)
  const matchedTerms = keyTerms.filter((term) => answer.includes(term))

  if (matchedTerms.length >= keyTerms.length * 0.7) {
    return {
      type: "correct",
      feedback: "Excellent! Your answer is correct. You demonstrated a clear understanding of the concept.",
    }
  } else if (matchedTerms.length >= keyTerms.length * 0.3) {
    return {
      type: "partial",
      feedback:
        "Good start! You mentioned some key concepts, but your answer could be more complete. Try to include more details.",
    }
  } else {
    return {
      type: "incorrect",
      feedback: "Not quite right. Take another look at the question and try to think about the key concepts involved.",
    }
  }
}


const getPrompt = (subject, lectureTitle, question, userAnswer, correctAnswer) => `You are an AI assistant designed to verify student answers for a ${subject} lecture.
The student watched a lecture on ${lectureTitle} for Iraqi high school students.
I will provide you with a question and the student's typed answer.
Your task is to:
1.  **Assess the correctness** of the student's answer based on the provided model/ideal answer.
2.  If the answer is **correct/acceptable**, simply respond with "Acceptable".
3.  If the answer is **incorrect/unacceptable**, provide a polite and helpful response for the student. This response should:
    *   Clearly indicate that the answer needs review or is incomplete/incorrect.
    *   Explain *why* the answer is incorrect or insufficient, referencing the relevant concept from the lecture, *without directly giving away the correct answer*.
    *   Ensure the language of the response is appropriate for an Iraqi high school student (casual Iraqi Arabic).
    *   If the answer is only partially correct, remind the student to type the full correct answer in a single reply.
    *   If the response is asking for help, provide a hint to help the student get unstuck.

Your reply doesn't need to have any greetings like "hello" or "good luck".

Here is the question the student was asked:
${question}

Here is the student's answer:
${userAnswer}

Here is the model/ideal answer for reference (do not show this to the student):
${correctAnswer}`
