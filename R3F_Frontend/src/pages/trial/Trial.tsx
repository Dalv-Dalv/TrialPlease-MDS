import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import { EffectComposer, Bloom, Noise, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { Menu } from 'lucide-react'
import { TrialScene } from './scene/TrialScene'
import { CaseTablet } from './components/CaseFile'
import { TrialMenu } from './components/trial-menu/TrialMenu'
import { TrialHUD } from './components/trial-hud/TrialHUD'
import './Trial.css'

export default function Trial() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isTabletOpen, setIsTabletOpen] = useState(false)

  return (
    <div className="trial-shell">
      <div className="trial-crosshair" />

      <Canvas
        gl={{ antialias: false }}
        camera={{ position: [0, 1.468, -2.42], fov: 90 }}
        frameloop="always"
      >
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={18.5}
          rotation={[-0.5607, 0.1024, -1.1726]}
          color={[1, 0.4, 0.3]}
        />

        <TrialScene />

        <CaseTablet
          deskPosition={[0.5, 1.15, -2.1]}
          deskRotation={[Math.PI / 2, Math.PI, 0]}
          onOpenChange={setIsTabletOpen}
        />

        <PointerLockControls makeDefault enabled={!isTabletOpen} />

        <EffectComposer>
          <Bloom luminanceThreshold={0.95} luminanceSmoothing={0.625} />
          <Noise opacity={0.03} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      </Canvas>

      <button
        type="button"
        className="trial-menu-trigger"
        onClick={() => setMenuOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {!isTabletOpen && <TrialHUD />}

      <TrialMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  )
}
