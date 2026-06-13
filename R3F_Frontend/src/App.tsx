import { Routes, Route } from 'react-router-dom'
import MainMenu from './pages/main-menu/MainMenu'
import Trial from './pages/trial/Trial'
import Login from './pages/auth/login/Login'
import Register from './pages/auth/register/Register'
import { AuthProvider } from './store/auth'
import { RequireAuth, RedirectIfAuthed } from './router/guards'
import { CaseGeneratorProvider } from './store/case-generator-store/caseGeneratorStore'

export default function App() {
  return (
    <AuthProvider>
      <CaseGeneratorProvider>
        <Routes>
          <Route element={<RedirectIfAuthed />}>
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route path="/" element={<MainMenu />} />
            <Route path="/trial" element={<Trial />} />
          </Route>
        </Routes>
      </CaseGeneratorProvider>
    </AuthProvider>
  )
}
