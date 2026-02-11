import { clsx, type ClassValue } from 'clsx'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function useContentFromUrl<T extends object>() {
  const search = useSearchParams()
  const content = search.get('content')
  return useMemo(() => {
    try {
      return JSON.parse(content || '{}') as T || {} as T
    } catch (e) {
      return {} as T
    }
  }, [content])
}