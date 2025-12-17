'use client'

import { useEffect, useState } from 'react'

/**
 * Hook to detect if component is mounted (client-side).
 * Used to prevent hydration mismatch for components that render
 * differently on server vs client (e.g., theme-dependent content).
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // This is an intentional pattern to detect client-side mounting.
    // The setState triggers a re-render after hydration completes,
    // allowing components to safely render client-only content.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  return mounted
}
