import type React from "react"
import "./globals.css"

import { Baloo_Bhaijaan_2 } from "next/font/google"

const font = Baloo_Bhaijaan_2({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
})

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.25/dist/katex.min.css"
          integrity="sha384-WcoG4HRXMzYzfCgiyfrySxx90XSl2rxY5mnVY5TwtWE6KLrArNKn0T/mOgNL0Mmi"
          crossOrigin="anonymous"
        />
      </head>
      <body className={font.className}>{children}</body>
    </html>
  )
}

export const metadata = {
      generator: 'v0.app'
    };
