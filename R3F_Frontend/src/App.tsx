import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './store/auth'
import { CaseGeneratorProvider } from './store/case-generator-store/caseGeneratorStore'
import Trial from './pages/trial/Trial'
import Login from './pages/auth/login/Login'
import Register from './pages/auth/register/Register'
import Profile from './pages/main-menu/Profile.tsx'
import { RequireAuth, RedirectIfAuthed } from './router/guards'

export default function App() {
  return (
    <AuthProvider>
      <CaseGeneratorProvider>
        <Routes>
          <Route path="/" element={<Trial />} />
          
          <Route element={<RedirectIfAuthed />}>
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Routes>
      </CaseGeneratorProvider>
    </AuthProvider>
  )
}
