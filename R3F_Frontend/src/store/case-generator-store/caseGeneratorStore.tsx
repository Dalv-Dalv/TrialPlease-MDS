import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  CaseGeneratorContext,
  type CaseData,
  type CaseGeneratorContextValue,
} from './caseGeneratorContext'
import { MOCK_CASE } from '../../test/flow'

export function CaseGeneratorProvider({ children }: { children: ReactNode }) {
  const [caseInfo, setCaseInfo] = useState<CaseData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCase = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/cases/generate/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error(`generate ${res.status}`)
      const data = await res.json()
      // Backend may return either the case object directly or `{ case: {...} }`.
      setCaseInfo((data?.case ?? data) as CaseData)
    } catch (err) {
      console.warn('[case] generate API failed, falling back to mock:', err)
      setCaseInfo(MOCK_CASE)
    } finally {
      setIsLoading(false)
    }
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
