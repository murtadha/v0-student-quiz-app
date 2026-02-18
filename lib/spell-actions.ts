"use server"

import { GoogleGenAI } from "@google/genai"
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { createHash } from "crypto"

// Initialize the Google GenAI client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
})

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
})

const S3_BUCKET_NAME = process.env.S3_TTS_BUCKET_NAME || "tts-audio-cache"

/**
 * Normalizes text for consistent hashing:
 * - Lowercases all letters
 * - Trims unnecessary spaces
 * - Removes punctuation
 */
function normalizeTextForHashing(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "") // Remove punctuation, keep letters/numbers/spaces (Unicode aware)
    .replace(/\s+/g, " ") // Normalize whitespace to single spaces
    .trim()
}

/**
 * Generates a SHA-256 hash of the normalized text
 */
function generateHash(text: string): string {
  const normalized = normalizeTextForHashing(text)
  return createHash("sha256").update(normalized, "utf8").digest("hex")
}

/**
 * Checks if audio exists in S3 and returns it if found
 */
async function getAudioFromS3(hash: string): Promise<string | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: `audio/${hash}.raw`,
    })

    const response = await s3Client.send(command)

    if (response.Body) {
      // Convert stream to base64
      const chunks: Uint8Array[] = []
      const reader = response.Body.transformToWebStream().getReader()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) chunks.push(value)
      }

      const buffer = Buffer.concat(chunks)
      return buffer.toString("base64")
    }

    return null
  } catch (error: unknown) {
    // If the file doesn't exist, return null
    if (error && typeof error === "object" && "name" in error && error.name === "NoSuchKey") {
      return null
    }
    console.error("S3 Get Error:", error)
    return null
  }
}

/**
 * Stores audio in S3
 */
async function storeAudioInS3(hash: string, audioData: string): Promise<void> {
  try {
    const buffer = Buffer.from(audioData, "base64")

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: `audio/${hash}.raw`,
      Body: buffer,
      ContentType: "audio/raw",
    })

    await s3Client.send(command)
  } catch (error) {
    console.error("S3 Put Error:", error)
    // Don't throw - caching failure shouldn't break the main functionality
  }
}

export async function generateSpeech(text: string): Promise<{ audioData: string } | { error: string }> {
  try {
    // Generate hash for the normalized text
    const hash = generateHash(text)

    // Check if audio already exists in S3
    const cachedAudio = await getAudioFromS3(hash)
    if (cachedAudio) {
      return { audioData: cachedAudio }
    }

    // Generate new audio via Gemini API
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Kore", // Arabic-friendly voice
            },
          },
        },
      },
    })

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data

    if (!audioData) {
      return { error: "Failed to generate audio" }
    }

    // Store the generated audio in S3 for future requests
    await storeAudioInS3(hash, audioData)

    return { audioData }
  } catch (error) {
    console.error("TTS Error:", error)
    return { error: "Failed to generate speech. Please check your API configuration." }
  }
}

// export async function verifySpelling(
//   original: string,
//   userInput: string
// ): Promise<{
//   isCorrect: boolean
//   accuracy: number
//   comparison: Array<{ word: string; correct: boolean; expected?: string }>
// }> {
//   // Normalize both strings for comparison
//   const normalizeText = (text: string) =>
//     text
//       .trim()
//       .toLowerCase()
//       .replace(/[^\p{L}\p{N}\s]/gu, "") // Remove punctuation, keep letters/numbers/spaces (Unicode aware)
//       .replace(/\s+/g, " ") // Normalize whitespace

//   const originalNormalized = normalizeText(original)
//   const userNormalized = normalizeText(userInput)

//   const originalWords = originalNormalized.split(" ").filter(Boolean)
//   const userWords = userNormalized.split(" ").filter(Boolean)

//   const comparison: Array<{ word: string; correct: boolean; expected?: string }> = []
//   let correctCount = 0

//   // Compare word by word
//   const maxLength = Math.max(originalWords.length, userWords.length)

//   for (let i = 0; i < maxLength; i++) {
//     const originalWord = originalWords[i] || ""
//     const userWord = userWords[i] || ""

//     if (userWord === originalWord) {
//       comparison.push({ word: userWord || "(missing)", correct: true })
//       if (userWord) correctCount++
//     } else if (userWord && !originalWord) {
//       // Extra word
//       comparison.push({ word: userWord, correct: false, expected: "(extra)" })
//     } else if (!userWord && originalWord) {
//       // Missing word
//       comparison.push({ word: "(missing)", correct: false, expected: originalWord })
//     } else {
//       // Wrong word
//       comparison.push({ word: userWord, correct: false, expected: originalWord })
//     }
//   }

//   const accuracy = originalWords.length > 0 ? (correctCount / originalWords.length) * 100 : 0
//   const isCorrect = accuracy >= 90 // Allow 90% tolerance

//   return { isCorrect, accuracy, comparison }
// }
