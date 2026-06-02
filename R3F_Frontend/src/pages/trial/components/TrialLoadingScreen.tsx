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
      setFade(true)
      const t1 = setTimeout(() => {
        setVisible(false)
        onLoaded()
      }, 500)
      return () => clearTimeout(t1)
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
      backgroundColor: '#0a0c10',
      backgroundImage: 'radial-gradient(circle at center, #1a202c 0%, #0a0c10 70%)',
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
        
        @keyframes tls-pulse { 
          0% { opacity: 0.6; transform: scale(0.98); } 
          50% { opacity: 1; transform: scale(1.02); filter: drop-shadow(0 0 20px rgba(212,175,55,0.4)); } 
          100% { opacity: 0.6; transform: scale(0.98); } 
        }
        
        .tls-scale {
            font-size: 72px;
            color: #d4af37;
            opacity: 0.8;
            line-height: 1;
            margin-bottom: 32px;
            animation: tls-pulse 3s ease-in-out infinite;
            filter: drop-shadow(0 0 10px rgba(212,175,55,0.2));
        }

        .tls-progress-container {
            width: 350px;
            height: 4px;
            background: rgba(255,255,255,0.05);
            border-radius: 2px;
            overflow: hidden;
            margin-top: 48px;
            margin-bottom: 24px;
            position: relative;
        }

        .tls-progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #d4af37 0%, #f9e596 50%, #d4af37 100%);
            background-size: 200% 100%;
            box-shadow: 0 0 10px rgba(212,175,55,0.5);
            transition: width 0.3s ease-out;
            animation: tls-shimmer 2s linear infinite;
        }

        @keyframes tls-shimmer {
            0% { background-position: 100% 0; }
            100% { background-position: -100% 0; }
        }

        .tls-title {
            margin: 0; 
            font-size: 28px; 
            letter-spacing: 8px; 
            font-weight: 600; 
            font-family: "Cinzel", Georgia, serif; 
            color: #e8e4d8;
        }

        .tls-subtitle {
            margin: 0; 
            margin-top: 12px;
            font-size: 14px; 
            letter-spacing: 5px; 
            color: rgba(212,175,55,0.7); 
            font-family: "Cinzel", serif;
        }
      `}</style>

      <div className="tls-scale">⚖</div>

      <h1 className="tls-title">TRIAL PREPARATION</h1>
      <p className="tls-subtitle">INITIALIZING COURTROOM</p>

      <div className="tls-progress-container">
        <div className="tls-progress-bar" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
          <p style={{ margin: 0, fontSize: '18px', letterSpacing: '3px', fontFamily: '"Cinzel", serif', color: '#e8e4d8', fontWeight: 600 }}>
            LOADING ASSETS
          </p>
          <p style={{ margin: 0, fontSize: '18px', color: '#d4af37', fontStyle: 'italic', fontFamily: '"Crimson Pro", serif' }}>
            {Math.round(progress)}%
          </p>
        </div>
        <div style={{ height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {item && (
            <p style={{ margin: 0, fontSize: '13px', color: 'rgba(232, 228, 216, 0.4)', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>
              {item.replace(/^.*[\\\\\\/]/, '')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
