/**
 * Types matching the Django backend serializers exactly.
 * Source: api/serializers.py + api/models.py
 */

export interface Evidence {
  id: number
  name: string
  description: string
  images?: { id: number; image_url: string; caption?: string }[]
}

export interface Witness {
  id: number
  name: string
  role: string
  summary_statement: string
  hidden_truth: string | null
}

export interface Choice {
  id: number
  verdict_option: string
  score_points: number
}

export interface Case {
  id: number
  case_name: string
  case_type: string
  case_description: string
  police_report: string | null
  absolute_truth: string | null
  defendant: string
  victim: string
  correct_verdict: string
  created_at: string
  possible_choices: Choice[]
  evidence_items: Evidence[]
  witnesses: Witness[]
}

import type { TrialAction } from '../../store/flow-store/types'

export interface CaseHistoryEntry {
  id: number
  user: number
  case: Case
  transcript: TrialAction[]
  verdict_given: string | null
  is_correct: boolean | null
  created_at: string
  updated_at: string
}

export interface ProfileResponse {
  user: { id: number; username: string; email: string }
  history: CaseHistoryEntry[]
}
