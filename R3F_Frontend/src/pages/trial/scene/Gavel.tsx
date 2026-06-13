import * as THREE from 'three'
import React, { useRef, useImperativeHandle, forwardRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { useFlow } from '../../../store/flow-store/flowStore'
import { useCaseGenerator } from '../../../store/case-generator-store/caseGeneratorContext'

// Types for the props so it integrates seamlessly with your existing code
interface GavelProps {
    nodes: any
    materials: any
}

// Expose the strike method to parent components
export interface GavelHandle {
    strike: () => void
}

export const Gavel = forwardRef<GavelHandle, GavelProps>(({ nodes, materials }, ref) => {
    const pivotGroupRef = useRef<THREE.Group>(null)

    // State for the animation sequence
    const animState = useRef({
        playing: false,
        time: 0,
        hasPlayedSound: false
    })

    // 🔴 ADJUST: Audio Setup
    // Make sure you place a sound file at this path in your public folder
    const audioRef = useRef<HTMLAudioElement | null>(null)
    useEffect(() => {
        audioRef.current = new Audio('/sounds/gavel-strike.mp3')
    }, [])

    // 🔴 ADJUST: Base Positions & Rotations
    // These are the original transform values from your GLTF
    const basePosition = new THREE.Vector3(-0.574, 1.154, -2.197)
    const baseRotation = new THREE.Euler(-0.223, 1.571, 0)

    // 🔴 ADJUST: Pivot Offset
    // Change these values to move the empty parent (pivot) along the handle.
    // The handle mesh will be offset backwards by this exact amount so it stays visually in place, 
    // but rotates around this new point.
    const pivotOffset = new THREE.Vector3(0, 0, 0)

    // Method to trigger the animation (can be called via ref or click)
    const triggerStrike = (e?: ThreeEvent<MouseEvent>) => {
        e?.stopPropagation()
        // Resetting time to 0 allows the animation to restart naturally if clicked repeatedly
        animState.current.playing = true
        animState.current.time = 0
        animState.current.hasPlayedSound = false
    }

    // Expose trigger to parent component
    useImperativeHandle(ref, () => ({
        strike: triggerStrike
    }))

    // === Flow integration ===================================================
    // The Gavel strikes whenever the trial begins. Both the HUD "Begin Trial"
    // button and the in-scene gavel click route through `startTrial()`, which
    // bumps `gavelStrikeTick`. The effect below watches that tick and fires
    // the strike animation when it changes.
    const { caseInfo } = useCaseGenerator()
    const phase = useFlow((s) => s.phase)
    const gavelStrikeTick = useFlow((s) => s.gavelStrikeTick)

    useEffect(() => {
        if (gavelStrikeTick > 0) triggerStrike()
        // triggerStrike is stable (closure over refs) — no need in deps
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gavelStrikeTick])

    /** Click on the gavel itself: if we're pre-trial with a case loaded, start
     *  the trial (which bumps the tick → the effect above animates). Otherwise
     *  just animate locally as visual feedback. */
    const onGavelClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        if (phase === 'pre_trial' && caseInfo) {
            useFlow.getState().startTrial(caseInfo)
        } else {
            triggerStrike()
        }
    }

    useFrame((_, delta) => {
        if (!animState.current.playing || !pivotGroupRef.current) return

        animState.current.time += delta
        const t = animState.current.time

        // 🔴 ADJUST: Animation Timings (in seconds)
        const windupTime = 0.25  // Time it takes to lift up
        const strikeTime = 0.35  // Time it takes to smash down (Sound plays here)
        const bounceTime = 0.50  // Time it takes to bounce back up slightly
        const settleTime = 0.60  // Time it takes to settle back to rest

        // 🔴 ADJUST: Animation Intensities
        const liftHeight = 0.2          // How high the gavel lifts during windup
        const windupAngle = -Math.PI / 6 // Angle it tilts back during windup
        const strikeAngle = 0.05       // Over-tilt slightly when hitting the block
        const bounceHeight = 0.05       // Height of the recoil bounce
        const bounceAngle = -Math.PI / 16// Angle of the recoil bounce

        let currentY = 0
        let currentRot = 0

        // Animation Keyframes Logic
        if (t < windupTime) {
            // 1. LIFT & WINDUP
            const progress = t / windupTime
            const ease = progress * progress * (3 - 2 * progress) // smoothstep
            currentY = liftHeight * ease
            currentRot = windupAngle * ease
        } else if (t < strikeTime) {
            // 2. STRIKE DOWNWARD
            const progress = (t - windupTime) / (strikeTime - windupTime)
            const ease = progress * progress // ease-in for forceful strike
            currentY = liftHeight * (1 - ease)
            currentRot = windupAngle - (windupAngle - strikeAngle) * ease
        } else if (t < bounceTime) {
            // --- PLAY SOUND EXACTLY ON STRIKE ---
            if (!animState.current.hasPlayedSound && audioRef.current) {
                audioRef.current.currentTime = 0
                audioRef.current.play().catch(e => console.warn("Audio play blocked by browser", e))
                animState.current.hasPlayedSound = true
            }
            // 3. BOUNCE RECOIL
            const progress = (t - strikeTime) / (bounceTime - strikeTime)
            const ease = Math.sin(progress * Math.PI / 2) // ease-out
            currentY = bounceHeight * ease
            currentRot = strikeAngle + (bounceAngle - strikeAngle) * ease
        } else if (t < settleTime) {
            // 4. SETTLE TO REST
            const progress = (t - bounceTime) / (settleTime - bounceTime)
            const ease = 1 - Math.cos(progress * Math.PI / 2) // ease-in
            currentY = bounceHeight * (1 - ease)
            currentRot = bounceAngle * (1 - ease)
        } else {
            // 5. FINISH
            animState.current.playing = false
            currentY = 0
            currentRot = 0
        }

        // 🔴 ADJUST: Animation Axis
        // If the gavel swings side-to-side instead of up-and-down, change `rotation.z` to `rotation.x`
        pivotGroupRef.current.position.y = currentY
        pivotGroupRef.current.rotation.z = currentRot
    })

    // Optional: Cursor interactions for better UX
    const onPointerOver = () => (document.body.style.cursor = 'pointer')
    const onPointerOut = () => (document.body.style.cursor = 'auto')

    return (
        <group>
            {/* GAVEL STRIKING PLATFORM */}
            <mesh
                geometry={nodes.Gavel_StrikingPlatform.geometry}
                material={materials.Baked_Furniture}
                position={[-0.574, 1.209, -1.938]}
                onClick={onGavelClick}
                onPointerOver={onPointerOver}
                onPointerOut={onPointerOut}
            />

            {/* GAVEL MAIN WRAPPER */}
            <group position={basePosition} rotation={baseRotation}>

                {/* THIS IS THE PIVOT GROUP WE ANIMATE */}
                <group ref={pivotGroupRef} position={pivotOffset}>

                    {/* THE ACTUAL GAVEL HANDLE (Offset negatively to counter the pivot) */}
                    <mesh
                        geometry={nodes.Gavel_Handle.geometry}
                        material={materials.DarkerWood_Shiny}
                        position={[-pivotOffset.x, -pivotOffset.y, -pivotOffset.z]}
                        onClick={onGavelClick}
                        onPointerOver={onPointerOver}
                        onPointerOut={onPointerOut}
                    >
                        <group position={[-0.258, 0, 0]}>
                            <mesh geometry={nodes.Mesh_1.geometry} material={materials.DarkerWood_Shiny} />
                            <mesh geometry={nodes.Mesh_2.geometry} material={materials.Gold} />
                        </group>
                    </mesh>

                </group>
            </group>
        </group>
    )
})