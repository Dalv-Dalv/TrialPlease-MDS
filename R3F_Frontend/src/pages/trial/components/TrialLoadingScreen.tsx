import React, { useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'

interface Props {
  onLoaded: () => void
  sceneReady: boolean
}

export function TrialLoadingScreen({ onLoaded, sceneReady }: Props) {
  const { active, progress, item, loaded, total } = useProgress()
  const [visible, setVisible] = useState(true)
  const [fade, setFade] = useState(false)

  useEffect(() => {
    if (progress === 100 && !active && total > 0 && sceneReady) {
      // Small delay for smooth transition
      const t0 = setTimeout(() => setFade(true), 0)
      const t1 = setTimeout(() => {
        setVisible(false)
        onLoaded()
      }, 500)
      return () => { clearTimeout(t0); clearTimeout(t1); }
    }
  }, [progress, active, total, sceneReady, onLoaded])

  // Fallback if useProgress doesn't pick up anything immediately
  useEffect(() => {
    if (total === 0 && !active && loaded === 0 && sceneReady) {
      const t = setTimeout(() => {
        if (progress === 0 && !active && total === 0 && sceneReady) {
          setFade(true)
          setTimeout(() => {
            setVisible(false)
            onLoaded()
          }, 500)
        }
      }, 2000)
      return () => clearTimeout(t)
    }
  }, [total, active, progress, loaded, sceneReady, onLoaded])

  if (!visible) return null

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: '#0d1117',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      color: '#e8e4d8',
      fontFamily: '"Crimson Pro", Georgia, serif',
      opacity: fade ? 0 : 1,
      transition: 'opacity 0.5s ease-out',
      pointerEvents: 'all'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');
        
        @keyframes tls-spin { to { transform: rotate(360deg); } }
        .tls-spinner {
            width: 52px;
            height: 52px;
            border: 2px solid rgba(212,175,55,0.15);
            border-top-color: #d4af37;
            border-radius: 50%;
            animation: tls-spin 1s linear infinite;
            margin-bottom: 24px;
        }
        
        .tls-container {
            padding: 52px 85px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 18px;
            background: #111620;
            border-radius: 6px;
            border: 1px solid rgba(212,175,55,0.30);
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            max-width: 600px;
        }
      `}</style>

      <div className="tls-container">
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ width: '100%', height: '2px', background: 'rgba(212,175,55,0.30)' }} />
          <div style={{ width: '100%', height: '1px', background: 'rgba(212,175,55,0.15)' }} />
        </div>

        <span style={{ fontSize: '40px', color: '#d4af37', opacity: 0.7, lineHeight: 1 }}>⚖</span>
        <h1 style={{ margin: 0, fontSize: '38px', letterSpacing: '5px', fontWeight: '700', fontFamily: '"Cinzel", Georgia, serif', color: '#e8e4d8' }}>
          OFFICIAL CASE DOCKET
        </h1>
        <p style={{ margin: 0, fontSize: '13px', letterSpacing: '7px', color: '#d4af37', fontFamily: '"Cinzel", serif', opacity: 0.65, marginBottom: '4px' }}>
          INITIALIZING COURTROOM
        </p>

        <div className="tls-spinner" style={{ marginTop: '20px' }} />

        <p style={{ margin: 0, fontSize: '17px', letterSpacing: '4px', fontFamily: '"Cinzel", serif', color: '#e8e4d8', fontWeight: '600' }}>
          LOADING ASSETS
        </p>
        <p style={{ margin: 0, fontSize: '20px', color: '#7a7670', fontStyle: 'italic' }}>
          {Math.round(progress)}% — {loaded} / {total} files
        </p>
        <div style={{ minHeight: '20px' }}>
          {item && (
            <p style={{ margin: 0, fontSize: '14px', color: '#7a7670', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item}
            </p>
          )}
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column-reverse', gap: '4px', marginTop: '18px' }}>
          <div style={{ width: '100%', height: '2px', background: 'rgba(212,175,55,0.30)' }} />
          <div style={{ width: '100%', height: '1px', background: 'rgba(212,175,55,0.15)' }} />
        </div>
      </div>
    </div>
  )
}
