import { create } from 'zustand'

export type ActionName =
  | 'SitIdle1'
  | 'SitIdle2'
  | 'SitIdle3'
  | 'SitIdle4'
  | 'SitToStand2'
  | 'StandToSit'
  | 'SitToStand1';

export type CharacterRole = 'prosecution1' | 'prosecution2' | 'defense1' | 'defense2' | 'spectators';
export type PoseState = 'sit' | 'stand' | 'sit_to_stand' | 'stand_to_sit';

export interface TrialAnimationState {
  roleStates: Record<CharacterRole, PoseState>;
  setRoleState: (role: CharacterRole, state: PoseState) => void;
  // Hooks as requested by user
  standProsecution1: () => void;
  sitProsecution1: () => void;
  standProsecution2: () => void;
  sitProsecution2: () => void;
  standDefense1: () => void;
  sitDefense1: () => void;
  standDefense2: () => void;
  sitDefense2: () => void;
  standSpectators: () => void;
  sitSpectators: () => void;
}

export const useTrialSceneAnimation = create<TrialAnimationState>((set) => ({
  roleStates: {
    prosecution1: 'sit',
    prosecution2: 'sit',
    defense1: 'sit',
    defense2: 'sit',
    spectators: 'sit',
  },
  setRoleState: (role, state) => set((prev) => ({
    roleStates: { ...prev.roleStates, [role]: state }
  })),
  standProsecution1: () => set((prev) => ({ roleStates: { ...prev.roleStates, prosecution1: 'sit_to_stand' } })),
  sitProsecution1: () => set((prev) => ({ roleStates: { ...prev.roleStates, prosecution1: 'stand_to_sit' } })),
  standProsecution2: () => set((prev) => ({ roleStates: { ...prev.roleStates, prosecution2: 'sit_to_stand' } })),
  sitProsecution2: () => set((prev) => ({ roleStates: { ...prev.roleStates, prosecution2: 'stand_to_sit' } })),
  standDefense1: () => set((prev) => ({ roleStates: { ...prev.roleStates, defense1: 'sit_to_stand' } })),
  sitDefense1: () => set((prev) => ({ roleStates: { ...prev.roleStates, defense1: 'stand_to_sit' } })),
  standDefense2: () => set((prev) => ({ roleStates: { ...prev.roleStates, defense2: 'sit_to_stand' } })),
  sitDefense2: () => set((prev) => ({ roleStates: { ...prev.roleStates, defense2: 'stand_to_sit' } })),
  standSpectators: () => set((prev) => ({ roleStates: { ...prev.roleStates, spectators: 'sit_to_stand' } })),
  sitSpectators: () => set((prev) => ({ roleStates: { ...prev.roleStates, spectators: 'stand_to_sit' } })),
}));
