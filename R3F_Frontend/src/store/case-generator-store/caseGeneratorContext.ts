import { createContext, useContext } from 'react'

export interface VerdictOption {
  verdict_option: string
  score_points: number
}

export interface Evidence {
  name: string
  description: string
  images?: { image_url: string; caption?: string }[]
}

export interface Witness {
  name: string
  role: string
  summary_statement: string
}

export interface CaseData {
  id: number
  case_name: string
  case_type: string
  case_description: string
  defendant: string
  victim: string
  correct_verdict: string
  possible_choices: VerdictOption[]
  evidence_items: Evidence[]
  witnesses: Witness[]
}

export type CaseGeneratorContextValue = {
  caseInfo: CaseData | null
  isLoading: boolean
  error: string | null
  fetchCase: () => Promise<void>
  clearCase: () => void
  setCaseInfo: (data: CaseData | null) => void
}

export const CaseGeneratorContext = createContext<CaseGeneratorContextValue | null>(null)

export function useCaseGenerator() {
  const ctx = useContext(CaseGeneratorContext)
  if (!ctx) throw new Error('useCaseGenerator must be used within CaseGeneratorProvider')
  return ctx
}
