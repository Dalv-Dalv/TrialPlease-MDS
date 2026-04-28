import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, LogOut, Play, X } from 'lucide-react'
import { useAuth } from '../../../../store/authContext'
import './TrialMenu.css'

type Props = {
  open: boolean
  onClose: () => void
}

export function TrialMenu({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const navigate = useNavigate()
  const { logout } = useAuth()

  useEffect(() => {
    const dlg = dialogRef.current
    if (!dlg) return
    if (open && !dlg.open) dlg.showModal()
    if (!open && dlg.open) dlg.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="trial-menu"
      onClose={onClose}
      onCancel={onClose}
    >
      <div className="trial-menu-header">
        <h2 className="trial-menu-title">Menu</h2>
        <button
          type="button"
          className="trial-menu-close"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      <div className="trial-menu-actions">
        <button type="button" className="trial-menu-item" onClick={onClose}>
          <Play size={18} />
          Resume
        </button>
        <button type="button" className="trial-menu-item" onClick={() => navigate('/')}>
          <Home size={18} />
          Main menu
        </button>
        <button
          type="button"
          className="trial-menu-item trial-menu-item--danger"
          onClick={logout}
        >
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </dialog>
  )
}
