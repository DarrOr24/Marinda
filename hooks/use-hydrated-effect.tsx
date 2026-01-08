// hooks/use-hydrated-effect.ts
import { DependencyList, useEffect, useRef } from 'react'

type Options = {
  resetKey?: string | number | null // When this value changes, hydration becomes allowed again
}

export function useHydratedEffect(
  hydrate: () => void,
  deps: DependencyList,
  options: Options = {},
) {
  const { resetKey } = options
  const hydratedRef = useRef(false)
  const lastResetKeyRef = useRef<string | number | null | undefined>(resetKey)

  useEffect(() => {
    if (lastResetKeyRef.current !== resetKey) {
      hydratedRef.current = false
      lastResetKeyRef.current = resetKey
    }
  }, [resetKey])

  useEffect(() => {
    if (hydratedRef.current) return
    hydrate()
    hydratedRef.current = true
  }, deps)
}
