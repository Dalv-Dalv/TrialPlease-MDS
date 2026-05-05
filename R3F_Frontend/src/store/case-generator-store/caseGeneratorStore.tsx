import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  CaseGeneratorContext,
  type CaseData,
  type CaseGeneratorContextValue,
} from './caseGeneratorContext'

export function CaseGeneratorProvider({ children }: { children: ReactNode }) {
  const [caseInfo, setCaseInfo] = useState<CaseData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCase = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('http://127.0.0.1:8000/api/cases/generate/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) throw new Error('Failed to generate case')
      const data = await response.json()
      setCaseInfo(data.case)
    } catch {
      setError('Failed to retrieve court records. Database unreachable.')
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
