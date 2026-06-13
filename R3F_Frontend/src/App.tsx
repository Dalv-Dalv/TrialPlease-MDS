import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './store/auth'
import { CaseGeneratorProvider } from './store/case-generator-store/caseGeneratorStore'
import { RequireAuth, RedirectIfAuthed } from './router/guards'

// Lazy-load pages so the heavy 3-D bundle doesn't block the auth screens
const Login    = lazy(() => import('./pages/auth/login/Login'))
const Register = lazy(() => import('./pages/auth/register/Register'))
const MainMenu = lazy(() => import('./pages/main-menu/MainMenu'))
const Trial    = lazy(() => import('./pages/trial/Trial'))

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ── Public auth routes (redirect away if already logged in) ── */}
        <Route element={<RedirectIfAuthed />}>
          <Route path="/auth/login"    element={<Suspense fallback={null}><Login /></Suspense>} />
          <Route path="/auth/register" element={<Suspense fallback={null}><Register /></Suspense>} />
        </Route>

        {/* ── Protected app routes ─────────────────────────────────── */}
        <Route element={<RequireAuth />}>
          <Route
            path="/"
            element={<Suspense fallback={null}><MainMenu /></Suspense>}
          />
          <Route
            path="/trial"
            element={
              <CaseGeneratorProvider>
                <Suspense fallback={null}><Trial /></Suspense>
              </CaseGeneratorProvider>
            }
          />
        </Route>

        {/* ── Catch-all ────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
