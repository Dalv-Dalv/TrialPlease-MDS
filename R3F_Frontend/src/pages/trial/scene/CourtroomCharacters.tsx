import React, { useMemo } from 'react'
import { CharacterInstance, type CharacterModel } from './Characters'
import { type CharacterRole } from './useTrialSceneAnimation'

export type CourtroomCharactersProps = {
  prosecutionModels?: CharacterModel[];
  defenseModels?: CharacterModel[];
  spectatorModels?: CharacterModel[];
  fillPercentage?: number; // 0 to 1
  maxSpectatorsPerBench?: number;
  spectatorSpreadX?: number; // How far along the X axis they can spread on the bench
}

const PROSECUTION_SEATS = [
  [2.302, 0.504, 3.984],
  [1.596, 0.504, 3.984]
];

const DEFENSE_SEATS = [
  [-2.302, 0.504, 3.984],
  [-1.596, 0.504, 3.984]
];

const GALLERY_BENCHES = [
  [-2.411, 0.504, 6.252],
  [-2.411, 0.504, 7.376],
  [-2.411, 0.504, 8.5],
  [2.411, 0.504, 6.252],
  [2.411, 0.504, 7.376],
  [2.411, 0.504, 8.5]
];

// LCG random generator for consistent randoms based on a seed
function lcg(seed: number) {
  return function () {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }
}

export function CourtroomCharacters({
  prosecutionModels = ['Ch08', 'Ch12'],
  defenseModels = ['Ch31', 'Ch33'],
  spectatorModels = ['Ch06', 'Ch07', 'Ch23', 'Ch28', 'Ch41'],
  fillPercentage = 0.6,
  maxSpectatorsPerBench = 3,
  spectatorSpreadX = 2.0
}: CourtroomCharactersProps) {

  const placements = useMemo(() => {
    // We use a fixed seed here so that React re-renders don't shuffle characters around
    // unless the configuration changes.
    const rng = lcg(12345);

    const pickModel = (pool: CharacterModel[], exclude?: CharacterModel) => {
      let filtered = pool;
      if (exclude && pool.length > 1) {
        filtered = pool.filter(m => m !== exclude);
      }
      return filtered[Math.floor(rng() * filtered.length)];
    }

    let lastDef: CharacterModel | undefined = undefined;
    const defensePlacements = DEFENSE_SEATS.slice(0, defenseModels.length).map((pos, i) => {
      const model = pickModel(defenseModels, lastDef);
      lastDef = model;
      return {
        model,
        role: `defense${i + 1}` as CharacterRole,
        position: pos as [number, number, number],
        rotation: [0, Math.PI, 0] as [number, number, number] // face -Z
      };
    });

    let lastPros: CharacterModel | undefined = undefined;
    const prosecutionPlacements = PROSECUTION_SEATS.slice(0, prosecutionModels.length).map((pos, i) => {
      const model = pickModel(prosecutionModels, lastPros);
      lastPros = model;
      return {
        model,
        role: `prosecution${i + 1}` as CharacterRole,
        position: pos as [number, number, number],
        rotation: [0, Math.PI, 0] as [number, number, number] // face -Z
      };
    });

    const spectators: { model: CharacterModel, role: CharacterRole, position: [number, number, number], rotation: [number, number, number] }[] = [];

    let lastSpec: CharacterModel | undefined = undefined;
    GALLERY_BENCHES.forEach((benchPos) => {
      for (let i = 0; i < maxSpectatorsPerBench; i++) {
        if (rng() < fillPercentage) {
          const t = maxSpectatorsPerBench === 1 ? 0.5 : i / (maxSpectatorsPerBench - 1);
          const offsetX = (t - 0.5) * spectatorSpreadX;
          // Jitter for less robotic placement
          const jitterX = (rng() - 0.5) * 0.2;

          const model = pickModel(spectatorModels, lastSpec);
          lastSpec = model;

          spectators.push({
            model,
            role: 'spectators',
            position: [benchPos[0] + offsetX + jitterX, benchPos[1], benchPos[2]],
            rotation: [0, Math.PI, 0] // assuming they face towards negative Z (towards the front)
          });
        }
      }
    });

    return { defensePlacements, prosecutionPlacements, spectators };
  }, [defenseModels, prosecutionModels, spectatorModels, fillPercentage, maxSpectatorsPerBench, spectatorSpreadX]);

  return (
    <group>
      {placements.defensePlacements.map((p, i) => (
        <CharacterInstance key={`def-${i}`} model={p.model} role={p.role} position={p.position} rotation={p.rotation} />
      ))}
      {placements.prosecutionPlacements.map((p, i) => (
        <CharacterInstance key={`pros-${i}`} model={p.model} role={p.role} position={p.position} rotation={p.rotation} />
      ))}
      {placements.spectators.map((p, i) => (
        <CharacterInstance key={`spec-${i}`} model={p.model} role={p.role} position={p.position} rotation={p.rotation} />
      ))}
    </group>
  );
}
