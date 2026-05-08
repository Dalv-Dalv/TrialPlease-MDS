import type { CaseData } from '../store/case-generator-store/caseGeneratorContext'
import type { ObjectionReason, Side, TrialAction } from '../store/flow-store/flowStore'

/**
 * Mock case + scripted lawyer responses used to simulate a full trial without
 * hitting the backend. Consumed by the LawyerProvider when the AI service is
 * unavailable. Replace these with real API calls once the backend is wired up.
 */

export const MOCK_CASE: CaseData = {
  case_name: 'The Crown vs. Marcus Verro',
  case_type: 'Grand Larceny',
  case_description:
    'On the evening of the 14th, the Aldermont Civic Trust reported the disappearance of the ceremonial Golden Gavel from its display case in the historic courthouse rotunda. Surveillance footage and forensic evidence point to a single individual present in the building after closing hours.',
  defendant:
    'Marcus Verro: A 34-year-old former courthouse custodian, terminated three months prior over an unrelated dispute. Known to retain a master keycard that was never deactivated.',
  victim:
    'The Aldermont Civic Trust: A historic preservation society responsible for the courthouse rotunda exhibits. The Golden Gavel, valued at $48,000, has been their centerpiece for forty years.',
  correct_verdict: 'Guilty',
  possible_choices: [
    { verdict_option: 'Guilty', score_points: 100 },
    { verdict_option: 'Not Guilty', score_points: 0 },
    { verdict_option: 'Mistrial', score_points: 25 },
  ],
  evidence_items: [
    {
      name: 'Security Footage',
      description:
        "Time-stamped video from the rotunda corridor camera showing a figure matching the defendant's build entering at 22:14 and leaving at 22:31.",
    },
    {
      name: 'Fingerprints on the Display Case',
      description:
        'Three latent prints lifted from the inner edge of the display case, matched to the defendant within the AFIS database.',
    },
    {
      name: 'Anonymous Tip Email',
      description:
        'An email sent the following morning from a burner address claiming the Golden Gavel was being offered to private collectors.',
    },
  ],
  witnesses: [],
}

export const MOCK_OPENINGS: Record<Side, string> = {
  prosecution:
    'Your honor, the State will demonstrate that on the night in question Mr. Verro entered a building he had no lawful business inside, accessed a sealed display, and removed an irreplaceable artifact. The evidence is direct, it is forensic, and it is uncontested in its provenance.',
  defense:
    'Your honor, my client is a former employee of this courthouse who has cooperated fully with investigators. The State will lean on grainy footage and a tip from an anonymous source. We will show that what looks like opportunity is, in truth, coincidence — and that doubt remains the only honest verdict.',
}

export const MOCK_CLOSINGS: Record<Side, string> = {
  prosecution:
    'You have seen the footage. You have seen the prints. You have read the tip. Each piece of evidence, taken alone, narrows the field. Taken together, they leave only one figure standing in the rotunda that night, and he sits before you. We ask for a verdict of guilty.',
  defense:
    'The State has shown you a man at the wrong place at the wrong time. They have not shown you a thief. Reasonable doubt is not a courtesy; it is a duty. We ask the court to find for the defense.',
}

/**
 * Per-evidence, per-side ordered argument scripts. Each call returns the next
 * line in the array; once exhausted, the lawyer passes on that evidence.
 */
export const MOCK_EVIDENCE_ARGUMENTS: Record<string, Record<Side, string[]>> = {
  'Security Footage': {
    prosecution: [
      "The footage places a figure of the defendant's exact height and gait inside the rotunda seventeen minutes after the building was sealed.",
      'Frame 22:14:38 shows the figure pausing at the display case for nearly two full minutes — an interaction no passerby would have.',
    ],
    defense: [
      'The footage is grainy, low-frame, and shot in poor light. No facial features are resolvable.',
      'My client has freely acknowledged passing through the rotunda that evening to retrieve personal items left behind. His presence is not in dispute; his intent is.',
    ],
  },
  'Fingerprints on the Display Case': {
    prosecution: [
      'Three latent prints, lifted from the inner edge of the case — a surface only accessible when the case is open — match the defendant within the AFIS database.',
      'The prints were dated by oils analysis to within twenty-four hours of the theft. They were not residual from his employment.',
    ],
    defense: [
      "My client cleaned that display case weekly for seven years. His prints in that exhibit are no more remarkable than a librarian's prints on a book spine.",
      'Oils analysis is interpretive, not definitive. The State is asking you to convict on a chemistry guess.',
    ],
  },
  'Anonymous Tip Email': {
    prosecution: [
      'The tip arrived from a burner address within hours of the theft, naming the Golden Gavel before its disappearance was made public.',
      'The sender knew the dimensions, the weight, and the provenance — details available only to someone who had handled the artifact.',
    ],
    defense: [
      "An anonymous email is, by definition, a stranger's claim. It is not evidence — it is rumor in digital form.",
      "The details cited in the tip were published in the Trust's own quarterly newsletter the prior spring. Anyone could have read them.",
    ],
  },
}

/**
 * Substring triggers that cause the *opposite* side to raise an objection
 * against the most recent opponent action. First match wins.
 */
export const MOCK_OBJECTION_TRIGGERS: Array<{
  by: Side
  appliesTo: TrialAction['kind'][]
  triggerSubstring: string
  reason: ObjectionReason
}> = [
  {
    by: 'defense',
    appliesTo: ['evidence_argument'],
    triggerSubstring: 'an interaction no passerby would have',
    reason: 'speculation',
  },
  {
    by: 'prosecution',
    appliesTo: ['evidence_argument'],
    triggerSubstring: 'rumor in digital form',
    reason: 'argumentative',
  },
  {
    by: 'prosecution',
    appliesTo: ['evidence_argument'],
    triggerSubstring: 'librarian',
    reason: 'relevance',
  },
]

export const MOCK_RULING_RESPONSES: Record<'sustained' | 'overruled', Record<Side, string | null>> = {
  sustained: {
    prosecution: 'I will rephrase, your honor.',
    defense: 'Withdrawn, your honor.',
  },
  overruled: {
    prosecution: null,
    defense: null,
  },
}

export const MOCK_PERSONAS: Record<Side, { name: string; style: string }> = {
  prosecution: { name: 'Prosecutor Halloran', style: 'precise, relentless, plainspoken' },
  defense: { name: 'Counsel Voss', style: 'measured, sympathetic, methodical' },
}

/**
 * Helper used by the LawyerProvider's mock implementation: returns the next
 * scripted argument for (side, evidenceName), or null if the script is
 * exhausted (signalling a pass).
 */
export function nextScriptedArgument(
  side: Side,
  evidenceName: string,
  alreadyDelivered: number,
): string | null {
  const script = MOCK_EVIDENCE_ARGUMENTS[evidenceName]?.[side]
  if (!script) return null
  return script[alreadyDelivered] ?? null
}

/**
 * Helper used by the LawyerProvider's mock implementation: returns the first
 * matching objection trigger for `side` against `opponentAction`, or null.
 */
export function findScriptedObjection(
  side: Side,
  opponentAction: TrialAction,
): { reason: ObjectionReason } | null {
  const text = 'text' in opponentAction ? opponentAction.text : null
  if (!text) return null

  for (const trigger of MOCK_OBJECTION_TRIGGERS) {
    if (trigger.by !== side) continue
    if (!trigger.appliesTo.includes(opponentAction.kind)) continue
    if (text.toLowerCase().includes(trigger.triggerSubstring.toLowerCase())) {
      return { reason: trigger.reason }
    }
  }
  return null
}
