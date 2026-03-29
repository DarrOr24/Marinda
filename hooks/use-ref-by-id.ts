import { createRef, useCallback, useRef, type RefObject } from 'react'

export function useRefById<T>() {
  const refsById = useRef<Record<string, RefObject<T | null>>>({})

  return useCallback((id: string) => {
    if (!refsById.current[id]) {
      refsById.current[id] = createRef<T>()
    }

    return refsById.current[id]
  }, [])
}
