import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'

export function FlyCamera() {
    // 1. We use a ref to store the current state of our keys so it doesn't cause React re-renders
    const keys = useRef({
        w: false,
        a: false,
        s: false,
        d: false,
        space: false,
        ctrl: false,
    })

    // 2. Set up keyboard event listeners
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.code) {
                case 'KeyW': keys.current.w = true; break;
                case 'KeyA': keys.current.a = true; break;
                case 'KeyS': keys.current.s = true; break;
                case 'KeyD': keys.current.d = true; break;
                case 'Space': keys.current.space = true; break;
                case 'ShiftLeft': // Adding shift just in case you prefer it
                    keys.current.ctrl = true;
                    break;
            }
        }

        const handleKeyUp = (e: KeyboardEvent) => {
            switch (e.code) {
                case 'KeyW': keys.current.w = false; break;
                case 'KeyA': keys.current.a = false; break;
                case 'KeyS': keys.current.s = false; break;
                case 'KeyD': keys.current.d = false; break;
                case 'Space': keys.current.space = false; break;
                case 'ControlLeft':
                case 'ControlRight':
                case 'ShiftLeft':
                    keys.current.ctrl = false;
                    break;
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
        }
    }, [])

    // 3. Update the camera position every single frame
    useFrame((state, delta) => {
        // Speed: 5 units per second. Multiply by delta to ensure smooth movement regardless of framerate
        const speed = 5 * delta

        if (keys.current.w) state.camera.translateZ(-speed) // Move forward
        if (keys.current.s) state.camera.translateZ(speed)  // Move backward
        if (keys.current.a) state.camera.translateX(-speed) // Strafe left
        if (keys.current.d) state.camera.translateX(speed)  // Strafe right

        // Space/Ctrl move on the global Y axis (straight up/down)
        if (keys.current.space) state.camera.position.y += speed
        if (keys.current.ctrl) state.camera.position.y -= speed
    })

    return (
        // PointerLockControls locks the mouse to the canvas and handles FPS rotation
        <PointerLockControls makeDefault/>
    )
}