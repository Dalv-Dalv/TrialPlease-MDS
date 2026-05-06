import { AuthProvider } from './store/auth'
import { CaseGeneratorProvider } from './store/case-generator-store/caseGeneratorStore'
import Trial from './pages/trial/Trial'

export default function App() {
  return (
    <AuthProvider>
      <CaseGeneratorProvider>
        <Trial />
      </CaseGeneratorProvider>
    </AuthProvider>
  )
}
