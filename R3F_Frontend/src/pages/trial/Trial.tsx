import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Menu } from 'lucide-react'
import { TrialScene } from './scene/TrialScene'
import { TrialMenu } from './components/trial-menu/TrialMenu'
import './Trial.css'

export default function Trial() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="trial-shell">
      <Canvas camera={{ position: [3, 2, 5], fov: 50 }} dpr={[1, 2]}>
        <TrialScene />
      </Canvas>

      <button
        type="button"
        className="trial-menu-trigger"
        onClick={() => setMenuOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      <TrialMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  )
}
