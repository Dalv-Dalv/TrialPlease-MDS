import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { Mesh } from 'three'

export function TrialScene() {
  const meshRef = useRef<Mesh>(null)

  useFrame((_, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.x += delta * 0.3
    meshRef.current.rotation.y += delta * 0.4
  })

  return (
    <>
      <color attach="background" args={['#0a0a0f']} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />

      <mesh ref={meshRef}>
        <torusKnotGeometry args={[1, 0.35, 128, 32]} />
        <meshStandardMaterial color="#6366f1" roughness={0.3} metalness={0.2} />
      </mesh>

      <OrbitControls enableDamping />
    </>
  )
}
