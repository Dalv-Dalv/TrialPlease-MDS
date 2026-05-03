import { Canvas, useThree } from '@react-three/fiber'
import { TrialScene } from './pages/trial/scene/TrialScene'
import { FlyCamera } from './pages/trial/components/FlyCamera' // adjust path as needed
import { EffectComposer, Bloom, Vignette, Noise, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { CaseTablet } from './pages/trial/components/CaseFile'
import { OrbitControls, PointerLockControls } from '@react-three/drei'
import { useEffect, useState } from 'react'

export default function App() {
  const [isTabletOpen, setIsTabletOpen] = useState(false);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>

      {/* A tiny dot in the center of the screen like a crosshair */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 4,
        height: 4,
        background: 'white',
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10,
        pointerEvents: 'none',
        mixBlendMode: 'difference'
      }} />

      <Canvas gl={{ antialias: false }} camera={{ position: [0, 1.468, -2.42], fov: 90 }} frameloop="always">
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={18.5} rotation={[-0.5607, 0.1024, -1.1726]} color={[1, 0.4, 0.3]} />

        <TrialScene />

        <CaseTablet
          deskPosition={[0.5, 1.15, -2.1]}
          deskRotation={[Math.PI / 2, Math.PI, 0]}
          onOpenChange={setIsTabletOpen}   // ← new callback prop
        />
        <PointerLockControls makeDefault enabled={!isTabletOpen} />

        <EffectComposer disableNormalPass>
          <Bloom luminanceThreshold={0.95} luminanceSmoothing={.625} />
          <Noise opacity={0.03} />
          {/* <Vignette eskil={false} offset={0.1} darkness={1.1} /> */}
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}