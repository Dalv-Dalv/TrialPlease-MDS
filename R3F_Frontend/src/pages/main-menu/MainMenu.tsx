import { useNavigate } from 'react-router-dom'
import { LogOut, Play } from 'lucide-react'
import { useAuth } from '../../store/authContext'
import './MainMenu.css'

export default function MainMenu() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="menu-shell">
      <button type="button" className="menu-logout" onClick={logout}>
        <LogOut size={16} />
        Log out
      </button>

      <button type="button" className="menu-play" onClick={() => navigate('/trial')}>
        <Play size={20} />
        Play
      </button>
    </div>
  )
}
