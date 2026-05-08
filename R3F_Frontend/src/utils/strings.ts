import type { Phase, Side } from '../store/flow-store/types'

export const HUD_STRINGS = {
  phase: {
    pre_trial: 'Court is in session — awaiting commencement',
    opening_prosecution: 'Opening Statement — Prosecution',
    opening_defense: 'Opening Statement — Defense',
    evidence: (index: number, count: number, name: string) =>
      `Evidence ${index + 1} of ${count} — "${name}"`,
    closing_prosecution: 'Closing Argument — Prosecution',
    closing_defense: 'Closing Argument — Defense',
    verdict: 'Deliver your verdict',
    concluded: 'Court adjourned',
  },

  speaker: {
    prosecution: 'Prosecution',
    defense: 'Defense',
    judge: 'Judge',
    judgeName: 'The Court (you)',
  } satisfies Record<Side | 'judge' | 'judgeName', string>,

  speech: {
    thinking: '…',
    preTrialHint: 'Open the case file and begin when ready.',
    empty: ' ',
  },

  ruling: {
    prefix: 'Objection by',
    separator: '—',
    sustain: 'Sustain',
    overrule: 'Overrule',
  },

  verdict: {
    prompt: 'Select the verdict:',
  },

  start: {
    button: 'Begin Trial',
  },

  advance: {
    button: 'Continue',
    waiting: 'Speaking…',
  },

  transcript: {
    hint: (count: number) => `${count} action${count === 1 ? '' : 's'} on record`,
  },
} as const

export function phaseLabel(
  phase: Phase,
  evidenceIndex: number | null,
  evidenceCount: number,
  evidenceName: string | undefined,
): string {
  if (phase === 'evidence_debate') {
    return HUD_STRINGS.phase.evidence(evidenceIndex ?? 0, evidenceCount, evidenceName ?? '')
  }
  return HUD_STRINGS.phase[phase]
}
