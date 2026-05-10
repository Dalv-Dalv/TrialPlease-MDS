import { useState, Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import { EffectComposer, Bloom, Noise, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { Menu } from 'lucide-react'
import { TrialScene } from './scene/TrialScene'
import { CaseTablet } from './components/CaseFile'
import { TrialMenu } from './components/trial-menu/TrialMenu'
import { TrialHUD } from './components/trial-hud/TrialHUD'
import { TrialLoadingScreen } from './components/TrialLoadingScreen'
import './Trial.css'
import { FlyCamera } from './components/FlyCamera'

function SceneReadyNotifier({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    // Wait for the next few frames to ensure the GPU has started compiling and rendering
    let frame1: number, frame2: number;
    frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        onReady()
      })
    })
    return () => {
      cancelAnimationFrame(frame1)
      cancelAnimationFrame(frame2)
    }
  }, [onReady])
  return null
}

export default function Trial() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isTabletOpen, setIsTabletOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [sceneReady, setSceneReady] = useState(false)

  return (
    <div className="trial-shell">
      {isLoading && <TrialLoadingScreen sceneReady={sceneReady} onLoaded={() => setIsLoading(false)} />}

      {!isLoading && <div className="trial-crosshair" />}

      <Canvas
        gl={{ antialias: false }}
        camera={{ position: [0, 1.468, -2.42], fov: 90 }}
        frameloop="always"
      >
        <ambientLight intensity={1.5} />
        <directionalLight
          position={[-10, 10, -5]}
          intensity={18.5}
          color={[1, 0.4, 0.3]}
        >
          {/* In Three.js, DirectionalLight rotation does nothing. It always points from its 'position' to its 'target'. */}
          {/* Move the position above, or move this target to change the angle of the light! */}
          <object3D attach="target" position={[0, 0, 0]} />
        </directionalLight>

        <pointLight
          position={[0, 5, 5]}
          intensity={200.5}
          color={[1, 0.4, 0.3]}
        />

        <Suspense fallback={null}>
          <SceneReadyNotifier onReady={() => setSceneReady(true)} />
          <TrialScene />
          <CaseTablet
            deskPosition={[0.5, 1.15, -2.1]}
            deskRotation={[Math.PI / 2, Math.PI, 0]}
            onOpenChange={setIsTabletOpen}
          />
        </Suspense>

        <PointerLockControls makeDefault enabled={!isTabletOpen && !isLoading} />
        {/* <FlyCamera /> */}

        <EffectComposer>
          <Bloom luminanceThreshold={0.95} luminanceSmoothing={0.625} />
          <Noise opacity={0.03} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      </Canvas>

      {!isLoading && (
        <>
          <button
            type="button"
            className="trial-menu-trigger"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>

          {!isTabletOpen && <TrialHUD />}
        </>
      )}

      <TrialMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  )
}
