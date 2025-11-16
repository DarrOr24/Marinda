// providers/signup-flow-provider.tsx
import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react'

export type SignUpDetails = {
  first_name: string
  last_name: string
  gender: 'MALE' | 'FEMALE' | ''
  birth_date: string | ''
  avatar_url: string | ''
}

type Ctx = {
  details: SignUpDetails
  setDetails: (d: Partial<SignUpDetails>) => void
  reset: () => void
}

const SignUpFlowCtx = createContext<Ctx | null>(null)

export function SignUpFlowProvider({ children }: PropsWithChildren) {
  const [details, set] = useState<SignUpDetails>({
    first_name: '',
    last_name: '',
    gender: '',
    birth_date: '',
    avatar_url: '',
  })
  const value = useMemo<Ctx>(() => ({
    details,
    setDetails: (d) => set(cur => ({ ...cur, ...d })),
    reset: () => set({ first_name: '', last_name: '', gender: '', birth_date: '', avatar_url: '' }),
  }), [details])
  return <SignUpFlowCtx.Provider value={value}>{children}</SignUpFlowCtx.Provider>
}

export const useSignUpFlow = () => {
  const ctx = useContext(SignUpFlowCtx)
  if (!ctx) throw new Error('useSignUpFlow must be used within SignUpFlowProvider')
  return ctx
}
