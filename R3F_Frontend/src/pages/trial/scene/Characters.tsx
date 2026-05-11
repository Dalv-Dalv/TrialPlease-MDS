import React, { useMemo, useLayoutEffect, useEffect, useRef, useState, type JSX } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { useGraph } from '@react-three/fiber'
import { SkeletonUtils } from 'three-stdlib'
import * as THREE from 'three'
import { useTrialSceneAnimation, type CharacterRole, type ActionName } from './useTrialSceneAnimation'

export const CHARACTER_MODELS = [
  'Ch08', 'Ch12', 'Ch23', 'Ch28', 'Ch31', 'Ch33', 'Ch41', 'Ch06', 'Ch07'
] as const;

export type CharacterModel = typeof CHARACTER_MODELS[number];

const ROOT_BONES: Record<CharacterModel, string> = {
  Ch08: 'mixamorig7Hips',
  Ch12: 'mixamorig4Hips',
  Ch23: 'mixamorigHips',
  Ch28: 'mixamorig10Hips',
  Ch31: 'mixamorig9Hips',
  Ch33: 'mixamorig7Hips_1',
  Ch41: 'mixamorig4Hips_1',
  Ch06: 'mixamorig9Hips_1',
  Ch07: 'mixamorig8Hips',
};

const IDLE_ANIMATIONS = ['SitIdle1', 'SitIdle2', 'SitIdle3', 'SitIdle4'];

export const ANIMATION_OFFSETS: Record<ActionName, { position: [number, number, number], rotation: [number, number, number] }> = {
  SitIdle1: { position: [0, -0.4, 0], rotation: [0, 0, 0] },
  SitIdle2: { position: [0, -0.4, 0], rotation: [0, 0, 0] },
  SitIdle3: { position: [0, -0.4, 0], rotation: [0, 0, 0] },
  SitIdle4: { position: [0, -0.4, 0], rotation: [0, 0, 0] },
  SitToStand1: { position: [0, -0.4, 0.0], rotation: [0, 0, 0] },
  SitToStand2: { position: [0, -0.4, 0.0], rotation: [0, 0, 0] },
  StandToSit: { position: [0, -0.4, 0.41], rotation: [0, 0, 0] },
};

export function CharacterInstance({
  model,
  role,
  ...props
}: {
  model: CharacterModel,
  role: CharacterRole
} & JSX.IntrinsicElements['group']) {
  const { scene, materials } = useGLTF('/models/CharacterModels.glb') as any
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes } = useGraph(clone) as any

  const { animations } = useGLTF('/models/AnimationsExport.glb') as any;
  const rootBone = ROOT_BONES[model];
  const modifiedAnimations = useMemo(() => {
    const splitClips: THREE.AnimationClip[] = [];
    animations.forEach((clip: THREE.AnimationClip) => {
      const rotClip = clip.clone();
      const posClip = clip.clone();

      rotClip.name = clip.name;
      posClip.name = clip.name + '_Pos';

      const prefixSuffixMatch = rootBone.match(/^(.*?)(Hips)(.*)$/);
      const prefix = prefixSuffixMatch ? prefixSuffixMatch[1] : 'mixamorig';
      const suffix = prefixSuffixMatch ? prefixSuffixMatch[3] : '';

      // Rotation clip: keep all tracks except position
      rotClip.tracks = rotClip.tracks.filter(track => !track.name.endsWith('.position'));

      // Position clip: keep only position tracks for the main hips/armature
      posClip.tracks = posClip.tracks.filter(track => {
        if (!track.name.endsWith('.position')) return false;
        if (!track.name.includes('Hips') && !track.name.includes('AnimationsArmature')) return false;
        return true;
      });

      [rotClip, posClip].forEach(c => {
        c.tracks.forEach(track => {
          const parts = track.name.split('.');
          if (parts.length === 2 && parts[0].startsWith('mixamorig8')) {
            const bodyPart = parts[0].substring('mixamorig8'.length);
            track.name = `${prefix}${bodyPart}${suffix}.${parts[1]}`;
          }
        });
      });

      splitClips.push(rotClip, posClip);
    });
    return splitClips;
  }, [animations, rootBone]);

  const groupRef = useRef<THREE.Group>(null);
  const { actions, mixer } = useAnimations(modifiedAnimations, groupRef);

  const roleState = useTrialSceneAnimation((state) => state.roleStates[role]);
  const setRoleState = useTrialSceneAnimation((state) => state.setRoleState);
  const [currentAnimName, setCurrentAnimName] = useState<ActionName>('SitIdle1');

  const idleAnimName = useMemo(() => {
    return IDLE_ANIMATIONS[Math.floor(Math.random() * IDLE_ANIMATIONS.length)] as ActionName;
  }, []);

  const sitToStandAnimRef = useRef<ActionName>('SitToStand1');
  const prevRoleStateRef = useRef(roleState);

  useEffect(() => {
    if (!actions || !mixer) return;

    if (roleState === 'sit_to_stand' && prevRoleStateRef.current !== 'sit_to_stand') {
      sitToStandAnimRef.current = (Math.random() > 0.5 ? 'SitToStand1' : 'SitToStand2') as ActionName;
    }
    prevRoleStateRef.current = roleState;

    let targetAnim: ActionName;
    let loop = THREE.LoopRepeat;
    let clamp = false;

    switch (roleState) {
      case 'sit': targetAnim = idleAnimName; break;
      case 'sit_to_stand': targetAnim = sitToStandAnimRef.current; loop = THREE.LoopOnce; clamp = true; break;
      case 'stand_to_sit': targetAnim = 'StandToSit'; loop = THREE.LoopOnce; clamp = true; break;
      case 'stand': targetAnim = sitToStandAnimRef.current; loop = THREE.LoopOnce; clamp = true; break;
      default: targetAnim = idleAnimName;
    }

    const actionRot = actions[targetAnim];
    const actionPos = actions[targetAnim + '_Pos'];
    if (!actionRot || !actionPos) return;

    setCurrentAnimName(targetAnim);

    // Stop previous Position action instantly
    if (actions[currentAnimName + '_Pos'] && currentAnimName !== targetAnim) {
      actions[currentAnimName + '_Pos'].stop();
    }

    actionRot.reset();
    actionRot.setLoop(loop, Infinity);
    actionRot.clampWhenFinished = clamp;

    actionPos.reset();
    actionPos.setLoop(loop, Infinity);
    actionPos.clampWhenFinished = clamp;

    if (roleState === 'sit') {
      const time = Math.random() * actionRot.getClip().duration;
      actionRot.time = time;
      actionPos.time = time;
    } else if (roleState === 'stand') {
      const time = actionRot.getClip().duration;
      actionRot.time = time;
      actionPos.time = time;
    }

    actionPos.play();
    actionRot.play();

    // Crossfade Rotation action only
    if (roleState !== 'stand' && actions[currentAnimName] && currentAnimName !== targetAnim) {
      actionRot.crossFadeFrom(actions[currentAnimName], 0.5, true);
    }
  }, [actions, mixer, roleState, idleAnimName]);

  useEffect(() => {
    if (!mixer) return;
    const onFinished = (e: any) => {
      const actionName = e.action.getClip().name;
      if (actionName.endsWith('_Pos')) return; // Ignore positional clips
      if (actionName === 'StandToSit') {
        setRoleState(role, 'sit');
      } else if (actionName === 'SitToStand1' || actionName === 'SitToStand2') {
        setRoleState(role, 'stand');
      }
    };
    mixer.addEventListener('finished', onFinished);
    return () => mixer.removeEventListener('finished', onFinished);
  }, [mixer, role, setRoleState]);

  useLayoutEffect(() => {
    Object.values(materials).forEach((mat: any) => {
      mat.depthWrite = true;
      if (mat.transparent) {
        mat.transparent = false;
        mat.alphaTest = 0.5;
      }
      mat.needsUpdate = true;
    });
  }, [materials]);

  const offset = ANIMATION_OFFSETS[currentAnimName] || ANIMATION_OFFSETS.SitIdle1;

  return (
    <group {...props} dispose={null} ref={groupRef}>
      <group position={offset.position} rotation={offset.rotation}>
        <group rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
          {model === 'Ch08' && (
            <>
              <skinnedMesh geometry={nodes.Ch08_Beard.geometry} material={materials.Ch08_hair} skeleton={nodes.Ch08_Beard.skeleton} />
              <skinnedMesh geometry={nodes.Ch08_Body.geometry} material={materials.Ch08_body} skeleton={nodes.Ch08_Body.skeleton} />
              <skinnedMesh geometry={nodes.Ch08_Eyelashes.geometry} material={materials.Ch08_hair} skeleton={nodes.Ch08_Eyelashes.skeleton} />
              <skinnedMesh geometry={nodes.Ch08_Hair.geometry} material={materials.Ch08_hair} skeleton={nodes.Ch08_Hair.skeleton} />
              <skinnedMesh geometry={nodes.Ch08_Hoodie.geometry} material={materials.Ch08_body1} skeleton={nodes.Ch08_Hoodie.skeleton} />
              <skinnedMesh geometry={nodes.Ch08_Pants.geometry} material={materials.Ch08_body1} skeleton={nodes.Ch08_Pants.skeleton} />
              <skinnedMesh geometry={nodes.Ch08_Sneakers.geometry} material={materials.Ch08_body1} skeleton={nodes.Ch08_Sneakers.skeleton} />
              <primitive object={nodes.mixamorig7Hips} />
            </>
          )}
          {model === 'Ch12' && (
            <>
              <skinnedMesh geometry={nodes.Ch12.geometry} material={materials.Ch12_body} skeleton={nodes.Ch12.skeleton} />
              <primitive object={nodes.mixamorig4Hips} />
            </>
          )}
          {model === 'Ch23' && (
            <>
              <skinnedMesh geometry={nodes.Ch23_Belt.geometry} material={materials.Ch23_body} skeleton={nodes.Ch23_Belt.skeleton} />
              <skinnedMesh geometry={nodes.Ch23_Body.geometry} material={materials.Ch23_body} skeleton={nodes.Ch23_Body.skeleton} />
              <skinnedMesh geometry={nodes.Ch23_Eyelashes.geometry} material={materials.Ch23_hair} skeleton={nodes.Ch23_Eyelashes.skeleton} />
              <skinnedMesh geometry={nodes.Ch23_Hair.geometry} material={materials.Ch23_hair} skeleton={nodes.Ch23_Hair.skeleton} />
              <skinnedMesh geometry={nodes.Ch23_Pants.geometry} material={materials.Ch23_body} skeleton={nodes.Ch23_Pants.skeleton} />
              <skinnedMesh geometry={nodes.Ch23_Shirt.geometry} material={materials.Ch23_body} skeleton={nodes.Ch23_Shirt.skeleton} />
              <skinnedMesh geometry={nodes.Ch23_Shoes.geometry} material={materials.Ch23_body} skeleton={nodes.Ch23_Shoes.skeleton} />
              <skinnedMesh geometry={nodes.Ch23_Suit.geometry} material={materials.Ch23_body} skeleton={nodes.Ch23_Suit.skeleton} />
              <primitive object={nodes.mixamorigHips} />
            </>
          )}
          {model === 'Ch28' && (
            <>
              <skinnedMesh geometry={nodes.Ch28_Body.geometry} material={materials.Ch28_body} skeleton={nodes.Ch28_Body.skeleton} />
              <skinnedMesh geometry={nodes.Ch28_Eyelashes.geometry} material={materials.Ch28_hair} skeleton={nodes.Ch28_Eyelashes.skeleton} />
              <skinnedMesh geometry={nodes.Ch28_Hair.geometry} material={materials.Ch28_body} skeleton={nodes.Ch28_Hair.skeleton} />
              <skinnedMesh geometry={nodes.Ch28_Hoody.geometry} material={materials.Ch28_body} skeleton={nodes.Ch28_Hoody.skeleton} />
              <skinnedMesh geometry={nodes.Ch28_Pants.geometry} material={materials.Ch28_body} skeleton={nodes.Ch28_Pants.skeleton} />
              <skinnedMesh geometry={nodes.Ch28_Sneakers.geometry} material={materials.Ch28_body} skeleton={nodes.Ch28_Sneakers.skeleton} />
              <primitive object={nodes.mixamorig10Hips} />
            </>
          )}
          {model === 'Ch31' && (
            <>
              <skinnedMesh geometry={nodes.Ch31_Body.geometry} material={materials.Ch31_body} skeleton={nodes.Ch31_Body.skeleton} />
              <skinnedMesh geometry={nodes.Ch31_Collar.geometry} material={materials.Ch31_body} skeleton={nodes.Ch31_Collar.skeleton} />
              <skinnedMesh geometry={nodes.Ch31_Eyelashes.geometry} material={materials.Ch31_hair} skeleton={nodes.Ch31_Eyelashes.skeleton} />
              <skinnedMesh geometry={nodes.Ch31_Hair.geometry} material={materials.Ch31_hair} skeleton={nodes.Ch31_Hair.skeleton} />
              <skinnedMesh geometry={nodes.Ch31_Pants.geometry} material={materials.Ch31_body} skeleton={nodes.Ch31_Pants.skeleton} />
              <skinnedMesh geometry={nodes.Ch31_Shoes.geometry} material={materials.Ch31_body} skeleton={nodes.Ch31_Shoes.skeleton} />
              <skinnedMesh geometry={nodes.Ch31_Sweater.geometry} material={materials.Ch31_body} skeleton={nodes.Ch31_Sweater.skeleton} />
              <primitive object={nodes.mixamorig9Hips} />
            </>
          )}
          {model === 'Ch33' && (
            <>
              <skinnedMesh geometry={nodes.Ch33_Belt.geometry} material={materials.Ch33_body} skeleton={nodes.Ch33_Belt.skeleton} />
              <skinnedMesh geometry={nodes.Ch33_Body.geometry} material={materials.Ch33_body} skeleton={nodes.Ch33_Body.skeleton} />
              <skinnedMesh geometry={nodes.Ch33_Eyelashes.geometry} material={materials.Ch33_hair} skeleton={nodes.Ch33_Eyelashes.skeleton} />
              <skinnedMesh geometry={nodes.Ch33_Hair.geometry} material={materials.Ch33_hair} skeleton={nodes.Ch33_Hair.skeleton} />
              <skinnedMesh geometry={nodes.Ch33_Pants.geometry} material={materials.Ch33_body} skeleton={nodes.Ch33_Pants.skeleton} />
              <skinnedMesh geometry={nodes.Ch33_Shirt.geometry} material={materials.Ch33_body} skeleton={nodes.Ch33_Shirt.skeleton} />
              <skinnedMesh geometry={nodes.Ch33_Shoes.geometry} material={materials.Ch33_body} skeleton={nodes.Ch33_Shoes.skeleton} />
              <skinnedMesh geometry={nodes.Ch33_Suit.geometry} material={materials.Ch33_body} skeleton={nodes.Ch33_Suit.skeleton} />
              <skinnedMesh geometry={nodes.Ch33_Tie.geometry} material={materials.Ch33_body} skeleton={nodes.Ch33_Tie.skeleton} />
              <primitive object={nodes.mixamorig7Hips_1} />
            </>
          )}
          {model === 'Ch41' && (
            <>
              <skinnedMesh geometry={nodes.Ch41_Body.geometry} material={materials.Ch41_body} skeleton={nodes.Ch41_Body.skeleton} />
              <skinnedMesh geometry={nodes.Ch41_Coat.geometry} material={materials.Ch41_body} skeleton={nodes.Ch41_Coat.skeleton} />
              <skinnedMesh geometry={nodes.Ch41_Eyelashes.geometry} material={materials.Ch41_hair} skeleton={nodes.Ch41_Eyelashes.skeleton} />
              <skinnedMesh geometry={nodes.Ch41_Hair.geometry} material={materials.Ch41_hair} skeleton={nodes.Ch41_Hair.skeleton} />
              <skinnedMesh geometry={nodes.Ch41_Pants.geometry} material={materials.Ch41_body} skeleton={nodes.Ch41_Pants.skeleton} />
              <skinnedMesh geometry={nodes.Ch41_Shirt.geometry} material={materials.Ch41_body} skeleton={nodes.Ch41_Shirt.skeleton} />
              <skinnedMesh geometry={nodes.Ch41_Shoe.geometry} material={materials.Ch41_body} skeleton={nodes.Ch41_Shoe.skeleton} />
              <primitive object={nodes.mixamorig4Hips_1} />
            </>
          )}
          {model === 'Ch06' && (
            <>
              <primitive object={nodes.mixamorig9Hips_1} />
              <skinnedMesh geometry={nodes.Mesh047.geometry} material={materials.Ch06_body} skeleton={nodes.Mesh047.skeleton} />
              <skinnedMesh geometry={nodes.Mesh047_1.geometry} material={materials.Ch06_body1} skeleton={nodes.Mesh047_1.skeleton} />
            </>
          )}
          {model === 'Ch07' && (
            <>
              <skinnedMesh geometry={nodes.Ch07_Body.geometry} material={materials.Ch07_body} skeleton={nodes.Ch07_Body.skeleton} />
              <skinnedMesh geometry={nodes.Ch07_Eyelashes.geometry} material={materials.Ch07_hair} skeleton={nodes.Ch07_Eyelashes.skeleton} />
              <skinnedMesh geometry={nodes.Ch07_Hair.geometry} material={materials.Ch07_hair} skeleton={nodes.Ch07_Hair.skeleton} />
              <skinnedMesh geometry={nodes.Ch07_Heels.geometry} material={materials.Ch07_body} skeleton={nodes.Ch07_Heels.skeleton} />
              <skinnedMesh geometry={nodes.Ch07_Pants.geometry} material={materials.Ch07_body} skeleton={nodes.Ch07_Pants.skeleton} />
              <skinnedMesh geometry={nodes.Ch07_Shirt.geometry} material={materials.Ch07_body} skeleton={nodes.Ch07_Shirt.skeleton} />
              <skinnedMesh geometry={nodes.Ch07_Suit.geometry} material={materials.Ch07_body} skeleton={nodes.Ch07_Suit.skeleton} />
              <primitive object={nodes.mixamorig8Hips} />
            </>
          )}
        </group>
      </group>
    </group>
  )
}

useGLTF.preload('/models/CharacterModels.glb')
useGLTF.preload('/models/AnimationsExport.glb')
