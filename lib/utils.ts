import { clsx, type ClassValue } from 'clsx'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function useContentFromUrl<T extends object>(fallback?: T) {
  const search = useSearchParams()
  const content = search.get('content')
  return useMemo(() => {
    try {
      if (content) return JSON.parse(content) as T
    } catch (e) {
    }
    return (fallback ?? {}) as T
  }, [content])
}

const OLD_BASE_URL = 'https://assets.corrsy.com/';
const NEW_BASE_URL = 'https://d1iycn3b45fkls.cloudfront.net/';

export function remapStaticUrl<T extends string | undefined>(url: T): T {
  return url?.replace(OLD_BASE_URL, NEW_BASE_URL) as T;
}
