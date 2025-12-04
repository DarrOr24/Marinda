// hooks/use-toast-context.tsx
import { createContext, useContext } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export const ToastContext = createContext<{
  showToast: (message: string, type: ToastType, durationMs?: number) => void
}>({
  showToast: () => { },
})

export const useToast = () => useContext(ToastContext)
