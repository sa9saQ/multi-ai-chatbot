'use client'

import { useCallback, useState } from 'react'

// Initialize value from localStorage (SSR-safe)
function getStoredValue<T>(key: string, initialValue: T): T {
  if (typeof window === 'undefined') {
    return initialValue
  }
  try {
    const item = localStorage.getItem(key)
    return item ? (JSON.parse(item) as T) : initialValue
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error)
    return initialValue
  }
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Initialize state with value from localStorage
  const [storedValue, setStoredValue] = useState<T>(() => getStoredValue(key, initialValue))

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        setStoredValue((prev) => {
          const valueToStore = value instanceof Function ? value(prev) : value
          localStorage.setItem(key, JSON.stringify(valueToStore))
          return valueToStore
        })
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error)
      }
    },
    [key]
  )

  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key)
      setStoredValue(initialValue)
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error)
    }
  }, [key, initialValue])

  return [storedValue, setValue, removeValue]
}
