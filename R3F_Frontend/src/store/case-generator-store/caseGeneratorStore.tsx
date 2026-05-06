import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  CaseGeneratorContext,
  type CaseData,
  type CaseGeneratorContextValue,
} from './caseGeneratorContext'
// TODO: replace mock with real backend call once the case-generation API is wired up.
import { MOCK_CASE } from '../../test/flow'

export function CaseGeneratorProvider({ children }: { children: ReactNode }) {
  const [caseInfo, setCaseInfo] = useState<CaseData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCase = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    await new Promise((r) => setTimeout(r, 500))
    setCaseInfo(MOCK_CASE)
    setIsLoading(false)
  }, [])

  const clearCase = useCallback(() => {
    setCaseInfo(null)
    setError(null)
  }, [])

  const value = useMemo<CaseGeneratorContextValue>(
    () => ({ caseInfo, isLoading, error, fetchCase, clearCase, setCaseInfo }),
    [caseInfo, isLoading, error, fetchCase, clearCase],
  )

  return <CaseGeneratorContext.Provider value={value}>{children}</CaseGeneratorContext.Provider>
}
