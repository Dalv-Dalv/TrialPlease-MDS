import { create } from 'zustand'
import type { Side } from '../flow-store/types'
import { MOCK_PERSONAS } from '../../test/flow'

export type LawyerSideState = {
  persona: { name: string; style: string }
  isThinking: boolean
  lastUtterance: string | null
}

type LawyerStoreState = {
  defense: LawyerSideState
  prosecution: LawyerSideState

  setThinking: (side: Side, value: boolean) => void
  setUtterance: (side: Side, text: string | null) => void
  reset: () => void
}

const makeInitial = (side: Side): LawyerSideState => ({
  persona: MOCK_PERSONAS[side],
  isThinking: false,
  lastUtterance: null,
})

function patchSide(
  state: LawyerStoreState,
  side: Side,
  patch: Partial<LawyerSideState>,
): Partial<LawyerStoreState> {
  if (side === 'defense') return { defense: { ...state.defense, ...patch } }
  return { prosecution: { ...state.prosecution, ...patch } }
}

export const useLawyers = create<LawyerStoreState>((set) => ({
  defense: makeInitial('defense'),
  prosecution: makeInitial('prosecution'),

  setThinking: (side, value) => set((s) => patchSide(s, side, { isThinking: value })),
  setUtterance: (side, text) => set((s) => patchSide(s, side, { lastUtterance: text })),

  reset: () =>
    set({
      defense: makeInitial('defense'),
      prosecution: makeInitial('prosecution'),
    }),
}))
